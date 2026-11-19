/**
 * BACKEND: Cuando exista el backend se reemplaza este archivo manteniendo 
 * los métodos públicos (HTTP + WebSocket/push); nada más cambia.
 */

import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppNotification, RecipientType } from './notification.models';

const STORE_KEY = 'ahc_notifications_v1';
const MAX_NOTIFICATIONS_PER_RECIPIENT = 100;

interface StoreData {
  notifications: AppNotification[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationStore {
  private ngZone = inject(NgZone);
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  
  notifications$: Observable<AppNotification[]> = this.notificationsSubject.asObservable();

  constructor() {
    this.load();
    this.listenToStorageChanges();
  }

  /**
   * Obtiene notificaciones filtradas por destinatario (más recientes primero)
   */
  forRecipient$(type: RecipientType, id: string): Observable<AppNotification[]> {
    return this.notifications$.pipe(
      map(notifications => 
        notifications
          .filter(n => n.recipientType === type && n.recipientId === id)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      )
    );
  }

  /**
   * Cuenta notificaciones no leídas para un destinatario
   */
  unreadCount$(type: RecipientType, id: string): Observable<number> {
    return this.forRecipient$(type, id).pipe(
      map(notifications => notifications.filter(n => !n.read).length)
    );
  }

  /**
   * BACKEND: Se reemplaza por POST /notifications
   * 
   * Crea una notificación. Si ya existe una notificación message_new NO leída
   * para la misma conversación y destinatario, la actualiza en lugar de crear otra.
   */
  push(partial: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    this.mutate(data => {
      // Buscar notificación existente para colapsar mensajes
      if (partial.type === 'message_new') {
        const existing = data.notifications.find(n => 
          n.recipientType === partial.recipientType &&
          n.recipientId === partial.recipientId &&
          n.conversationId === partial.conversationId &&
          n.type === 'message_new' &&
          !n.read
        );

        if (existing) {
          // Actualizar la existente
          existing.count = (existing.count || 1) + 1;
          existing.body = partial.body;
          existing.createdAt = new Date();
          existing.title = `${existing.count} mensajes nuevos de ${this.extractName(partial.title)}`;
          return;
        }
      }

      // Crear nueva notificación
      const notification: AppNotification = {
        ...partial,
        id: this.generateId(),
        createdAt: new Date(),
        read: false
      };

      data.notifications.push(notification);

      // Limitar a MAX_NOTIFICATIONS_PER_RECIPIENT por destinatario
      const forRecipient = data.notifications.filter(n => 
        n.recipientType === partial.recipientType && 
        n.recipientId === partial.recipientId
      );

      if (forRecipient.length > MAX_NOTIFICATIONS_PER_RECIPIENT) {
        // Eliminar las más antiguas
        const toRemove = forRecipient
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, forRecipient.length - MAX_NOTIFICATIONS_PER_RECIPIENT);

        data.notifications = data.notifications.filter(n => 
          !toRemove.some(r => r.id === n.id)
        );
      }
    });
  }

  /**
   * BACKEND: Se reemplaza por PATCH /notifications/:id
   */
  markAsRead(id: string): void {
    this.mutate(data => {
      const notification = data.notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
      }
    });
  }

  /**
   * BACKEND: Se reemplaza por PATCH /notifications/mark-all-read
   */
  markAllAsRead(type: RecipientType, id: string): void {
    this.mutate(data => {
      data.notifications
        .filter(n => n.recipientType === type && n.recipientId === id)
        .forEach(n => n.read = true);
    });
  }

  /**
   * BACKEND: Se reemplaza por DELETE /notifications/:id
   */
  remove(id: string): void {
    this.mutate(data => {
      data.notifications = data.notifications.filter(n => n.id !== id);
    });
  }

  /**
   * BACKEND: Se reemplaza por DELETE /notifications/clear-all
   */
  clearAll(type: RecipientType, id: string): void {
    this.mutate(data => {
      data.notifications = data.notifications.filter(n => 
        !(n.recipientType === type && n.recipientId === id)
      );
    });
  }

  // ========== Métodos Privados ==========

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const data = JSON.parse(stored, this.reviver);
        this.notificationsSubject.next(data.notifications || []);
      }
    } catch (e) {
      console.warn('Error cargando notificaciones:', e);
    }
  }

  private save(data: StoreData): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error guardando notificaciones:', e);
    }
  }

  private mutate(fn: (data: StoreData) => void): void {
    if (typeof localStorage === 'undefined') return;
    
    // Leer lo último guardado
    let data: StoreData = { notifications: [] };
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        data = JSON.parse(stored, this.reviver);
      }
    } catch (e) {
      console.warn('Error leyendo store antes de mutar:', e);
    }

    // Aplicar cambio
    fn(data);

    // Guardar y emitir
    this.save(data);
    this.notificationsSubject.next(data.notifications);
  }

  private reviver = (key: string, value: any): any => {
    // Convertir strings ISO a Date
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      if (dateRegex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  };

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractName(title: string): string {
    // Extrae el nombre de títulos como "Nuevo mensaje de Juan Pérez"
    const match = title.match(/de (.+)$/);
    return match ? match[1] : 'profesional';
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
              this.notificationsSubject.next(data.notifications || []);
            } catch (e) {
              console.warn('Error parseando storage event:', e);
            }
          });
        }
      });
  }
}
