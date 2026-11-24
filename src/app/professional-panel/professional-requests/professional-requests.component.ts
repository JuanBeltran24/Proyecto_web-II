import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ProfessionalSessionService } from '../professional-session.service';
import { ChatStore, toProfessionalKey } from '../../components/professional-chat/chat-store.service';
import { Conversation, ChatMessage, REQUEST_STATUS_CONFIG, RequestStatus } from '../../components/professional-chat/chat.models';
import { NotificationService } from '../../notifications/notification.service';

interface ViewModel {
  conversations: Conversation[];
  selected: Conversation | null;
  freeChatMessages: ChatMessage[];
}

@Component({
  selector: 'app-professional-requests',
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-requests.component.html',
  styleUrl: './professional-requests.component.css'
})
export class ProfessionalRequestsComponent implements OnInit, OnDestroy, AfterViewInit {
  private sessionService = inject(ProfessionalSessionService);
  private chatStore = inject(ChatStore);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  private selectedIdSubject = new BehaviorSubject<string | null>(null);
  private previousMessageCount = 0;

  vm$!: Observable<ViewModel>;
  
  // Para enviar mensajes
  newMessage = '';

  REQUEST_STATUS_CONFIG = REQUEST_STATUS_CONFIG;

  ngOnInit() {
    const session = this.sessionService.current;
    if (!session) return;

    const key = toProfessionalKey(session.name);
    const conversations$ = this.chatStore.conversationsForProfessional$(key);

    // Combinar conversaciones con el ID seleccionado para derivar el ViewModel
    this.vm$ = combineLatest([
      conversations$,
      this.selectedIdSubject
    ]).pipe(
      map(([conversations, selectedId]) => {
        const selected = selectedId 
          ? conversations.find(c => c.id === selectedId) || null
          : null;
        
        const freeChatMessages = selected 
          ? selected.messages.filter(m => !m.guided && m.type === 'text')
          : [];

        return {
          conversations,
          selected,
          freeChatMessages
        };
      }),
      tap(vm => {
        // Marcar como leídos cuando hay conversación seleccionada y tiene mensajes no leídos
        if (vm.selected && vm.selected.unreadForPro > 0) {
          Promise.resolve().then(() => {
            this.chatStore.markRead(vm.selected!.id, 'professional');
          });
        }

        // Scroll automático cuando cambia la cantidad de mensajes
        if (vm.selected) {
          const currentCount = vm.freeChatMessages.length;
          if (currentCount !== this.previousMessageCount) {
            this.previousMessageCount = currentCount;
            Promise.resolve().then(() => this.scrollToBottomIfNearEnd());
          }
        }
      })
    );

    // Verificar si hay parámetro de conversación en la URL (desde notificación)
    this.route.queryParams.subscribe(params => {
      const conversationId = params['c'];
      if (conversationId) {
        this.selectConversationById(conversationId);
      }
    });
  }

  ngAfterViewInit(): void {
    // Scroll inicial cuando se selecciona por primera vez
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Limpiar conversación activa al salir de la pantalla
    this.notificationService.setActiveConversation(null);
  }

  selectConversationById(id: string) {
    this.selectedIdSubject.next(id);
    this.notificationService.setActiveConversation(id);
    this.previousMessageCount = 0; // Reset para forzar scroll en la primera carga
  }

  selectConversation(conv: Conversation) {
    this.selectConversationById(conv.id);
  }

  backToList() {
    this.selectedIdSubject.next(null);
    this.notificationService.setActiveConversation(null);
    this.previousMessageCount = 0;
  }

  sendMessage() {
    const selectedId = this.selectedIdSubject.value;
    if (!selectedId || !this.newMessage.trim()) return;

    this.chatStore.addMessage(selectedId, {
      sender: 'professional',
      type: 'text',
      text: this.newMessage.trim(),
      guided: false
    });

    this.newMessage = '';
  }

  acceptRequest() {
    const selectedId = this.selectedIdSubject.value;
    if (!selectedId) return;

    this.chatStore.updateRequest(selectedId, {
      status: 'accepted'
    });

    // Enviar mensaje automático
    this.chatStore.addMessage(selectedId, {
      sender: 'professional',
      type: 'text',
      text: '¡Solicitud aceptada! Estaré allí en la fecha y hora acordadas.',
      guided: false
    });
  }

  rejectRequest() {
    const selectedId = this.selectedIdSubject.value;
    if (!selectedId) return;

    this.chatStore.updateRequest(selectedId, {
      status: 'rejected'
    });

    this.chatStore.addMessage(selectedId, {
      sender: 'professional',
      type: 'text',
      text: 'Lo siento, no puedo atender esta solicitud en este momento.',
      guided: false
    });
  }

  proposeTime() {
    const selectedId = this.selectedIdSubject.value;
    if (!selectedId) return;

    this.chatStore.updateRequest(selectedId, {
      status: 'rescheduled'
    });

    this.chatStore.addMessage(selectedId, {
      sender: 'professional',
      type: 'text',
      text: 'Te propongo otra fecha/hora. ¿Te funciona?',
      guided: false
    });
  }

  finishRequest() {
    const selectedId = this.selectedIdSubject.value;
    if (!selectedId) return;

    this.chatStore.updateRequest(selectedId, {
      status: 'finished'
    });

    this.chatStore.addMessage(selectedId, {
      sender: 'professional',
      type: 'text',
      text: '¡Servicio finalizado! Gracias por confiar en mí.',
      guided: false
    });
  }

  private scrollToBottomIfNearEnd(): void {
    if (!this.messagesContainer) return;
    
    const container = this.messagesContainer.nativeElement;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Solo hacer scroll si el usuario estaba cerca del final (menos de 80px del final)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom < 80) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    if (!this.messagesContainer) return;
    
    Promise.resolve().then(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  getStatusConfig(status: RequestStatus) {
    return REQUEST_STATUS_CONFIG[status];
  }
}
