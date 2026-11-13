/**
 * BACKEND: Cuando exista el backend se reemplaza este archivo manteniendo 
 * los métodos públicos (HTTP + WebSocket); nada más cambia.
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { Conversation, ChatMessage, ServiceRequest } from './chat.models';

const STORE_KEY = 'ahc_chat_store_v1';
const CLIENT_KEY = 'ahc_client_v1';

interface Client {
  id: string;
  name: string;
}

interface StoreData {
  conversations: Conversation[];
}

/**
 * Normaliza el nombre del profesional para usarlo como clave
 */
export function toProfessionalKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Colapsar espacios múltiples
}

@Injectable({
  providedIn: 'root'
})
export class ChatStore {
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  
  conversations$: Observable<Conversation[]> = this.conversationsSubject.asObservable();

  constructor() {
    this.load();
    this.listenToStorageChanges();
  }

  /**
   * Obtiene o crea el cliente invitado persistido
   */
  getClient(): Client {
    if (typeof localStorage === 'undefined') {
      // Fallback para entornos sin localStorage (SSR, tests)
      return {
        id: `client_temp_${Date.now()}`,
        name: `Cliente Temporal`
      };
    }
    
    try {
      const stored = localStorage.getItem(CLIENT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error leyendo cliente:', e);
    }

    // Crear nuevo cliente
    const client: Client = {
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Cliente ${Math.floor(Math.random() * 9000) + 1000}`
    };

    try {
      localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
    } catch (e) {
      console.warn('Error guardando cliente:', e);
    }

    return client;
  }

  /**
   * Busca una conversación por ID
   */
  find(id: string): Conversation | undefined {
    return this.conversationsSubject.value.find(c => c.id === id);
  }

  /**
   * Observable de conversaciones filtradas para un profesional
   * Solo muestra conversaciones con request y status distinto de 'draft'
   * Ordenadas por updatedAt desc
   */
  conversationsForProfessional$(professionalKey: string): Observable<Conversation[]> {
    return this.conversations$.pipe(
      map(conversations => 
        conversations
          .filter(c => 
            c.professionalKey === professionalKey && 
            c.request && 
            c.request.status !== 'draft'
          )
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      )
    );
  }

  /**
   * Asegura que existe una conversación
   * Si no existe, la crea
   */
  ensureConversation(params: {
    professionalName: string;
    professionalSpecialty: string;
  }): Conversation {
    const client = this.getClient();
    const professionalKey = toProfessionalKey(params.professionalName);
    const id = `${client.id}__${professionalKey}`;

    let conv = this.find(id);
    
    if (!conv) {
      conv = {
        id,
        professionalKey,
        professionalName: params.professionalName,
        professionalSpecialty: params.professionalSpecialty,
        clientId: client.id,
        clientName: client.name,
        messages: [],
        unreadForPro: 0,
        unreadForUser: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.mutate(data => {
        data.conversations.push(conv!);
      });
    }

    return conv;
  }

  /**
   * Agrega un mensaje a una conversación
   * Suma unreadForPro si sender='user' y unreadForUser si sender='professional'
   * Solo para mensajes de texto no guiados
   */
  addMessage(convId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv) return;

      const fullMessage: ChatMessage = {
        ...message,
        id: this.generateMessageId(),
        createdAt: new Date()
      };

      conv.messages.push(fullMessage);
      conv.updatedAt = new Date();

      // Sumar no leídos solo para mensajes de texto no guiados
      if (message.type === 'text' && !message.guided) {
        if (message.sender === 'user') {
          conv.unreadForPro++;
        } else if (message.sender === 'professional') {
          conv.unreadForUser++;
        }
      }
    });
  }

  /**
   * Elimina un mensaje por ID
   */
  removeMessage(convId: string, messageId: string): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv) return;

      conv.messages = conv.messages.filter(m => m.id !== messageId);
      conv.updatedAt = new Date();
    });
  }

  /**
   * Vacía todos los mensajes y request de una conversación
   * Para reiniciar el flujo cuando no se ha enviado
   */
  clearMessages(convId: string): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv) return;

      conv.messages = [];
      delete conv.request;
      conv.updatedAt = new Date();
    });
  }

  /**
   * Establece la solicitud de una conversación
   * Sincroniza las tarjetas request_card en los mensajes
   * Suma unreadForPro
   */
  setRequest(convId: string, request: ServiceRequest): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv) return;

      conv.request = request;
      conv.updatedAt = new Date();
      conv.unreadForPro++;

      // Sincronizar tarjetas en mensajes
      conv.messages.forEach(msg => {
        if (msg.type === 'request_card' && msg.card) {
          msg.card = { ...request };
        }
      });
    });
  }

  /**
   * Actualiza la solicitud de una conversación (el profesional cambia estado/datos)
   * Sincroniza las tarjetas request_card en los mensajes
   * Suma unreadForUser
   */
  updateRequest(convId: string, patch: Partial<ServiceRequest>): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv || !conv.request) return;

      conv.request = { ...conv.request, ...patch };
      conv.updatedAt = new Date();
      conv.unreadForUser++;

      // Sincronizar tarjetas en mensajes
      conv.messages.forEach(msg => {
        if (msg.type === 'request_card' && msg.card) {
          msg.card = { ...conv.request! };
        }
      });
    });
  }

  /**
   * Marca como leídos los mensajes para un rol
   */
  markRead(convId: string, role: 'user' | 'professional'): void {
    this.mutate(data => {
      const conv = data.conversations.find(c => c.id === convId);
      if (!conv) return;

      if (role === 'user') {
        conv.unreadForUser = 0;
      } else {
        conv.unreadForPro = 0;
      }
    });
  }

  // ========== Métodos Privados ==========

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const data = JSON.parse(stored, this.reviver);
        this.conversationsSubject.next(data.conversations || []);
      }
    } catch (e) {
      console.warn('Error cargando store:', e);
    }
  }

  private save(data: StoreData): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error guardando store:', e);
    }
  }

  private mutate(fn: (data: StoreData) => void): void {
    if (typeof localStorage === 'undefined') return;
    
    // Leer lo último guardado
    let data: StoreData = { conversations: [] };
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
    this.conversationsSubject.next(data.conversations);
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

  private generateMessageId(): string {
    return `msg_${Date.now() * 1000 + Math.floor(Math.random() * 1000)}`;
  }

  private listenToStorageChanges(): void {
    // BACKEND: Este listener se reemplazará por WebSocket
    if (typeof window === 'undefined') return;
    
    fromEvent<StorageEvent>(window, 'storage')
      .subscribe(event => {
        if (event.key === STORE_KEY && event.newValue != null) {
          try {
            const data = JSON.parse(event.newValue!, this.reviver);
            this.conversationsSubject.next(data.conversations || []);
          } catch (e) {
            console.warn('Error parseando storage event:', e);
          }
        }
      });
  }
}
