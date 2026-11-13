import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalSessionService } from '../professional-session.service';
import { ProfessionalProfileService } from '../professional-profile.service';

@Component({
  selector: 'app-professional-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-profile.component.html',
  styleUrl: './professional-profile.component.css'
})
export class ProfessionalProfileComponent implements OnInit {
  private sessionService = inject(ProfessionalSessionService);
  private profileService = inject(ProfessionalProfileService);

  name = '';
  specialty = '';
  description = '';
  visitRate = '';
  coverage = '';
  availability = '';
  language = '';
  experience = 5;
  available = true;

  saveMessage = '';

  ngOnInit() {
    const session = this.sessionService.current;
    if (session) {
      this.name = session.name;
      this.specialty = session.specialty;
      
      const profile = this.profileService.snapshot;
      if (profile) {
        this.description = profile.description;
        this.visitRate = profile.visitRate;
        this.coverage = profile.coverage;
        this.availability = profile.availability;
        this.language = profile.language;
        this.experience = profile.experience;
        this.available = profile.available;
      }
    }
  }

  saveProfile() {
    const profile = this.profileService.snapshot;
    if (!profile) return;

    this.profileService.save({
      ...profile,
      description: this.description,
      visitRate: this.visitRate,
      coverage: this.coverage,
      availability: this.availability,
      language: this.language,
      experience: this.experience,
      available: this.available
    });

    this.saveMessage = 'Perfil guardado correctamente';
    setTimeout(() => {
      this.saveMessage = '';
    }, 3000);
  }

  toggleAvailability() {
    this.available = !this.available;
    this.profileService.setAvailable(this.available);
    
    this.saveMessage = this.available 
      ? 'Ahora estás disponible para recibir solicitudes'
      : 'Ya no recibirás nuevas solicitudes';
    
    setTimeout(() => {
      this.saveMessage = '';
    }, 3000);
  }
}
