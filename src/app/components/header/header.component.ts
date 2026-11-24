import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationBellComponent } from '../../notifications/notification-bell.component';
import { ClientMenuComponent } from '../../client-profile/client-menu.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, NotificationBellComponent, ClientMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isMobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}
