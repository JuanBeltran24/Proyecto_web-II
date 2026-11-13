import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ProfessionalSessionService } from '../professional-session.service';
import { ChatStore, toProfessionalKey } from '../../components/professional-chat/chat-store.service';
import { Conversation, ChatMessage, REQUEST_STATUS_CONFIG, RequestStatus } from '../../components/professional-chat/chat.models';

@Component({
  selector: 'app-professional-requests',
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-requests.component.html',
  styleUrl: './professional-requests.component.css'
})
export class ProfessionalRequestsComponent implements OnInit {
  private sessionService = inject(ProfessionalSessionService);
  private chatStore = inject(ChatStore);

  conversations$!: Observable<Conversation[]>;
  selectedConversation: Conversation | null = null;
  
  // Mensajes de chat libres (excluye guided: true)
  freeChatMessages: ChatMessage[] = [];

  // Para enviar mensajes
  newMessage = '';

  REQUEST_STATUS_CONFIG = REQUEST_STATUS_CONFIG;

  ngOnInit() {
    const session = this.sessionService.current;
    if (session) {
      const key = toProfessionalKey(session.name);
      this.conversations$ = this.chatStore.conversationsForProfessional$(key);
    }
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    
    // Filtrar solo mensajes de chat libre (excluye guided)
    this.freeChatMessages = conv.messages.filter(m => !m.guided);
    
    // Marcar como leídos
    this.chatStore.markRead(conv.id, 'professional');
  }

  sendMessage() {
    if (!this.selectedConversation || !this.newMessage.trim()) return;

    this.chatStore.addMessage(this.selectedConversation.id, {
      sender: 'professional',
      type: 'text',
      text: this.newMessage.trim(),
      guided: false
    });

    this.newMessage = '';
    
    // Actualizar la vista de mensajes
    const updated = this.chatStore.find(this.selectedConversation.id);
    if (updated) {
      this.freeChatMessages = updated.messages.filter(m => !m.guided);
    }
  }

  acceptRequest() {
    if (!this.selectedConversation?.request) return;

    this.chatStore.updateRequest(this.selectedConversation.id, {
      status: 'accepted'
    });

    // Enviar mensaje automático
    this.chatStore.addMessage(this.selectedConversation.id, {
      sender: 'professional',
      type: 'text',
      text: '¡Solicitud aceptada! Estaré allí en la fecha y hora acordadas.',
      guided: false
    });

    // Actualizar vista
    this.refreshSelectedConversation();
  }

  rejectRequest() {
    if (!this.selectedConversation?.request) return;

    this.chatStore.updateRequest(this.selectedConversation.id, {
      status: 'rejected'
    });

    this.chatStore.addMessage(this.selectedConversation.id, {
      sender: 'professional',
      type: 'text',
      text: 'Lo siento, no puedo atender esta solicitud en este momento.',
      guided: false
    });

    this.refreshSelectedConversation();
  }

  proposeTime() {
    if (!this.selectedConversation?.request) return;

    this.chatStore.updateRequest(this.selectedConversation.id, {
      status: 'rescheduled'
    });

    this.chatStore.addMessage(this.selectedConversation.id, {
      sender: 'professional',
      type: 'text',
      text: 'Te propongo otra fecha/hora. ¿Te funciona?',
      guided: false
    });

    this.refreshSelectedConversation();
  }

  finishRequest() {
    if (!this.selectedConversation?.request) return;

    this.chatStore.updateRequest(this.selectedConversation.id, {
      status: 'finished'
    });

    this.chatStore.addMessage(this.selectedConversation.id, {
      sender: 'professional',
      type: 'text',
      text: '¡Servicio finalizado! Gracias por confiar en mí.',
      guided: false
    });

    this.refreshSelectedConversation();
  }

  private refreshSelectedConversation() {
    if (!this.selectedConversation) return;
    
    const updated = this.chatStore.find(this.selectedConversation.id);
    if (updated) {
      this.selectedConversation = updated;
      this.freeChatMessages = updated.messages.filter(m => !m.guided);
    }
  }

  getStatusConfig(status: RequestStatus) {
    return REQUEST_STATUS_CONFIG[status];
  }
}
