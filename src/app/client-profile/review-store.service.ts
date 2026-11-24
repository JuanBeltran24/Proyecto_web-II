/**
 * BACKEND: Cuando exista el backend se reemplaza este archivo manteniendo 
 * los métodos públicos (HTTP); nada más cambia.
 */

import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClientReview } from './review.models';

const STORE_KEY = 'ahc_reviews_v1';

interface StoreData {
  reviews: ClientReview[];
}

@Injectable({
  providedIn: 'root'
})
export class ReviewStore {
  private ngZone = inject(NgZone);
  private reviewsSubject = new BehaviorSubject<ClientReview[]>([]);
  
  reviews$: Observable<ClientReview[]> = this.reviewsSubject.asObservable();

  constructor() {
    this.load();
    this.listenToStorageChanges();
  }

  /**
   * BACKEND: Se reemplaza por GET /reviews?professionalKey=:key
   * 
   * Observable de reseñas filtradas para un profesional
   */
  forProfessional$(professionalKey: string): Observable<ClientReview[]> {
    return this.reviews$.pipe(
      map(reviews => 
        reviews
          .filter(r => r.professionalKey === professionalKey)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      )
    );
  }

  /**
   * BACKEND: Se reemplaza por GET /reviews?conversationId=:id
   * 
   * Observable de reseña para una conversación específica
   */
  forConversation$(conversationId: string): Observable<ClientReview | null> {
    return this.reviews$.pipe(
      map(reviews => reviews.find(r => r.conversationId === conversationId) || null)
    );
  }

  /**
   * BACKEND: Se reemplaza por POST /reviews
   * 
   * Agrega una nueva reseña
   */
  add(review: Omit<ClientReview, 'id' | 'createdAt'>): void {
    this.mutate(data => {
      // Verificar que no exista ya una reseña para esta conversación
      const exists = data.reviews.some(r => r.conversationId === review.conversationId);
      if (exists) {
        console.warn('Ya existe una reseña para esta conversación');
        return;
      }

      const fullReview: ClientReview = {
        ...review,
        id: this.generateId(),
        createdAt: new Date()
      };

      data.reviews.push(fullReview);
    });
  }

  // ========== Métodos Privados ==========

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const data = JSON.parse(stored, this.reviver);
        this.reviewsSubject.next(data.reviews || []);
      }
    } catch (e) {
      console.warn('Error cargando reseñas:', e);
    }
  }

  private save(data: StoreData): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error guardando reseñas:', e);
    }
  }

  private mutate(fn: (data: StoreData) => void): void {
    if (typeof localStorage === 'undefined') return;
    
    let data: StoreData = { reviews: [] };
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        data = JSON.parse(stored, this.reviver);
      }
    } catch (e) {
      console.warn('Error leyendo store antes de mutar:', e);
    }

    fn(data);
    this.save(data);
    this.reviewsSubject.next(data.reviews);
  }

  private reviver = (key: string, value: any): any => {
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      if (dateRegex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  };

  private generateId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private listenToStorageChanges(): void {
    // BACKEND: Este listener se reemplazará por WebSocket
    if (typeof window === 'undefined') return;
    
    fromEvent<StorageEvent>(window, 'storage')
      .subscribe(event => {
        if (event.key === STORE_KEY && event.newValue != null) {
          this.ngZone.run(() => {
            try {
              const data = JSON.parse(event.newValue!, this.reviver);
              this.reviewsSubject.next(data.reviews || []);
            } catch (e) {
              console.warn('Error parseando storage event:', e);
            }
          });
        }
      });
  }
}
