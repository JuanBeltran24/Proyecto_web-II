import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, map } from 'rxjs';
import { NotificationStore } from './notification-store.service';
import { AppNotification, NotificationPrefs, RecipientType, DEFAULT_PREFS } from './notification.models';
import { ChatLauncherService } from './chat-launcher.service';
import { ProfessionalSessionService } from '../professional-panel/professional-session.service';

const PROFESSIONAL_BASE = '/profesional';
const BROWSER_PERMISSION_KEY = 'ahc_browser_notification_permission';
const LAST_NOTIFICATION_KEY = 'ahc_last_notification_time';
const ANTI_DUPLICATE_WINDOW_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private store = inject(NotificationStore);
  private router = inject(Router);
  private proSession = inject(ProfessionalSessionService);
  private chatLauncher = inject(ChatLauncherService);
  private zone = inject(NgZone);

  private activeConversationId: string | null = null;
  private audioContext: AudioContext | null = null;
  private prefs: NotificationPrefs = { ...DEFAULT_PREFS };

  constructor() {
    this.loadPreferences();
    this.setupVisibilityListener();
    this.setupNewNotificationListener();
  }

  // ============== AUDIENCIA ==============

  /**
   * Detecta el tipo de destinatario actual basándose en la URL y la sesión.
   * Retorna { type, id } o null si no hay audiencia.
   */
  private getCurrentRecipient(): { type: RecipientType; id: string } | null {
    const url = this.router.url;
    if (url.startsWith(PROFESSIONAL_BASE)) {
      const session = this.proSession.current;
      return session ? { type: 'professional', id: session.key } : null;
    }
    // Usuario anónimo/cliente - usar clientId del localStorage
    const clientData = this.getClientId();
    return clientData ? { type: 'user', id: clientData } : null;
  }

  /**
   * Obtiene el ID del cliente desde localStorage (usado por ChatStore)
   */
  private getClientId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem('ahc_client_v1');
      if (stored) {
        const client = JSON.parse(stored);
        return client.id;
      }
    } catch (e) {
      console.warn('Error leyendo cliente:', e);
    }
    return null;
  }

  // ============== CONVERSACIÓN ACTIVA ==============

  /**
   * Informa al servicio cuál conversación está activa actualmente.
   * Si conversationId es null, ninguna conversación está activa.
   */
  setActiveConversation(conversationId: string | null): void {
    this.activeConversationId = conversationId;
  }

  /**
   * Verifica si una conversación está activa y la pestaña es visible.
   */
  private isConversationActive(conversationId: string): boolean {
    return (
      this.activeConversationId === conversationId &&
      !document.hidden
    );
  }

  // ============== ANTI-DUPLICADO ==============

  /**
   * Verifica si se creó recientemente una notificación request_* para esta conversación.
   * Retorna true si se debe omitir la notificación message_new.
   */
  shouldSkipMessageNotification(conversationId: string): boolean {
    const key = `${LAST_NOTIFICATION_KEY}_${conversationId}`;
    const lastTime = localStorage.getItem(key);
    if (!lastTime) return false;

    const elapsed = Date.now() - parseInt(lastTime, 10);
    return elapsed < ANTI_DUPLICATE_WINDOW_MS;
  }

  /**
   * Registra que se acaba de crear una notificación request_* para esta conversación.
   */
  markRequestNotificationCreated(conversationId: string): void {
    const key = `${LAST_NOTIFICATION_KEY}_${conversationId}`;
    localStorage.setItem(key, Date.now().toString());
  }

  // ============== PREFERENCIAS ==============

  private PREFS_KEY = 'ahc_notification_prefs_v1';

  private loadPreferences(): void {
    const recipient = this.getCurrentRecipient();
    if (!recipient) {
      this.prefs = { ...DEFAULT_PREFS };
      return;
    }

    // Cargar desde localStorage
    const key = `${this.PREFS_KEY}_${recipient.type}_${recipient.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        this.prefs = JSON.parse(stored);
      } else {
        this.prefs = { ...DEFAULT_PREFS };
      }
    } catch (e) {
      console.warn('Error cargando preferencias:', e);
      this.prefs = { ...DEFAULT_PREFS };
    }
  }

  getPreferences(): NotificationPrefs {
    return { ...this.prefs };
  }

  updatePreferences(prefs: Partial<NotificationPrefs>): void {
    this.prefs = { ...this.prefs, ...prefs };
    const recipient = this.getCurrentRecipient();
    if (recipient) {
      const key = `${this.PREFS_KEY}_${recipient.type}_${recipient.id}`;
      try {
        localStorage.setItem(key, JSON.stringify(this.prefs));
      } catch (e) {
        console.warn('Error guardando preferencias:', e);
      }
    }
  }

  // ============== NOTIFICACIONES DEL NAVEGADOR ==============

  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones.');
      return false;
    }

    if (Notification.permission === 'granted') {
      localStorage.setItem(BROWSER_PERMISSION_KEY, 'granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      localStorage.setItem(BROWSER_PERMISSION_KEY, 'denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    localStorage.setItem(BROWSER_PERMISSION_KEY, permission);
    return permission === 'granted';
  }

  getBrowserPermissionStatus(): NotificationPermission | null {
    if (!('Notification' in window)) return null;
    return Notification.permission;
  }

  private showBrowserNotification(notification: AppNotification): void {
    if (!this.prefs.browser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!document.hidden) return; // Solo mostrar si pestaña está oculta

    const options: NotificationOptions = {
      body: notification.body,
      icon: '/img/logo.png',
      tag: notification.conversationId, // Evita amontonamiento
      requireInteraction: false,
    };

    const browserNotif = new Notification(notification.title, options);

    browserNotif.onclick = () => {
      window.focus();
      this.zone.run(() => {
        this.open(notification);
      });
      browserNotif.close();
    };
  }

  // ============== SONIDO ==============

  private playNotificationSound(): void {
    if (!this.prefs.sound) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Dos tonos cortos
      [0, 0.15].forEach((offset, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = i === 0 ? 800 : 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, now + offset);
        gainNode.gain.linearRampToValueAtTime(0.3, now + offset + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + offset + 0.1);

        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.1);
      });
    } catch (error) {
      console.warn('Error al reproducir sonido de notificación:', error);
    }
  }

  // ============== TÍTULO DE PESTAÑA ==============

  private originalTitle = document.title;

  private setupNewNotificationListener(): void {
    const recipient = this.getCurrentRecipient();
    if (!recipient) return;

    this.store.unreadCount$(recipient.type, recipient.id).subscribe(count => {
      this.updatePageTitle(count);
    });
  }

  private updatePageTitle(unreadCount: number): void {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${this.originalTitle}`;
    } else {
      document.title = this.originalTitle;
    }
  }

  // ============== VISIBILIDAD ==============

  private setupVisibilityListener(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        // Al volver a la pestaña, actualizar preferencias por si cambiaron en otra pestaña
        this.loadPreferences();
      }
    });
  }

  // ============== CREAR NOTIFICACIÓN ==============

  /**
   * Crea una notificación si el destinatario coincide con la audiencia actual.
   * Aplica reglas de conversación activa, toasts, sonido, notificaciones del navegador.
   */
  createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const recipient = this.getCurrentRecipient();
    if (!recipient || recipient.type !== notification.recipientType || recipient.id !== notification.recipientId) {
      // Esta notificación no es para la audiencia actual
      return;
    }

    const isActive = this.isConversationActive(notification.conversationId);

    // Si la conversación está activa y visible, aplicar reglas especiales
    let shouldShowToast = this.prefs.toasts;
    let shouldPlaySound = this.prefs.sound;

    if (isActive) {
      if (notification.type === 'message_new') {
        // No crear notificación message_new si conversación activa
        return;
      }
      // Notificaciones de cambio de estado se crean como leídas, sin toast ni sonido
      shouldShowToast = false;
      shouldPlaySound = false;
    }

    // Crear la notificación en el store
    this.store.push({
      ...notification,
    });

    // Si conversación está activa, marcar inmediatamente como leída después de un microtask
    if (isActive) {
      // Usar setTimeout 0 para esperar a que el store procese el push
      setTimeout(() => {
        // La última notificación es la que acabamos de crear
        this.store.notifications$.pipe(
          map(notifications => notifications.find(n => 
            n.conversationId === notification.conversationId &&
            n.recipientType === notification.recipientType &&
            n.recipientId === notification.recipientId &&
            !n.read
          ))
        ).subscribe(notif => {
          if (notif) {
            this.store.markAsRead(notif.id);
          }
        }).unsubscribe();
      }, 0);
    }

    // Toast
    if (shouldShowToast) {
      // El toast se mostrará automáticamente por el componente notification-toasts
    }

    // Sonido
    if (shouldPlaySound) {
      this.playNotificationSound();
    }

    // Notificación del navegador
    if (!isActive) {
      const fullNotif: AppNotification = {
        ...notification,
        id: '', // No importa aquí
        createdAt: new Date(),
        read: false
      };
      this.showBrowserNotification(fullNotif);
    }
  }

  // ============== ABRIR NOTIFICACIÓN ==============

  /**
   * Marca la notificación como leída y navega a la ubicación correspondiente.
   */
  open(notification: AppNotification): void {
    this.store.markAsRead(notification.id);

    const recipient = this.getCurrentRecipient();
    if (!recipient) return;

    if (recipient.type === 'professional') {
      // Navegar a /profesional/solicitudes?c=conversationId
      this.router.navigate(['/profesional/solicitudes'], {
        queryParams: { c: notification.conversationId },
      });
    } else {
      // Usuario: abrir chat con ChatLauncherService
      this.chatLauncher.openChat(notification.conversationId);
    }
  }

  // ============== FORMATO DE TIEMPO ==============

  /**
   * Formatea tiempo relativo: "ahora", "hace 5 min", "hace 2 h", "ayer", "dd/MM"
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHour < 24) return `hace ${diffHour} h`;
    if (diffDay === 1) return 'ayer';

    // dd/MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }

  // ============== UTILIDADES ==============

  /**
   * Observable de notificaciones para el destinatario actual.
   */
  get notifications$() {
    const recipient = this.getCurrentRecipient();
    if (!recipient) {
      return this.store.forRecipient$('user', '').pipe(map(() => []));
    }
    return this.store.forRecipient$(recipient.type, recipient.id);
  }

  /**
   * Observable de conteo de no leídas para el destinatario actual.
   */
  get unreadCount$() {
    const recipient = this.getCurrentRecipient();
    if (!recipient) {
      return this.store.unreadCount$('user', '').pipe(map(() => 0));
    }
    return this.store.unreadCount$(recipient.type, recipient.id);
  }

  markAllAsRead(): void {
    const recipient = this.getCurrentRecipient();
    if (recipient) {
      this.store.markAllAsRead(recipient.type, recipient.id);
    }
  }

  remove(id: string): void {
    this.store.remove(id);
  }

  clearAll(): void {
    const recipient = this.getCurrentRecipient();
    if (recipient) {
      this.store.clearAll(recipient.type, recipient.id);
    }
  }
}
