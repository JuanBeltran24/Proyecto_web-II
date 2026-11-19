import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';
import { AppNotification, NotificationPrefs } from './notification.models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent {
  private notifService = inject(NotificationService);

  notifications$: Observable<AppNotification[]> = this.notifService.notifications$;
  unreadCount$: Observable<number> = this.notifService.unreadCount$;
  
  isOpen = false;
  showSettings = false;
  prefs: NotificationPrefs = this.notifService.getPreferences();

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    this.showSettings = false;
  }

  closePanel(): void {
    this.isOpen = false;
    this.showSettings = false;
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead();
  }

  clearAll(): void {
    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
      this.notifService.clearAll();
      this.closePanel();
    }
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
    const target = event.target as HTMLElement;
    const bellButton = document.querySelector('.notification-bell-button');
    const panel = document.querySelector('.notification-panel');
    
    if (this.isOpen && bellButton && panel) {
      if (!bellButton.contains(target) && !panel.contains(target)) {
        this.closePanel();
      }
    }
  }

  // Cerrar panel con tecla Escape
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closePanel();
    }
  }
}
