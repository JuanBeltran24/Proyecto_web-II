import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { Professional } from '../professional-card/professional-card.component';

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
}

interface RatingRow {
  stars: number;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-professional-modal',
  imports: [CommonModule],
  templateUrl: './professional-modal.component.html',
  styleUrl: './professional-modal.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(24px) scale(0.98)', opacity: 0 }),
        animate('300ms cubic-bezier(0.22, 1, 0.36, 1)', style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(24px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProfessionalModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() professional: Professional | null = null;
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() requestService = new EventEmitter<Professional>();

  // Datos extendidos del profesional (en producción vendrían del backend)
  experience: number = 5;
  services: string[] = [];
  availability: string = 'Lunes a sábado';
  paymentMethods: string = 'Efectivo, Transferencia';
  language: string = 'Español';
  coverage: string = 'Neiva y alrededores';
  warranty: string = '30 días';
  description: string = '';
  reviews: Review[] = [];
  showAllReviews: boolean = false;

  // Paleta de avatares (derivada del teal del proyecto + acentos)
  private readonly avatarColors: string[] = [
    '#0d5959', '#137a7a', '#2a9d8f', '#e76f51', '#6a4c93', '#3d5a80'
  ];

  ngOnInit(): void {
    this.loadExtendedData();
    this.toggleBodyScroll(this.isOpen);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['professional'] && changes['professional'].currentValue) {
      this.showAllReviews = false;
      this.loadExtendedData();
    }

    if (changes['isOpen']) {
      this.toggleBodyScroll(this.isOpen);
    }
  }

  ngOnDestroy(): void {
    // Siempre devolver el scroll al fondo al destruir el componente
    this.toggleBodyScroll(false);
  }

  /** Cerrar con la tecla Esc */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  /** Bloquea / libera el scroll de la página de fondo */
  private toggleBodyScroll(lock: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  loadExtendedData(): void {
    if (!this.professional) return;

    // Simular datos extendidos según la especialidad
    this.description = this.getDescription(this.professional.specialty);
    this.services = this.getServices(this.professional.specialty);
    this.reviews = this.getReviews();
  }

  getDescription(specialty: string): string {
    const descriptions: { [key: string]: string } = {
      'Electricista Residencial': 'Electricista especializado en instalaciones y reparaciones eléctricas residenciales. Orientado a brindar soluciones seguras y de calidad.',
      'Mecánico Residencial': 'Mecánico experto en reparación y mantenimiento de vehículos. Servicio profesional y garantizado.',
      'Carpintero Residencial': 'Carpintero con amplia experiencia en diseño y fabricación de muebles a medida. Trabajo de alta calidad.',
      'Chef Residencial': 'Chef profesional especializado en comida casera y eventos. Menús personalizados y saludables.',
      'Tecn. Sistemas Residencial': 'Técnico en sistemas con experiencia en reparación de computadores, redes y soporte técnico.'
    };
    return descriptions[specialty] || 'Profesional verificado con amplia experiencia en su área.';
  }

  getServices(specialty: string): string[] {
    const serviceMap: { [key: string]: string[] } = {
      'Electricista Residencial': [
        'Instalaciones eléctricas',
        'Reparación de cortocircuitos',
        'Cambio de tomacorrientes',
        'Instalación de iluminación'
      ],
      'Mecánico Residencial': [
        'Cambio de aceite',
        'Revisión de frenos',
        'Diagnóstico electrónico',
        'Mantenimiento preventivo'
      ],
      'Carpintero Residencial': [
        'Fabricación de muebles',
        'Reparación de puertas',
        'Instalación de closets',
        'Trabajos en madera'
      ],
      'Chef Residencial': [
        'Comida casera',
        'Eventos especiales',
        'Menús personalizados',
        'Asesoría nutricional'
      ],
      'Tecn. Sistemas Residencial': [
        'Reparación de computadores',
        'Instalación de software',
        'Configuración de redes',
        'Soporte técnico remoto'
      ]
    };
    return serviceMap[specialty] || ['Servicio profesional', 'Atención personalizada'];
  }

  getReviews(): Review[] {
    return [
      {
        id: '1',
        clientName: 'María G.',
        rating: 5,
        comment: 'Excelente servicio, muy profesional y puntual.',
        date: '2024-11-10'
      },
      {
        id: '2',
        clientName: 'Carlos R.',
        rating: 4,
        comment: 'Buen trabajo, aunque llegó un poco tarde.',
        date: '2024-11-05'
      },
      {
        id: '3',
        clientName: 'Ana M.',
        rating: 5,
        comment: 'Súper recomendado, resolvió todo muy rápido.',
        date: '2024-10-28'
      }
    ];
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }

  onRequestService(): void {
    if (this.professional) {
      this.requestService.emit(this.professional);
    }
  }

  toggleReviews(): void {
    this.showAllReviews = !this.showAllReviews;
  }

  /** 1 = estrella llena, 0 = vacía (redondea 4.5 → 5, 4.4 → 4) */
  getStarsArray(rating: number): number[] {
    const rounded = Math.round(rating);
    return Array(5).fill(0).map((_, i) => (i < rounded ? 1 : 0));
  }

  /** Distribución de calificaciones para las barras (5★ → 1★) */
  getRatingDistribution(): RatingRow[] {
    const total = this.reviews.length || 1;
    return [5, 4, 3, 2, 1].map(stars => {
      const count = this.reviews.filter(r => Math.round(r.rating) === stars).length;
      return { stars, count, percent: (count / total) * 100 };
    });
  }

  /** Color estable por nombre para el avatar */
  getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }
}