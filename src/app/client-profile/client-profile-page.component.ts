import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { ClientAvatarComponent } from './client-avatar.component';
import { ClientProfileService } from './client-profile.service';
import { ReviewStore } from './review-store.service';
import { ChatStore } from '../components/professional-chat/chat-store.service';
import { ChatLauncherService } from '../notifications/chat-launcher.service';
import { NotificationService } from '../notifications/notification.service';
import {
  ClientProfile,
  validateName,
  validatePhone,
  validateEmail,
  validateAddress,
  formatPhone,
  displayPhone
} from './client-profile.models';
import { RequestStatus, REQUEST_STATUS_CONFIG } from '../components/professional-chat/chat.models';

type Tab = 'datos' | 'solicitudes';

interface FormData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface ConversationStats {
  total: number;
  inProgress: number;
  finished: number;
}

@Component({
  selector: 'app-client-profile-page',
  imports: [CommonModule, FormsModule, ClientAvatarComponent],
  templateUrl: './client-profile-page.component.html',
  styleUrl: './client-profile-page.component.css'
})
export class ClientProfilePageComponent implements OnInit {
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  profileService = inject(ClientProfileService);
  private reviewStore = inject(ReviewStore);
  private chatStore = inject(ChatStore);
  private chatLauncher = inject(ChatLauncherService);
  notificationService = inject(NotificationService);
  
  profile$ = this.profileService.profile$;
  
  activeTab: Tab = 'datos';
  clientId = '';
  
  // Pestaña datos
  isEditingProfile = false;
  formData: FormData = { name: '', phone: '', email: '', address: '' };
  formErrors = { name: '', phone: '', email: '', address: '' };
  isSaving = false;
  showSaved = false;
  
