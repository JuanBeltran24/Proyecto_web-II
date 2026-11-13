import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { ProfessionalSessionService } from '../professional-session.service';
import { ChatStore, toProfessionalKey } from '../../components/professional-chat/chat-store.service';

@Component({
  selector: 'app-professional-dashboard',
  imports: [CommonModule],
  templateUrl: './professional-dashboard.component.html',
  styleUrl: './professional-dashboard.component.css'
})
export class ProfessionalDashboardComponent implements OnInit {
  private sessionService = inject(ProfessionalSessionService);
  private chatStore = inject(ChatStore);

  pendingCount!: Observable<number>;
  acceptedCount!: Observable<number>;
  finishedCount!: Observable<number>;
  unreadCount!: Observable<number>;

  ngOnInit() {
    const session = this.sessionService.current;
    if (session) {
      const key = toProfessionalKey(session.name);
      const conversations$ = this.chatStore.conversationsForProfessional$(key);

      this.pendingCount = conversations$.pipe(
        map(convs => convs.filter(c => c.request?.status === 'pending').length)
      );

      this.acceptedCount = conversations$.pipe(
        map(convs => convs.filter(c => 
          c.request?.status === 'accepted' || c.request?.status === 'rescheduled'
        ).length)
      );

      this.finishedCount = conversations$.pipe(
        map(convs => convs.filter(c => c.request?.status === 'finished').length)
      );

      this.unreadCount = conversations$.pipe(
        map(convs => convs.reduce((sum, c) => sum + c.unreadForPro, 0))
      );
    }
  }
}
