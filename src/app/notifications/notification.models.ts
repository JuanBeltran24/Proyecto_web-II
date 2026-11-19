/**
 * Modelos para el sistema de notificaciones
 */

export type NotificationType = 
  | 'request_new'        // Nueva solicitud recibida (→ profesional)
  | 'request_accepted'   // Solicitud aceptada (→ usuario)
  | 'request_rejected'   // Solicitud rechazada (→ usuario)
  | 'request_rescheduled' // Nuevo horario propuesto (→ usuario)
  | 'request_finished'   // Servicio finalizado (→ usuario)
  | 'message_new';       // Nuevo mensaje de chat (→ ambos)

export type RecipientType = 'user' | 'professional';

export interface AppNotification {
  id: string;
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  conversationId: string;
  count?: number; // Para colapsar mensajes múltiples
  createdAt: Date;
  read: boolean;
}

export interface NotificationPrefs {
  toasts: boolean;      // Mostrar avisos emergentes
  sound: boolean;       // Reproducir sonido
  browser: boolean;     // Notificaciones del navegador
}

export const DEFAULT_PREFS: NotificationPrefs = {
  toasts: true,
  sound: true,
  browser: false
};