  // Pestaña solicitudes
  conversations$ = combineLatest([
    this.chatStore.conversations$,
    this.profile$
  ]).pipe(
    map(([conversations, profile]) => {
      if (!profile) return [];
      const clientId = profile.clientId || this.clientId;
      return conversations.filter(c => 
        c.clientId === clientId && 
        c.request && 
        c.request.status !== 'draft'
      ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }),
    takeUntilDestroyed()
  );
  
  filterStatus: RequestStatus | 'all' = 'all';
  
  get filteredConversations$() {
    return this.conversations$.pipe(
      map(conversations => {
        if (this.filterStatus === 'all') return conversations;
        
        // Para "pending", incluir también accepted y rescheduled
        if (this.filterStatus === 'pending') {
          return conversations.filter(c => 
            c.request?.status === 'pending' ||
            c.request?.status === 'accepted' ||
            c.request?.status === 'rescheduled'
          );
        }
        
        return conversations.filter(c => c.request?.status === this.filterStatus);
      })
    );
  }
  
  conversationStats$ = this.conversations$.pipe(
    map(conversations => {
      const stats: ConversationStats = { total: 0, inProgress: 0, finished: 0 };
      conversations.forEach(c => {
        stats.total++;
        if (c.request?.status === 'pending' || c.request?.status === 'accepted' || c.request?.status === 'rescheduled') {
          stats.inProgress++;
        } else if (c.request?.status === 'finished') {
          stats.finished++;
        }
      });
      return stats;
    })
  );
  
  ratingConversationId: string | null = null;
  ratingValue = 0;
  ratingComment = '';
  ratingHover = 0;
  
  // Photo upload
  photoError = '';
  isUploadingPhoto = false;
  
  statusConfig = REQUEST_STATUS_CONFIG;
  
  ngOnInit(): void {
    const client = this.chatStore.getClient();
    this.clientId = client.id;
    
    // Leer tab desde query params
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(params => {
      const tab = params['tab'] as Tab;
      if (tab && ['datos', 'solicitudes'].includes(tab)) {
        this.activeTab = tab;
      } else {
        this.activeTab = 'datos';
      }
    });
    
    // Cargar datos del perfil
    this.profile$.pipe(takeUntilDestroyed()).subscribe(profile => {
      if (profile) {
        this.formData = {
          name: profile.name,
          phone: displayPhone(profile.phone),
          email: profile.email,
          address: profile.address
        };
      }
    });
  }
  
  changeTab(tab: Tab): void {
    this.router.navigate([], {
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }
  
  getCreatedDate(): string {
    const profile = this.profileService.snapshot;
    if (!profile) return '';
    return profile.createdAt.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // ========== DATOS ==========
  
  validateForm(): boolean {
    this.formErrors = { name: '', phone: '', email: '', address: '' };
    
    const nameResult = validateName(this.formData.name);
    if (!nameResult.valid) {
      this.formErrors.name = nameResult.error || '';
      return false;
    }
    
    const phoneResult = validatePhone(this.formData.phone);
    if (!phoneResult.valid) {
      this.formErrors.phone = phoneResult.error || '';
      return false;
    }
    
    const emailResult = validateEmail(this.formData.email);
    if (!emailResult.valid) {
      this.formErrors.email = emailResult.error || '';
      return false;
    }
    
    const addressResult = validateAddress(this.formData.address);
    if (!addressResult.valid) {
      this.formErrors.address = addressResult.error || '';
      return false;
    }
    
    return true;
  }
  
  get hasChanges(): boolean {
    const profile = this.profileService.snapshot;
    if (!profile) return false;
    
    return (
      this.formData.name !== profile.name ||
      formatPhone(this.formData.phone) !== profile.phone ||
      this.formData.email !== profile.email ||
      this.formData.address !== profile.address
    );
  }
  
  saveProfile(): void {
    if (!this.validateForm() || !this.hasChanges) return;
    
    this.isSaving = true;
    this.profileService.updateProfile({
      name: this.formData.name.trim(),
      phone: formatPhone(this.formData.phone),
      email: this.formData.email.trim(),
      address: this.formData.address.trim()
    });
    
    setTimeout(() => {
      this.isSaving = false;
      this.showSaved = true;
      this.isEditingProfile = false; // Desactivar modo edición después de guardar
      setTimeout(() => {
        this.showSaved = false;
      }, 2500);
    }, 300);
  }
  
  startEditingProfile(): void {
    this.isEditingProfile = true;
  }
  
  cancelEditingProfile(): void {
    this.isEditingProfile = false;
    // Recargar datos del perfil para descartar cambios
    const profile = this.profileService.snapshot;
    if (profile) {
      this.formData = {
        name: profile.name,
        phone: displayPhone(profile.phone),
        email: profile.email,
        address: profile.address
      };
    }
  }
  
  triggerPhotoUpload(): void {
    this.photoInput?.nativeElement.click();
  }
  
  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    this.photoError = '';
    this.isUploadingPhoto = true;
    
    const result = await this.profileService.uploadPhoto(file);
    
    this.isUploadingPhoto = false;
    
    if (!result.success) {
      this.photoError = result.error || 'Error al subir la foto';
    }
    
    // Limpiar input
    input.value = '';
  }
  
  removePhoto(): void {
    this.profileService.updateProfile({ photo: '' });
  }
  
  get isProfileIncomplete(): boolean {
    const profile = this.profileService.snapshot;
    if (!profile) return true;
    return !this.profileService.hasName || !profile.phone;
  }
  
  // ========== SOLICITUDES ==========
  
  setFilter(status: RequestStatus | 'all'): void {
    this.filterStatus = status;
  }
  
  getFilterCount(status: RequestStatus | 'all'): number {
    const profile = this.profileService.snapshot;
    if (!profile) return 0;
    
    const clientId = profile.clientId || this.clientId;
    let count = 0;
    
    // Usar getValue() del BehaviorSubject si está disponible
    this.chatStore.conversations$.pipe(
      map(conversations => {
        const filtered = conversations.filter(c =>
          c.clientId === clientId &&
          c.request &&
          c.request.status !== 'draft'
        );
        
        if (status === 'all') {
          return filtered.length;
        } else if (status === 'pending') {
          return filtered.filter(c =>
            c.request?.status === 'pending' ||
            c.request?.status === 'accepted' ||
            c.request?.status === 'rescheduled'
          ).length;
        } else if (status === 'finished') {
          return filtered.filter(c => c.request?.status === 'finished').length;
        } else if (status === 'rejected') {
          return filtered.filter(c => c.request?.status === 'rejected').length;
        }
        return 0;
      })
    ).subscribe(c => count = c).unsubscribe();
    
    return count;
  }
  
  openChat(conversationId: string): void {
    this.chatLauncher.openChat(conversationId);
  }
  
  startRating(conversationId: string): void {
    this.ratingConversationId = conversationId;
    this.ratingValue = 0;
    this.ratingComment = '';
    this.ratingHover = 0;
  }
  
  cancelRating(): void {
    this.ratingConversationId = null;
  }
  
  setRating(value: number): void {
    this.ratingValue = value;
  }
  
  setRatingHover(value: number): void {
    this.ratingHover = value;
  }
  
  submitRating(): void {
    if (!this.ratingConversationId || this.ratingValue === 0) return;
    
    // Buscar la conversación
    let conversation: any = null;
    this.chatStore.conversations$.subscribe(conversations => {
      conversation = conversations.find(c => c.id === this.ratingConversationId);
    }).unsubscribe();
    
    if (!conversation) return;
    
    this.reviewStore.add({
      professionalKey: conversation.professionalKey,
      conversationId: this.ratingConversationId,
      clientId: this.clientId,
      clientName: conversation.clientName,
      rating: this.ratingValue,
      comment: this.ratingComment.trim()
    });
    
    this.cancelRating();
  }
  
  hasReview(conversationId: string): boolean {
    let hasIt = false;
    this.reviewStore.forConversation$(conversationId).pipe(
      map(review => review !== null)
    ).subscribe(result => hasIt = result).unsubscribe();
    return hasIt;
  }
  
  getReview(conversationId: string): any {
    let review: any = null;
    this.reviewStore.forConversation$(conversationId).subscribe(r => {
      review = r;
    }).unsubscribe();
    return review;
  }
  
  // ========== TRACKBY ==========
  
  trackByConversationId(index: number, item: any): string {
    return item.id;
  }
}
