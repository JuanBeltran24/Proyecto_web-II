import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, Subject } from 'rxjs';
import { map, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { 
  ChatMessage, 
  ChatStep, 
  ChatUiState, 
  InputMode, 
  QuickOption, 
  ServiceRequest 
} from './chat.models';
import { Professional } from '../professional-card/professional-card.component';
import { ChatStore } from './chat-store.service';
import { toIsoDate, formatLongDate, formatTime12 } from './chat-utils';
import { getServicesBySpecialty } from './professional-services';
import { ClientProfileService } from '../../client-profile/client-profile.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private store = inject(ChatStore);
  private clientProfile = inject(ClientProfileService);

  private activeConversationIdSubject = new BehaviorSubject<string | null>(null);
  private typingSubject = new BehaviorSubject<boolean>(false);
  private uiStateSubject = new BehaviorSubject<ChatUiState>({
    step: 'greeting',
    options: [],
    inputMode: 'hidden',
    placeholder: '',
    isTyping: false
  });

  private currentProfessional: Professional | null = null;
  private currentDraft: Partial<ServiceRequest> = {};
  private typingTimer?: ReturnType<typeof setTimeout>;
  private currentConversationId: string | null = null;
  private destroy$ = new Subject<void>();

  // Mensajes de la conversación activa
  get messages$(): Observable<ChatMessage[]> {
    return combineLatest([
      this.store.conversations$,
      this.activeConversationIdSubject
    ]).pipe(
      map(([conversations, activeId]) => {
        if (!activeId) return [];
        const conv = conversations.find(c => c.id === activeId);
        return conv ? conv.messages : [];
      })
    );
  }

  typing$ = this.typingSubject.asObservable();
  ui$ = this.uiStateSubject.asObservable();

  /**
   * Obtiene el ID de la conversación activa
   */
  getConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Inicia el chat con un profesional
   * Si ya existe una conversación, la restaura; si no, crea una nueva
   */
  start(professional: Professional, services: string[]): void {
    // Crear o encontrar la conversación
    const conv = this.store.ensureConversation({
      professionalName: professional.name,
      professionalSpecialty: professional.specialty
    });

    // Si es la misma conversación que ya estaba abierta, no reiniciar
    if (this.currentConversationId === conv.id) {
      return;
    }

    // Cancelar observadores anteriores
    this.destroy$.next();

    this.currentConversationId = conv.id;
    this.currentProfessional = professional;
    this.activeConversationIdSubject.next(conv.id);

    // Marcar como leído para el usuario
    this.store.markRead(conv.id, 'user');

    // Observar cambios en el estado de la solicitud para actualizar la UI
    this.watchRequestStatus(conv.id);

    // Si la solicitud anterior fue finalizada, permitir nueva solicitud
    if (conv.request && conv.request.status === 'finished') {
      this.updateUiState({
        step: 'sent',
        inputMode: 'chips',
        options: [
          { label: '✓ Nueva solicitud', value: '__new_request__' }
        ],
        placeholder: `Escribe un mensaje a ${professional.name}...`,
        isTyping: false
      });
      return;
    }

    // Si ya tiene request enviada (pero no finalizada), restaurar modo chat libre
    if (conv.request && conv.request.status !== 'draft') {
      this.updateUiState({
        step: 'sent',
        inputMode: 'text',
        options: [],
        placeholder: `Escribe un mensaje a ${professional.name}...`,
        isTyping: false
      });
      return;
    }

    // Si el flujo quedó incompleto (borrador sin enviar), empezar de cero
    if (conv.messages.length > 0) {
      this.store.clearMessages(conv.id);
    }

    // Reiniciar el flujo
    this.currentDraft = {};
    this.updateUiState({
      step: 'greeting',
      inputMode: 'hidden',
      options: [],
      placeholder: '',
      isTyping: false
    });

    // Mensaje de saludo del bot
    this.addBotMessage(
      `¡Hola! Soy el asistente. Te haré unas preguntas rápidas para que ${professional.name} revise tu solicitud.`,
      true
    );

    // Si no tiene nombre, preguntar primero
    if (!this.clientProfile.hasName) {
      setTimeout(() => {
        const firstName = professional.name.split(' ')[0];
        this.moveToStep('name', [firstName]);
      }, 800);
    } else {
      // Avanzar al siguiente paso
      setTimeout(() => {
        this.moveToStep('service', services);
      }, 800);
    }
  }

  /**
   * Observa cambios en el estado de la solicitud para actualizar la UI automáticamente
   */
  private watchRequestStatus(conversationId: string): void {
    this.store.conversations$.pipe(
      map(conversations => conversations.find(c => c.id === conversationId)),
      map(conv => conv?.request?.status),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      // Si el estado cambia a 'accepted', 'rejected', 'rescheduled' o 'finished'
      // y el chat ya está en modo 'sent', asegurarse de que el input esté habilitado
      if (!status) return;
      
      const currentState = this.uiStateSubject.value;
      
      // Si la solicitud fue aceptada, rechazada o reprogramada, habilitar chat libre
      if (['accepted', 'rejected', 'rescheduled'].includes(status) && currentState.step === 'sent') {
        this.updateUiState({
          step: 'sent',
          inputMode: 'text',
          options: [],
          placeholder: `Escribe un mensaje a ${this.currentProfessional?.name}...`,
          isTyping: false
        });
      }
      
      // Si la solicitud fue finalizada, mostrar botón de nueva solicitud
      if (status === 'finished') {
        this.updateUiState({
          step: 'sent',
          inputMode: 'chips',
          options: [
            { label: '✓ Nueva solicitud', value: '__new_request__' }
          ],
          placeholder: `Escribe un mensaje a ${this.currentProfessional?.name}...`,
          isTyping: false
        });
      }
    });
  }

  /**
   * Selecciona una opción rápida (chip)
   */
  selectOption(option: QuickOption): void {
    if (option.value === '__select_date__') {
      this.updateUiState({ inputMode: 'date' });
      return;
    }
    if (option.value === '__select_time__') {
      this.updateUiState({ inputMode: 'time' });
      return;
    }
    if (option.value === '__new_request__') {
      this.startNewRequest();
      return;
    }

    // Para el día, el value puede contener JSON con formatted e iso
    const state = this.uiStateSubject.value;
    if (state.step === 'day') {
      try {
        const data = JSON.parse(option.value);
        this.currentDraft.day = data.formatted;
        this.currentDraft.dayIso = data.iso;
        this.handleUserResponse(option.label, undefined, true);
        return;
      } catch {
        // No es JSON, procesar normalmente
      }
    }

    // Para direcciones guardadas, usar el value completo
    if (state.step === 'address') {
      this.handleUserResponse(option.value, option.label, true);
      return;
    }

    this.handleUserResponse(option.value, option.label, true);
  }

  /**
   * Envía un mensaje de texto
   */
  submitText(text: string): void {
    if (!text.trim()) return;

    const state = this.uiStateSubject.value;
    const guided = state.step !== 'sent'; // En 'sent' es chat libre

    this.handleUserResponse(text.trim(), undefined, guided);
  }

  /**
   * Envía una fecha seleccionada
   */
  submitDate(dateValue: string): void {
    if (!dateValue) return;

    const date = new Date(dateValue + 'T00:00:00');
    const formatted = formatLongDate(date);
    const iso = toIsoDate(date);

    // Guardar ambas versiones
    this.currentDraft.day = formatted;
    this.currentDraft.dayIso = iso;

    this.handleUserResponse(formatted, undefined, true);
  }

  /**
   * Envía una hora seleccionada
   */
  submitTime(timeValue: string): void {
    if (!timeValue) return;

    const formatted = formatTime12(timeValue);
    this.handleUserResponse(formatted, undefined, true);
  }

  /**
   * Reinicia completamente el servicio
   */
  reset(): void {
    this.clearTimers();
    this.destroy$.next(); // Cancelar observadores
    this.currentConversationId = null;
    this.currentProfessional = null;
    this.currentDraft = {};
    this.activeConversationIdSubject.next(null);
    this.updateUiState({
      step: 'greeting',
      options: [],
      inputMode: 'hidden',
      placeholder: '',
      isTyping: false
    });
  }

  /**
   * Inicia una nueva solicitud después de que la anterior fue finalizada
   * Limpia la solicitud anterior y reinicia el flujo de chat
   */
  private startNewRequest(): void {
    if (!this.currentConversationId || !this.currentProfessional) return;

    // Limpiar la solicitud finalizada de la conversación
    this.store.clearMessages(this.currentConversationId);

    // Reiniciar el flujo
    this.currentDraft = {};
    const services = this.getServices();

    this.updateUiState({
      step: 'greeting',
      inputMode: 'hidden',
      options: [],
      placeholder: '',
      isTyping: false
    });

    // Mensaje de saludo del bot
    this.addBotMessage(
      `¡Bienvenido de nuevo! Hagamos una nueva solicitud.`,
      true
    );

    // Avanzar al siguiente paso
    setTimeout(() => {
      this.moveToStep('service', services);
    }, 800);
  }

  // ========== Métodos Privados ==========

  private handleUserResponse(value: string, displayText?: string, guided: boolean = false): void {
    const currentState = this.uiStateSubject.value;

    // Agregar mensaje del usuario
    this.addUserMessage(displayText || value, guided);

    // Ocultar opciones mientras procesamos
    this.updateUiState({ inputMode: 'hidden', options: [] });

    // Procesar según el paso actual
    this.processStep(currentState.step, value);
  }

  private processStep(step: ChatStep, value: string): void {
    switch (step) {
      case 'name':
        // Validar nombre (2 a 60 caracteres)
        if (value.trim().length < 2 || value.trim().length > 60) {
          this.addBotMessage('Por favor, escribe un nombre válido (entre 2 y 60 caracteres).', true);
          this.updateUiState({ inputMode: 'text', placeholder: 'Tu nombre...' });
          return;
        }
        // Guardar nombre en el perfil
        this.clientProfile.updateProfile({ name: value.trim() });
        this.showTypingAndMove('service');
        break;
      case 'service':
        this.currentDraft.service = value;
        this.showTypingAndMove('problem');
        break;
      case 'problem':
        this.currentDraft.description = value;
        this.showTypingAndMove('day');
        break;
      case 'day':
        // day y dayIso ya están en currentDraft (submitDate los establece)
        this.showTypingAndMove('time');
        break;
      case 'time':
        this.currentDraft.time = value;
        this.showTypingAndMove('address');
        break;
      case 'address':
        this.currentDraft.address = value;
        this.showTypingAndMove('confirmation');
        break;
      case 'confirmation':
        if (value === 'send') {
          this.sendRequest();
        } else if (value === 'edit') {
          this.editRequest();
        }
        break;
      case 'sent':
        // Chat libre: el mensaje ya se agregó, volver a habilitar el input
        this.updateUiState({
          step: 'sent',
          inputMode: 'text',
          options: [],
          placeholder: `Escribe un mensaje a ${this.currentProfessional?.name}...`,
          isTyping: false
        });
        // BACKEND: Aquí se enviará el mensaje por WebSocket
        break;
    }
  }

  private moveToStep(step: ChatStep, services?: string[], firstName?: string): void {
    const state = this.uiStateSubject.value;
    state.step = step;

    switch (step) {
      case 'name':
        this.askName(firstName || '');
        break;
      case 'service':
        this.askService(services!);
        break;
      case 'problem':
        this.askProblem();
        break;
      case 'day':
        this.askDay();
        break;
      case 'time':
        this.askTime();
        break;
      case 'address':
        this.askAddress();
        break;
      case 'confirmation':
        this.showConfirmation();
        break;
      case 'sent':
        this.enableFreeChat();
        break;
    }
  }

  private showTypingAndMove(nextStep: ChatStep, delay: number = 600): void {
    this.setTyping(true);
    this.typingTimer = setTimeout(() => {
      this.setTyping(false);
      if (nextStep === 'service') {
        const services = this.getServices();
        this.moveToStep(nextStep, services);
      } else {
        this.moveToStep(nextStep);
      }
    }, delay);
  }

  private askName(firstName: string): void {
    this.addBotMessage(`¿Cómo te llamas? Así te presento con ${firstName}.`, true);
    
    this.updateUiState({
      inputMode: 'text',
      options: [],
      placeholder: 'Tu nombre...'
    });
  }

  private askService(services: string[]): void {
    this.addBotMessage('¿Qué servicio necesitas?', true);
    
    this.updateUiState({
      inputMode: 'chips',
      options: services.map(s => ({ label: s, value: s })),
      placeholder: ''
    });
  }

  private askProblem(): void {
    this.addBotMessage('Describe el problema o lo que necesitas:', true);
    
    this.updateUiState({
      inputMode: 'text',
      options: [],
      placeholder: 'Escribe aquí...'
    });
  }

  private askDay(): void {
    this.addBotMessage('¿Para qué día?', true);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFormatted = formatLongDate(today);
    const tomorrowFormatted = formatLongDate(tomorrow);
    const todayIso = toIsoDate(today);
    const tomorrowIso = toIsoDate(tomorrow);

    // Guardar en el draft para cuando el usuario seleccione
    this.updateUiState({
      inputMode: 'chips',
      options: [
        { 
          label: `Hoy · ${today.toLocaleDateString('es-ES', { weekday: 'long' })}`, 
          value: JSON.stringify({ formatted: todayFormatted, iso: todayIso })
        },
        { 
          label: `Mañana · ${tomorrow.toLocaleDateString('es-ES', { weekday: 'long' })}`, 
          value: JSON.stringify({ formatted: tomorrowFormatted, iso: tomorrowIso })
        },
        { label: 'Elegir fecha', value: '__select_date__' }
      ],
      placeholder: ''
    });
  }

  private askTime(): void {
    this.addBotMessage('¿A qué hora?', true);
    
    this.updateUiState({
      inputMode: 'chips',
      options: [
        { label: 'Mañana · 8 a 12', value: 'Mañana (8:00 - 12:00)' },
        { label: 'Tarde · 12 a 6', value: 'Tarde (12:00 - 18:00)' },
        { label: 'Hora exacta', value: '__select_time__' }
      ],
      placeholder: ''
    });
  }

  private askAddress(): void {
    this.addBotMessage('¿Dónde se realizará el servicio?', true);
    
    const profile = this.clientProfile.snapshot;
    const savedAddress = profile?.address || '';
    
    if (savedAddress.trim().length > 0) {
      // Mostrar la dirección guardada como opción
      const options: QuickOption[] = [{
        label: `📍 ${savedAddress.substring(0, 50)}${savedAddress.length > 50 ? '...' : ''}`,
        value: savedAddress
      }];
      
      this.updateUiState({
        inputMode: 'chips',
        options,
        placeholder: 'O escribe otra dirección...'
      });
    } else {
      this.updateUiState({
        inputMode: 'text',
        options: [],
        placeholder: 'Barrio, calle y número...'
      });
    }
  }

  private showConfirmation(): void {
    if (!this.currentConversationId) return;

    this.addBotMessage('Revisa tu solicitud:', true);

    // Agregar tarjeta con la solicitud
    const card: ServiceRequest = {
      service: this.currentDraft.service!,
      description: this.currentDraft.description!,
      day: this.currentDraft.day!,
      dayIso: this.currentDraft.dayIso,
      time: this.currentDraft.time!,
      address: this.currentDraft.address!,
      status: 'draft'
    };

    this.store.addMessage(this.currentConversationId, {
      sender: 'bot',
      type: 'request_card',
      card,
      guided: true
    });

    this.updateUiState({
      inputMode: 'chips',
      options: [
        { label: 'Enviar solicitud', value: 'send' },
        { label: 'Editar', value: 'edit' }
      ],
      placeholder: ''
    });
  }

  private sendRequest(): void {
    if (!this.currentConversationId) return;

    // Guardar la solicitud con status 'pending' (esto actualiza la tarjeta automáticamente)
    const request: ServiceRequest = {
      service: this.currentDraft.service!,
      description: this.currentDraft.description!,
      day: this.currentDraft.day!,
      dayIso: this.currentDraft.dayIso,
      time: this.currentDraft.time!,
      address: this.currentDraft.address!,
      status: 'pending'
    };

    this.store.setRequest(this.currentConversationId, request);

    this.addBotMessage(
      `¡Solicitud enviada! ${this.currentProfessional?.name} la revisará pronto.`,
      true
    );

    // Habilitar chat libre inmediatamente
    this.enableFreeChat();

    // BACKEND: Aquí se enviaría la solicitud al servidor
  }

  private editRequest(): void {
    if (!this.currentConversationId) return;

    // Buscar y remover la tarjeta de confirmación
    const conv = this.store.find(this.currentConversationId);
    if (conv) {
      const cardMsg = conv.messages.find(m => m.type === 'request_card');
      if (cardMsg) {
        this.store.removeMessage(this.currentConversationId, cardMsg.id);
      }
    }

    // Limpiar datos
    this.currentDraft = {};

    // Volver al paso de servicio
    this.addBotMessage('Perfecto, empecemos de nuevo.', true);
    setTimeout(() => {
      if (this.currentProfessional) {
        const services = this.getServices();
        this.moveToStep('service', services);
      }
    }, 600);
  }

  private enableFreeChat(): void {
    this.updateUiState({
      step: 'sent',
      inputMode: 'text',
      options: [],
      placeholder: `Escribe un mensaje a ${this.currentProfessional?.name}...`,
      isTyping: false
    });
  }

  private addUserMessage(text: string, guided: boolean): void {
    if (!this.currentConversationId) return;

    this.store.addMessage(this.currentConversationId, {
      sender: 'user',
      type: 'text',
      text,
      guided
    });
  }

  private addBotMessage(text: string, guided: boolean): void {
    if (!this.currentConversationId) return;

    this.store.addMessage(this.currentConversationId, {
      sender: 'bot',
      type: 'text',
      text,
      guided
    });
  }

  private setTyping(isTyping: boolean): void {
    this.typingSubject.next(isTyping);
    const state = this.uiStateSubject.value;
    this.uiStateSubject.next({ ...state, isTyping });
  }

  private updateUiState(partial: Partial<ChatUiState>): void {
    const current = this.uiStateSubject.value;
    this.uiStateSubject.next({ ...current, ...partial });
  }

  private getServices(): string[] {
    if (!this.currentProfessional) return [];
    return getServicesBySpecialty(this.currentProfessional.specialty);
  }

  private clearTimers(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }
}
