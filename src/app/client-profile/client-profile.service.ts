/**
 * BACKEND: Cuando exista el backend se reemplaza este archivo manteniendo 
 * los métodos públicos (HTTP); nada más cambia.
 * 
 * MEJORAS FUTURAS (fuera de alcance):
 * - Registro e inicio de sesión reales de clientes, contraseña y verificación de correo
 * - Cancelar una solicitud desde el lado del cliente (requiere nuevo estado y cambios en panel profesional)
 * - Favoritos, métodos de pago y subida de la foto a un servidor
 * - Compartir el teléfono con el profesional después de aceptar la solicitud
 * - Sincronización entre dispositivos (requiere backend)
 */

import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { ClientProfile, isGuestName } from './client-profile.models';
import { ChatStore } from '../components/professional-chat/chat-store.service';

const PROFILE_STORE_KEY = 'ahc_client_profile_v1';
const MAX_PHOTO_SIZE_MB = 5;
const PHOTO_SIZE_PX = 256;
const PHOTO_QUALITY = 0.8;

interface StoreData {
  profile: ClientProfile;
}

@Injectable({
  providedIn: 'root'
})
export class ClientProfileService {
  private ngZone = inject(NgZone);
  private chatStore = inject(ChatStore);
  
  private profileSubject = new BehaviorSubject<ClientProfile | null>(null);
  
  profile$: Observable<ClientProfile | null> = this.profileSubject.asObservable();

  constructor() {
    this.load();
    this.listenToStorageChanges();
  }

  /**
   * Obtiene el perfil actual (snapshot)
   */
  get snapshot(): ClientProfile | null {
    return this.profileSubject.value;
  }

  /**
   * Verifica si el cliente tiene un nombre real (no es invitado)
   */
  get hasName(): boolean {
    const profile = this.profileSubject.value;
    if (!profile || !profile.name || profile.name.trim().length === 0) {
      return false;
    }
    return !isGuestName(profile.name);
  }

  /**
   * BACKEND: Se reemplaza por PATCH /profile
   * 
   * Actualiza datos básicos del perfil
   */
  updateProfile(patch: Partial<Pick<ClientProfile, 'name' | 'phone' | 'email' | 'photo' | 'address'>>): void {
    const client = this.chatStore.getClient();
    
    this.mutate(data => {
      data.profile = {
        ...data.profile,
        ...patch,
        updatedAt: new Date()
      };

      // Si cambió el nombre, actualizar en las conversaciones
      if (patch.name && patch.name !== data.profile.name) {
        this.chatStore.updateClientName(client.id, patch.name);
      }
    });
  }

  /**
   * BACKEND: Se reemplaza por DELETE /profile
   * 
   * Limpia el perfil (NO borra conversaciones ni reseñas)
   */
  clearProfile(): void {
    const client = this.chatStore.getClient();
    
    this.mutate(data => {
      data.profile = this.createEmptyProfile(client.id);
    });
  }

