import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Professional {
  id: string;
  name: string;
  photo: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  distance: number;
  arrivalTime: string;
  location: string;
  visitRate: string;
  priceDescription: string;
  isVerified: boolean;
  backgroundCheck: string;
  // Coordenadas opcionales para el mapa (se llenarán desde professional-locations.ts)
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-professional-card',
  imports: [CommonModule],
  templateUrl: './professional-card.component.html',
  styleUrl: './professional-card.component.css'
})
export class ProfessionalCardComponent {
  @Input() professional: Professional = {
    id: '1',
    name: 'Juan Pérez',
    photo: '/img/tarjetas/persona1.png',
    specialty: 'Electricista Residencial',
    rating: 4.7,
    reviewCount: 100,
    distance: 0.8,
    arrivalTime: '10 min',
    location: 'Zona Norte (Neiva)',
    visitRate: '$30.000',
    priceDescription: 'Por qué él? Verificado y el mas rapido.',
    isVerified: true,
    backgroundCheck: 'OK'
  };

  @Output() cardClick = new EventEmitter<Professional>();

  onViewProfile(): void {
    this.cardClick.emit(this.professional);
  }

  onCardClick(): void {
    this.cardClick.emit(this.professional);
  }
}
