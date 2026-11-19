import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

export interface ChatLaunchRequest {
  conversationId: string;
}

/**
 * Servicio para abrir el chat desde cualquier parte de la aplicación.
 * Usa ReplaySubject(1) para garantizar que HomeComponent reciba el evento
 * aunque se suscriba después de que se emita.
 */
@Injectable({ providedIn: 'root' })
export class ChatLauncherService {
  private launchSubject = new ReplaySubject<ChatLaunchRequest>(1);
  
  /**
   * Observable que emite cuando se solicita abrir un chat.
   */
  launch$ = this.launchSubject.asObservable();

  /**
   * Solicita abrir el chat con el profesional identificado por conversationId.
   * @param conversationId - ID de la conversación (nombre del profesional normalizado)
   */
  openChat(conversationId: string): void {
    this.launchSubject.next({ conversationId });
  }
}
