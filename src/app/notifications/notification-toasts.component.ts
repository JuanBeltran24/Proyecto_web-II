import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';
import { ToastNotification } from './notification.service';
import { Subject, takeUntil } from 'rxjs';

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

  ngOnInit(): void {
    // Solo escuchar la lista de toasts que el servicio prepara
    this.notifService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  pauseToast(toast: ToastNotification): void {
    this.notifService.pauseToast(toast);
  }

  resumeToast(toast: ToastNotification): void {
    this.notifService.resumeToast(toast);
  }

  removeToast(id: string): void {
    this.notifService.removeToast(id);
  }

  openToast(toast: ToastNotification): void {
    this.notifService.openToast(toast);
  }

  trackById(index: number, toast: ToastNotification): string {
    return toast.id;
  }

  getIcon(notification: ToastNotification): string {
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
