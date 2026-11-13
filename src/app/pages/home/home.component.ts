import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { ProfessionalCardComponent, Professional } from '../../components/professional-card/professional-card.component';
import { ProfessionalModalComponent } from '../../components/professional-modal/professional-modal.component';
import { ProfessionalChatComponent } from '../../components/professional-chat/professional-chat.component';

interface MapProfessional {
  id: number;
  name: string;
  role: string;
  distance: number;
  arrivalTime: string;
  photo?: string;
  x: number; // posición de la punta del pin, en % del ancho del mapa
  y: number; // posición de la punta del pin, en % del alto del mapa
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, HeroSectionComponent, ProfessionalCardComponent, ProfessionalModalComponent, ProfessionalChatComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  professionals: Professional[] = [];
  mapProfessionals: MapProfessional[] = [];
  selectedId: number | null = null;
  city = 'Neiva';
  
  // Modal state
  isModalOpen: boolean = false;
  selectedProfessional: Professional | null = null;
  
  // Chat state
  isChatOpen: boolean = false;
  chatProfessional: Professional | null = null;

  // Posición de cada pin en el mapa (en %), por orden de aparición.
  // Solo se muestran tantos profesionales como posiciones haya aquí.
  private readonly mapPositions = [
    { x: 13.5, y: 54 },  // izquierda
    { x: 59.5, y: 23 },  // arriba derecha
    { x: 76,   y: 70 }   // abajo derecha
  ];

  ngOnInit(): void {
    // Datos de ejemplo de profesionales
    this.professionals = [
      {
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
      },
      {
        id: '2',
        name: 'María Paz',
        photo: '/img/tarjetas/persona2.png',
        specialty: 'Mecánico Residencial',
        rating: 4.5,
        reviewCount: 164,
        distance: 0.8,
        arrivalTime: '24 min',
        location: 'Zona Sur (Neiva)',
        visitRate: '$25.000',
        priceDescription: 'Por qué ella? Máxima calidad verificada',
        isVerified: true,
        backgroundCheck: 'OK'
      },
      {
        id: '3',
        name: 'David Roa',
        photo: '/img/tarjetas/persona3.png',
        specialty: 'Carpintero Residencial',
        rating: 4.2,
        reviewCount: 200,
        distance: 0.8,
        arrivalTime: '30 min',
        location: 'Zona Oriente (Neiva)',
        visitRate: '$20.000',
        priceDescription: 'Por qué él? Verificado y económico',
        isVerified: true,
        backgroundCheck: 'OK'
      },
      {
        id: '4',
        name: 'Daniel Villa',
        photo: '/img/tarjetas/persona4.png',
        specialty: 'Mecánico Residencial',
        rating: 4.1,
        reviewCount: 100,
        distance: 0.8,
        arrivalTime: '35 min',
        location: 'Zona Norte (Neiva)',
        visitRate: '$40.000',
        priceDescription: 'Por qué él? Verificado y el mas rapido.',
        isVerified: true,
        backgroundCheck: 'OK'
      },
      {
        id: '5',
        name: 'Sofía Acost',
        photo: '/img/tarjetas/persona5.png',
        specialty: 'Chef Residencial',
        rating: 4.3,
        reviewCount: 164,
        distance: 0.8,
        arrivalTime: '14 min',
        location: 'Zona Sur (Neiva)',
        visitRate: '$22.000',
        priceDescription: 'Por qué ella? Máxima calidad verificada',
        isVerified: true,
        backgroundCheck: 'OK'
      },
      {
        id: '6',
        name: 'Julian Peña',
        photo: '/img/tarjetas/persona6.png',
        specialty: 'Tecn. Sistemas Residencial',
        rating: 4.3,
        reviewCount: 200,
        distance: 0.8,
        arrivalTime: '40 min',
        location: 'Zona Oriente (Neiva)',
        visitRate: '$30.500',
        priceDescription: 'Por qué él? Verificado y económico',
        isVerified: true,
        backgroundCheck: 'OK'
      }
    ];

    // Convierte los profesionales al formato que usa el mapa
    this.mapProfessionals = this.professionals
      .slice(0, this.mapPositions.length)
      .map((p, i) => ({
        id: Number(p.id),
        name: p.name,
        role: p.specialty,
        distance: p.distance,
        arrivalTime: p.arrivalTime,
        photo: p.photo,
        x: this.mapPositions[i].x,
        y: this.mapPositions[i].y
      }));
  }

  selectPin(id: number): void {
    this.selectedId = this.selectedId === id ? null : id;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  // Modal methods
  openModal(professional: Professional): void {
    this.selectedProfessional = professional;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedProfessional = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  handleRequestService(professional: Professional): void {
    console.log('Solicitar servicio de:', professional.name);
    // Cerrar el modal y abrir el chat
    this.closeModal();
    
    // Pequeño delay para evitar conflictos con animaciones
    setTimeout(() => {
      this.chatProfessional = professional;
      this.isChatOpen = true;
    }, 200);
  }

  closeChat(): void {
    this.isChatOpen = false;
    this.chatProfessional = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }
}