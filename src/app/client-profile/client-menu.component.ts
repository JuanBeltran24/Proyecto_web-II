import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClientAvatarComponent } from './client-avatar.component';
import { ClientProfileService } from './client-profile.service';
import { CLIENT_PROFILE_ROUTE } from './client-profile.models';

@Component({
  selector: 'app-client-menu',
  imports: [CommonModule, ClientAvatarComponent],
  templateUrl: './client-menu.component.html',
  styleUrl: './client-menu.component.css'
})
export class ClientMenuComponent {
  private router = inject(Router);
  clientProfile = inject(ClientProfileService);
  
  isOpen = false;
  
  get displayName(): string {
    const profile = this.clientProfile.snapshot;
    if (!profile || !this.clientProfile.hasName) {
      return 'Invitado';
    }
    return profile.name;
  }
  
  get photo(): string {
    return this.clientProfile.snapshot?.photo || '';
  }
  
  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }
  
  closeMenu(): void {
    this.isOpen = false;
  }
  
  navigateTo(tab: string): void {
    this.router.navigate([CLIENT_PROFILE_ROUTE], { queryParams: { tab } });
    this.closeMenu();
  }
  
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closeMenu();
    }
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const menu = target.closest('.client-menu');
    if (!menu && this.isOpen) {
      this.closeMenu();
    }
  }
}
