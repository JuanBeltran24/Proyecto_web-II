import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ProfessionalSessionService } from '../professional-session.service';
import { NotificationBellComponent } from '../../notifications/notification-bell.component';

@Component({
  selector: 'app-professional-shell',
  imports: [RouterModule, NotificationBellComponent],
  templateUrl: './professional-shell.component.html',
  styleUrl: './professional-shell.component.css'
})
export class ProfessionalShellComponent {
  private sessionService = inject(ProfessionalSessionService);
  private router = inject(Router);

  get professional() {
    return this.sessionService.current;
  }

  logout() {
    this.sessionService.logout();
    this.router.navigate(['/']);
  }
}
