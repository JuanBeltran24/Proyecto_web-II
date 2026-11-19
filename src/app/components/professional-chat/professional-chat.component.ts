import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges, 
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Professional } from '../professional-card/professional-card.component';
import { ChatService } from './chat.service';
import { 
  ChatMessage, 
  ChatUiState, 
  QuickOption, 
  REQUEST_STATUS_CONFIG 
} from './chat.models';
import { getServicesBySpecialty } from './professional-services';
import { NotificationService } from '../../notifications/notification.service';

@Component({
  selector: 'app-professional-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-chat.component.html',
  styleUrl: './professional-chat.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(30px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(30px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProfessionalChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() professional: Professional | null = null;
  @Input() isOpen: boolean = false;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;

  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);
  private shouldScrollToBottom = false;
  private currentConversationId: string | null = null;

  messages: ChatMessage[] = [];
  uiState: ChatUiState = {
    step: 'greeting',
    options: [],
    inputMode: 'hidden',
    placeholder: '',
    isTyping: false
  };

  textMessage = '';
  dateValue = '';
  timeValue = '';
  minDate = '';

  statusConfig = REQUEST_STATUS_CONFIG;

  constructor() {
    // Suscribirse a los cambios del servicio
    this.chatService.messages$
      .pipe(takeUntilDestroyed())
      .subscribe(messages => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      });

    this.chatService.ui$
      .pipe(takeUntilDestroyed())
      .subscribe(state => {
        this.uiState = state;
      });
  }

  ngOnInit(): void {
    this.setMinDate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.professional) {
      const services = getServicesBySpecialty(this.professional.specialty);
      this.chatService.start(this.professional, services);
      
      // Establecer conversación activa para el sistema de notificaciones
      this.currentConversationId = this.chatService.getConversationId();
      if (this.currentConversationId) {
        this.notificationService.setActiveConversation(this.currentConversationId);
      }
      
      document.body.style.overflow = 'hidden';
      
      // Enfocar el input después de un delay
      setTimeout(() => {
        this.focusInput();
      }, 400);
    } else if (changes['isOpen'] && !this.isOpen) {
      // Limpiar conversación activa al cerrar
      if (this.currentConversationId) {
        this.notificationService.setActiveConversation(null);
        this.currentConversationId = null;
      }
      document.body.style.overflow = '';
    }
  }

  ngOnDestroy(): void {
    // Limpiar conversación activa al destruir el componente
    if (this.currentConversationId) {
      this.notificationService.setActiveConversation(null);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose(): void {
    // Limpiar conversación activa al cerrar
    if (this.currentConversationId) {
      this.notificationService.setActiveConversation(null);
      this.currentConversationId = null;
    }
    
    document.body.style.overflow = '';
    this.closeChat.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('chat-overlay')) {
      this.onClose();
    }
  }

  onChipClick(option: QuickOption): void {
    this.chatService.selectOption(option);
  }

  onTextSubmit(): void {
    if (!this.textMessage.trim()) return;
    this.chatService.submitText(this.textMessage.trim());
    this.textMessage = '';
  }

  onDateSubmit(): void {
    if (!this.dateValue) return;
    this.chatService.submitDate(this.dateValue);
    this.dateValue = '';
  }

  onTimeSubmit(): void {
    if (!this.timeValue) return;
    this.chatService.submitTime(this.timeValue);
    this.timeValue = '';
  }

  onTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onTextSubmit();
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }

  formatDateDisplay(date: Date): string {
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} de ${month}`;
  }

  formatTimeDisplay(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    const period = isPM ? 'p. m.' : 'a. m.';
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private focusInput(): void {
    if (this.textInput && this.uiState.inputMode === 'text') {
      this.textInput.nativeElement.focus();
    }
  }

  private setMinDate(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}
