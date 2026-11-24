import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-avatar',
  imports: [CommonModule],
  templateUrl: './client-avatar.component.html',
  styleUrl: './client-avatar.component.css'
})
export class ClientAvatarComponent {
  @Input() photo: string = '';
  @Input() name: string = '';
  @Input() size: 'small' | 'medium' | 'large' | 'header' = 'medium';
  
  get initial(): string {
    if (!this.name || this.name.trim().length === 0) {
      return '?';
    }
    return this.name.trim().charAt(0).toUpperCase();
  }
  
  get sizeClass(): string {
    return `avatar-${this.size}`;
  }
}