  /**
   * BACKEND: La foto se subiría a un servidor y se devolvería una URL
   * 
   * Procesa y guarda una foto desde un File
   */
  async uploadPhoto(file: File): Promise<{ success: boolean; error?: string }> {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'El archivo debe ser una imagen' };
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_PHOTO_SIZE_MB) {
      return { success: false, error: `La imagen no debe superar ${MAX_PHOTO_SIZE_MB} MB` };
    }

    try {
      const dataUrl = await this.resizeImage(file);
      this.updateProfile({ photo: dataUrl });
      return { success: true };
    } catch (error) {
      console.error('Error procesando imagen:', error);
      return { success: false, error: 'Error al procesar la imagen' };
    }
  }

  /**
   * Redimensiona una imagen a 256×256 recortando al centro
   */
  private resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
        reject(new Error('FileReader no disponible'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (!e.target?.result) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const img = new Image();
        
        img.onload = () => {
          try {
            if (typeof document === 'undefined') {
              reject(new Error('Document no disponible'));
              return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = PHOTO_SIZE_PX;
            canvas.height = PHOTO_SIZE_PX;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('No se pudo crear contexto de canvas'));
              return;
            }

            // Calcular recorte al centro
            const size = Math.min(img.width, img.height);
            const x = (img.width - size) / 2;
            const y = (img.height - size) / 2;

            ctx.drawImage(
              img,
              x, y, size, size,
              0, 0, PHOTO_SIZE_PX, PHOTO_SIZE_PX
            );

            const dataUrl = canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('No se pudo crear blob'));
                  return;
                }
                const reader2 = new FileReader();
                reader2.onloadend = () => {
                  resolve(reader2.result as string);
                };
                reader2.onerror = () => reject(new Error('Error al leer blob'));
                reader2.readAsDataURL(blob);
              },
              'image/jpeg',
              PHOTO_QUALITY
            );
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target.result as string;
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  // ========== Métodos Privados ==========

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    
    const client = this.chatStore.getClient();
    
    try {
      const stored = localStorage.getItem(PROFILE_STORE_KEY);
      if (stored) {
        const data = JSON.parse(stored, this.reviver);
        
        // Verificar que el perfil pertenece al cliente actual
        if (data.profile.clientId === client.id) {
          this.profileSubject.next(data.profile);
          return;
        }
      }
    } catch (e) {
      console.warn('Error cargando perfil:', e);
    }

    // Crear perfil vacío
    const emptyProfile = this.createEmptyProfile(client.id);
    
    // Intentar obtener el nombre real
    let realName = '';
    
    // 1. Buscar primero en las conversaciones del chat
    try {
      const chatData = localStorage.getItem('ahc_chat_store_v1');
      if (chatData) {
        const chat = JSON.parse(chatData);
        
        // Debug: mostrar qué hay en el chat
        console.log('[Profile] Conversaciones totales:', chat.conversations?.length || 0);
        
        if (chat.conversations && Array.isArray(chat.conversations)) {
          // Buscar todas las conversaciones de este cliente
          const clientConvs = chat.conversations.filter((c: any) => c.clientId === client.id);
          console.log('[Profile] Conversaciones del cliente:', clientConvs.length);
          
          // Buscar una con nombre válido
          for (const conv of clientConvs) {
            console.log('[Profile] Revisando conversación:', {
              id: conv.id,
              clientName: conv.clientName,
              isGuest: conv.clientName ? isGuestName(conv.clientName) : 'no name'
            });
            
            if (conv.clientName && conv.clientName.trim().length > 0 && !isGuestName(conv.clientName)) {
              realName = conv.clientName;
              console.log('[Profile] ✓ Nombre encontrado en chat:', realName);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('[Profile] Error leyendo chat:', e);
    }
    
    // 2. Si no se encontró, intentar desde client.name
    if (!realName && client.name && !isGuestName(client.name)) {
      realName = client.name;
      console.log('[Profile] ✓ Nombre tomado del cliente:', realName);
    }
    
    // Asignar el nombre encontrado
    if (realName) {
      emptyProfile.name = realName;
      console.log('[Profile] Perfil creado con nombre:', realName);
    } else {
      console.log('[Profile] No se encontró nombre válido');
    }
    
    this.profileSubject.next(emptyProfile);
    this.save({ profile: emptyProfile });
  }

  private save(data: StoreData): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error guardando perfil:', e);
    }
  }

  private mutate(fn: (data: StoreData) => void): void {
    if (typeof localStorage === 'undefined') return;
    
    let data: StoreData | null = null;
    try {
      const stored = localStorage.getItem(PROFILE_STORE_KEY);
      if (stored) {
        data = JSON.parse(stored, this.reviver);
      }
    } catch (e) {
      console.warn('Error leyendo perfil antes de mutar:', e);
    }

    if (!data) {
      const client = this.chatStore.getClient();
      data = { profile: this.createEmptyProfile(client.id) };
    }

    fn(data);
    this.save(data);
    this.profileSubject.next(data.profile);
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

  private createEmptyProfile(clientId: string): ClientProfile {
    return {
      clientId,
      name: '',
      phone: '',
      email: '',
      photo: '',
      address: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private listenToStorageChanges(): void {
    // BACKEND: Este listener se reemplazará por WebSocket
    if (typeof window === 'undefined') return;
    
    fromEvent<StorageEvent>(window, 'storage')
      .subscribe(event => {
        if (event.key === PROFILE_STORE_KEY && event.newValue != null) {
          this.ngZone.run(() => {
            try {
              const data = JSON.parse(event.newValue!, this.reviver);
              const client = this.chatStore.getClient();
              
              // Solo actualizar si pertenece al cliente actual
              if (data.profile.clientId === client.id) {
                this.profileSubject.next(data.profile);
              }
            } catch (e) {
              console.warn('Error parseando storage event:', e);
            }
          });
        }
      });
  }
}
