export type MessageSender = 'user' | 'professional' | 'bot';

export type MessageType = 'text' | 'request_card';

export type RequestStatus = 
  | 'draft' 
  | 'pending' 
  | 'accepted' 
  | 'rescheduled' 
  | 'rejected' 
  | 'finished';

export interface ServiceRequest {
  service: string;
  description: string;
  day: string; // Texto para mostrar: "Viernes 13 de noviembre"
  dayIso?: string; // Fecha real en formato yyyy-mm-dd
  time: string;
  address: string;
  status: RequestStatus;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  type: MessageType;
  text?: string;
  card?: ServiceRequest;
  createdAt: Date;
  guided?: boolean; // true = mensaje del flujo guiado (el profesional NO lo ve)
}

export type ChatStep = 
  | 'greeting'
  | 'name'
  | 'service'
  | 'problem'
  | 'day'
  | 'time'
  | 'address'
  | 'confirmation'
  | 'sent'
  | 'free_chat';

export type InputMode = 
  | 'hidden'
  | 'chips'
  | 'text'
  | 'date'
  | 'time';

export interface QuickOption {
  label: string;
  value: string;
}

export interface ChatUiState {
  step: ChatStep;
  options: QuickOption[];
  inputMode: InputMode;
  placeholder: string;
  isTyping: boolean;
}

export interface Conversation {
  id: string;
  professionalKey: string;
  professionalName: string;
  professionalSpecialty: string;
  clientId: string;
  clientName: string;
  messages: ChatMessage[];
  request?: ServiceRequest;
  unreadForPro: number;
  unreadForUser: number;
  createdAt: Date;
  updatedAt: Date;
}

export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Borrador', color: '#666666', bgColor: '#f5f5f5' },
  pending: { label: 'Esperando respuesta', color: '#f59e0b', bgColor: '#fef3c7' },
  accepted: { label: 'Aceptada', color: '#22c55e', bgColor: '#d1fae5' },
  rescheduled: { label: 'Reprogramada', color: '#3b82f6', bgColor: '#dbeafe' },
  rejected: { label: 'Rechazada', color: '#ef4444', bgColor: '#fee2e2' },
  finished: { label: 'Finalizada', color: '#6b7280', bgColor: '#f3f4f6' }
};
