import { Component, HostListener, Input, inject, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';
import { AppNotification, NotificationPrefs } from './notification.models';
import { Observable, fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnDestroy {
  @Input() variant: 'light' | 'dark' = 'light';
  
  private notifService = inject(NotificationService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroy$ = new Subject<void>();
  
  private panelElement: HTMLElement | null = null;
  private resizeListener: (() => void) | null = null;

  notifications$: Observable<AppNotification[]> = this.notifService.notifications$;
  unreadCount$: Observable<number> = this.notifService.unreadCount$;
  
  isOpen = false;
  showSettings = false;
  showClearConfirm = false;
  clearActionMessage = '';
  prefs: NotificationPrefs = this.notifService.getPreferences();

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    this.showSettings = false;
    this.showClearConfirm = false;
    this.clearActionMessage = '';
    
    if (this.isOpen) {
      setTimeout(() => this.positionPanel(), 0);
      this.setupResizeListener();
    } else {
      this.removeResizeListener();
    }
  }

  closePanel(): void {
    this.isOpen = false;
    this.showSettings = false;
    this.showClearConfirm = false;
    this.clearActionMessage = '';
    this.removeResizeListener();
    
    // Quitar el panel del body si está ahí
    if (this.panelElement && this.panelElement.parentElement === document.body) {
      this.renderer.removeChild(document.body, this.panelElement);
      this.panelElement = null;
    }
  }

  private positionPanel(): void {
    const panel = document.querySelector('.notification-panel') as HTMLElement;
    if (!panel) return;

    // Mover el panel a body si no está ya
    if (panel.parentElement !== document.body) {
      this.panelElement = panel;
      this.renderer.appendChild(document.body, panel);
    }

    const button = this.elementRef.nativeElement.querySelector('.notification-bell-button');
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const panelWidth = 360;
    const panelMaxHeight = Math.min(560, window.innerHeight * 0.8);
    
    // Detectar si es móvil
    const isMobile = window.innerWidth <= 640;
    
    if (isMobile) {
      // Bottom sheet en móvil
      this.renderer.setStyle(panel, 'position', 'fixed');
      this.renderer.setStyle(panel, 'top', 'auto');
      this.renderer.setStyle(panel, 'bottom', '0');
      this.renderer.setStyle(panel, 'left', '0');
      this.renderer.setStyle(panel, 'right', '0');
      this.renderer.setStyle(panel, 'width', '100%');
      this.renderer.setStyle(panel, 'max-height', '80dvh');
      this.renderer.setStyle(panel, 'border-radius', '16px 16px 0 0');
    } else {
      // Escritorio: posicionar relativo al botón
      let left = buttonRect.right - panelWidth;
      let top = buttonRect.bottom + 8;
      
      // Si no cabe a la derecha, abrirlo a la izquierda
      if (left < 8) {
        left = buttonRect.left;
      }
      
      // Si no cabe hacia la izquierda tampoco, centrarlo
      if (left + panelWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - panelWidth - 8);
      }
      
      // Si no cabe hacia abajo, abrirlo hacia arriba
      if (top + panelMaxHeight > window.innerHeight - 8) {
        top = buttonRect.top - panelMaxHeight - 8;
        if (top < 8) {
          top = 8;
        }
      }
      
      this.renderer.setStyle(panel, 'position', 'fixed');
      this.renderer.setStyle(panel, 'top', `${Math.max(0, top)}px`);
      this.renderer.setStyle(panel, 'left', `${Math.max(0, left)}px`);
      this.renderer.setStyle(panel, 'right', 'auto');
      this.renderer.setStyle(panel, 'bottom', 'auto');
      this.renderer.setStyle(panel, 'width', `${panelWidth}px`);
      this.renderer.setStyle(panel, 'max-height', `min(560px, 80vh)`);
      this.renderer.setStyle(panel, 'border-radius', '8px');
    }
    
    this.renderer.setStyle(panel, 'z-index', '10000');
  }

  private setupResizeListener(): void {
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      if (this.isOpen) {
        this.positionPanel();
      }
    });
    
    fromEvent(window, 'scroll', { passive: true, capture: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isOpen) {
          this.positionPanel();
        }
      });
  }

  private removeResizeListener(): void {
    if (this.resizeListener) {
      this.resizeListener();
      this.resizeListener = null;
    }
  }

  ngOnDestroy(): void {
    this.removeResizeListener();
    this.destroy$.next();
    this.destroy$.complete();
    
    // Quitar el panel del body si está ahí
    if (this.panelElement && this.panelElement.parentElement === document.body) {
      this.renderer.removeChild(document.body, this.panelElement);
    }
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
    this.showClearConfirm = false;
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead();
  }

  showClearAllConfirmation(): void {
    this.showClearConfirm = true;
    setTimeout(() => {
      const cancelButton = document.querySelector('.clear-cancel-button') as HTMLElement;
      if (cancelButton) cancelButton.focus();
    }, 0);
  }

  cancelClearAll(): void {
    this.showClearConfirm = false;
  }

  confirmClearAll(): void {
    this.notifService.clearAll();
    this.showClearConfirm = false;
    this.clearActionMessage = 'Notificaciones borradas';
    
    setTimeout(() => {
      this.clearActionMessage = '';
    }, 3000);
    
    setTimeout(() => {
      const bellButton = document.querySelector('.notification-bell-button') as HTMLElement;
      if (bellButton) bellButton.focus();
    }, 0);
  }

  openNotification(notification: AppNotification): void {
    this.notifService.open(notification);
    this.closePanel();
  }

  removeNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notifService.remove(id);
  }

  formatTime(date: Date): string {
    return this.notifService.formatRelativeTime(date);
  }

  getIcon(notification: AppNotification): string {
    switch (notification.type) {
      case 'request_new': return '📩';
      case 'request_accepted': return '✅';
      case 'request_rejected': return '❌';
      case 'request_rescheduled': return '📅';
      case 'request_finished': return '🎉';
      case 'message_new': return '💬';
      default: return '🔔';
    }
  }

  // ============== PREFERENCIAS ==============

  updateToasts(enabled: boolean): void {
    this.prefs.toasts = enabled;
    this.notifService.updatePreferences({ toasts: enabled });
  }

  // Cerrar panel al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isOpen) return;
    
    const target = event.target as HTMLElement;
    const button = this.elementRef.nativeElement.querySelector('.notification-bell-button');
    const panel = document.querySelector('.notification-panel');
    
    // Verificar si el clic fue dentro del botón o del panel
    if (button && button.contains(target)) {
      return; // No cerrar, el botón maneja su propio toggle
    }
    
    if (panel && panel.contains(target)) {
      return; // No cerrar, el clic fue dentro del panel
    }
    
    // El clic fue fuera, cerrar el panel
    this.closePanel();
  }

  // Cerrar panel con tecla Escape
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showClearConfirm) {
      // Primer Esc: cancelar confirmación
      this.cancelClearAll();
    } else if (this.isOpen) {
      // Segundo Esc: cerrar panel
      this.closePanel();
    }
  }
}
