import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';
import { AppNotification } from './notification.models';
import { Subject, takeUntil } from 'rxjs';

interface ToastNotification extends AppNotification {
  progress: number;
  isPaused: boolean;
  timeoutId?: any;
  startTime?: number;
  remainingTime?: number;
}

const TOAST_DURATION = 6000; // 6 segundos
const MAX_VISIBLE_TOASTS = 3;

@Component({
  selector: 'app-notification-toasts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toasts.component.html',
  styleUrls: ['./notification-toasts.component.css']
})
export class NotificationToastsComponent implements OnInit, OnDestroy {
  private notifService = inject(NotificationService);
  private destroy$ = new Subject<void>();
  
  toasts: ToastNotification[] = [];
  private lastNotificationIds = new Set<string>();

  ngOnInit(): void {
    // Escuchar nuevas notificaciones
    this.notifService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        // Detectar notificaciones nuevas que no están leídas
        notifications.forEach(notif => {
          if (!notif.read && !this.lastNotificationIds.has(notif.id)) {
            this.showToast(notif);
          }
        });

        // Actualizar el set de IDs conocidos
        this.lastNotificationIds = new Set(notifications.map(n => n.id));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar todos los timeouts
    this.toasts.forEach(toast => {
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
    });
  }

  private showToast(notification: AppNotification): void {
    // No mostrar si ya existe el toast
    if (this.toasts.some(t => t.id === notification.id)) {
      return;
    }

    // Limitar a MAX_VISIBLE_TOASTS
    if (this.toasts.length >= MAX_VISIBLE_TOASTS) {
      const oldest = this.toasts[0];
      this.removeToast(oldest.id);
    }

    const toast: ToastNotification = {
      ...notification,
      progress: 100,
      isPaused: false,
      startTime: Date.now(),
      remainingTime: TOAST_DURATION,
    };

    this.toasts.push(toast);
    this.startToastTimer(toast);
  }

  private startToastTimer(toast: ToastNotification): void {
    const startTime = Date.now();
    const duration = toast.remainingTime || TOAST_DURATION;

    const updateProgress = () => {
      if (toast.isPaused) return;

      const elapsed = Date.now() - startTime;
      const remaining = duration - elapsed;
      toast.progress = Math.max(0, (remaining / TOAST_DURATION) * 100);

      if (remaining <= 0) {
        this.removeToast(toast.id);
      }
    };

    // Actualizar progreso cada 50ms
    const intervalId = setInterval(updateProgress, 50);

    // Timeout para eliminar el toast
    toast.timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      this.removeToast(toast.id);
    }, duration);

    // Guardar el intervalId para limpiarlo después
    (toast as any).intervalId = intervalId;
  }

  pauseToast(toast: ToastNotification): void {
    if (toast.isPaused) return;

    toast.isPaused = true;
    
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    if ((toast as any).intervalId) {
      clearInterval((toast as any).intervalId);
    }

    // Calcular tiempo restante
    const elapsed = Date.now() - (toast.startTime || Date.now());
    toast.remainingTime = Math.max(0, (toast.remainingTime || TOAST_DURATION) - elapsed);
  }

  resumeToast(toast: ToastNotification): void {
    if (!toast.isPaused) return;

    toast.isPaused = false;
    toast.startTime = Date.now();
    this.startToastTimer(toast);
  }

  removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    const toast = this.toasts[index];
    
    // Limpiar timeouts/intervals
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    if ((toast as any).intervalId) {
      clearInterval((toast as any).intervalId);
    }

    this.toasts.splice(index, 1);
  }

  openToast(toast: ToastNotification): void {
    this.notifService.open(toast);
    this.removeToast(toast.id);
  }

  trackById(index: number, toast: ToastNotification): string {
    return toast.id;
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
}
