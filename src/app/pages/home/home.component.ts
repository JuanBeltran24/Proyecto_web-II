import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { ProfessionalCardComponent, Professional } from '../../components/professional-card/professional-card.component';
import { ProfessionalModalComponent } from '../../components/professional-modal/professional-modal.component';
import { ProfessionalChatComponent } from '../../components/professional-chat/professional-chat.component';
import { ChatLauncherService } from '../../notifications/chat-launcher.service';
import { toProfessionalKey } from '../../components/professional-chat/chat-store.service';
import { 
  NEIVA_CENTER, 
  NEIVA_AREAS, 
  PROFESSIONAL_LOCATIONS, 
  getProfessionalLocation,
  calculateDistance,
  estimateArrivalTime,
  formatArrivalTime,
  GeographicArea
} from '../../data/professional-locations';

// Configuración de tiles del mapa
// Usando OpenStreetMap estándar (gratuito, sin API key requerida)
// Para CARTO Voyager (requiere API key): https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_SUBDOMAINS = 'abc';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Tipos de Leaflet (carga dinámica)
type LeafletModule = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, HeroSectionComponent, ProfessionalCardComponent, ProfessionalModalComponent, ProfessionalChatComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;
  
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private chatLauncher = inject(ChatLauncherService);
  private L?: LeafletModule;
  private map?: LeafletMap;
  private markers: LeafletMarker[] = [];
  private userMarker?: LeafletMarker;
  selectedMarker?: LeafletMarker; // Public para el template
  
  // Estilos por especialidad
  private readonly SPECIALTY_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    'Electricista Residencial': { color: '#f59e0b', icon: '⚡', label: 'Electricista' },
    'Mecánico Residencial': { color: '#3b82f6', icon: '🔧', label: 'Mecánico' },
    'Carpintero Residencial': { color: '#a16207', icon: '🪚', label: 'Carpintero' },
    'Chef Residencial': { color: '#ef4444', icon: '🍳', label: 'Chef' },
    'Tecn. Sistemas Residencial': { color: '#8b5cf6', icon: '💻', label: 'Sistemas' }
  };
  
  professionals: Professional[] = [];
  filteredProfessionals: Professional[] = [];
  
  // Estado del usuario
  userLocation: { lat: number; lng: number } | null = null;
  isGettingLocation = false;
  locationError = '';
  
  // Filtros
  selectedSpecialty = 'Todos los servicios';
  selectedArea = 'Todas las áreas';
  specialties = [
    'Todos los servicios',
    'Electricista Residencial',
    'Mecánico Residencial',
    'Carpintero Residencial',
    'Chef Residencial',
    'Tecn. Sistemas Residencial'
  ];
  areas = NEIVA_AREAS;
  
  // Modal state
  isModalOpen: boolean = false;
  selectedProfessional: Professional | null = null;
  
  // Chat state
  isChatOpen: boolean = false;
  chatProfessional: Professional | null = null;

  isLoadingLocation = false;
  isMapInteractive = false; // Control para activar/desactivar el mapa

  constructor() {
    // Constructor vacío - eventos de popup manejados en addProfessionalMarkers
    
    // Suscribirse al servicio de lanzamiento de chat
    this.chatLauncher.launch$
      .pipe(takeUntilDestroyed())
      .subscribe(request => {
        this.handleChatLaunchRequest(request.conversationId);
      });
  }

  private specialtyStyle(specialty: string): { color: string; icon: string; label: string } {
    return this.SPECIALTY_STYLES[specialty] || { color: '#64748b', icon: '🛠️', label: specialty };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  ngOnInit(): void {
    // Datos de ejemplo de profesionales con coordenadas
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

    // Asignar coordenadas a cada profesional
    this.professionals.forEach(prof => {
      const location = getProfessionalLocation(prof.id);
      if (location) {
        prof.lat = location.lat;
        prof.lng = location.lng;
      }
    });

    // Inicialmente mostrar todos
    this.filteredProfessionals = [...this.professionals];
  }

  async ngAfterViewInit(): Promise<void> {
    // Dar tiempo al DOM para renderizarse completamente
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private async initMap(): Promise<void> {
    // Protección SSR
    if (typeof window === 'undefined' || !this.mapContainer) {
      console.log('❌ Mapa no disponible:', { window: typeof window, container: !!this.mapContainer });
      return;
    }

    console.log('✅ Iniciando mapa...');

    try {
      // Carga dinámica de Leaflet
      this.L = await import('leaflet');
      console.log('✅ Leaflet cargado');

      // Crear el mapa
      this.map = this.L.map(this.mapContainer.nativeElement, {
        center: [NEIVA_CENTER.lat, NEIVA_CENTER.lng],
        zoom: NEIVA_CENTER.zoom,
        zoomControl: true
      });
      console.log('✅ Mapa creado');

      // Posicionar controles de zoom abajo a la derecha
      this.map.zoomControl.setPosition('bottomright');

      // Tiles de OpenStreetMap estándar
      this.L.tileLayer(TILE_URL, {
        subdomains: TILE_SUBDOMAINS,
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19
      }).addTo(this.map);
      console.log('✅ Tiles agregados');

      // Desactivar el desplazamiento del mapa por defecto
      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();
      this.map.touchZoom.disable();
      this.map.doubleClickZoom.disable();
      console.log('✅ Desplazamiento del mapa desactivado por defecto');

      // Agregar leyenda
      this.addLegend();
      console.log('✅ Leyenda agregada');

      // Agregar marcadores de profesionales
      this.addProfessionalMarkers();
      console.log('✅ Marcadores agregados:', this.markers.length);

      // Invalidar tamaño después de la inicialización
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          console.log('✅ Tamaño invalidado');
        }
      }, 100);

    } catch (error) {
      console.error('❌ Error al cargar Leaflet:', error);
    }
  }

  private addLegend(): void {
    if (!this.L || !this.map) return;

    const L = this.L;
    const legend = new L.Control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      
      // Agregar cada especialidad a la leyenda
      Object.entries(this.SPECIALTY_STYLES).forEach(([specialty, style]) => {
        const item = L.DomUtil.create('div', 'legend-item', div);
        const dot = L.DomUtil.create('span', 'legend-dot', item);
        dot.style.backgroundColor = style.color;
        
        const label = L.DomUtil.create('span', 'legend-label', item);
        label.textContent = style.label;
      });

      // Deshabilitar propagación de clicks
      L.DomEvent.disableClickPropagation(div);

      return div;
    };

    legend.addTo(this.map);
  }

  private addProfessionalMarkers(): void {
    if (!this.L || !this.map) return;

    // Limpiar marcadores existentes
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    this.filteredProfessionals.forEach((prof, index) => {
      if (!prof.lat || !prof.lng || !this.L || !this.map) return;

      const style = this.specialtyStyle(prof.specialty);
      const initials = this.getInitials(prof.name);
      const photoHtml = prof.photo 
        ? `<img src="${this.escapeHtml(prof.photo)}" alt="${this.escapeHtml(prof.name)}">` 
        : this.escapeHtml(initials);

      // Delay escalonado para animación
      const animationDelay = Math.min(index, 10) * 60;

      // Crear ícono personalizado con badge de especialidad
      const icon = this.L.divIcon({
        html: `
          <div class="custom-marker">
            <div class="marker-pin" style="animation-delay: ${animationDelay}ms">
              <div class="marker-photo">${photoHtml}</div>
              <span class="marker-badge" style="background: ${style.color}">${style.icon}</span>
            </div>
          </div>
        `,
        className: '',
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -46]
      });

      // Crear marcador
      const marker = this.L.marker([prof.lat, prof.lng], { 
        icon,
        riseOnHover: true,
        title: prof.name
      }).addTo(this.map);

      // Popup dinámico
      marker.bindPopup(() => this.buildPopup(prof), {
        minWidth: 260,
        maxWidth: 280,
        autoPanPadding: [24, 24]
      });

      // Eventos del popup
      marker.on('popupopen', () => {
        this.ngZone.run(() => {
          this.setSelectedMarker(marker);
          this.highlightProfessional(prof);

          // Conectar botones del popup
          setTimeout(() => {
            const popup = marker.getPopup();
            if (popup) {
              const popupEl = popup.getElement();
              if (popupEl) {
                const profileBtn = popupEl.querySelector('[data-action="profile"]');
                const requestBtn = popupEl.querySelector('[data-action="request"]');

                if (profileBtn) {
                  profileBtn.addEventListener('click', () => {
                    this.ngZone.run(() => {
                      marker.closePopup();
                      this.openModal(prof);
                    });
                  });
                }

                if (requestBtn) {
                  requestBtn.addEventListener('click', () => {
                    this.ngZone.run(() => {
                      marker.closePopup();
                      this.handleRequestService(prof);
                    });
                  });
                }
              }
            }
          }, 10);
        });
      });

      marker.on('popupclose', () => {
        this.ngZone.run(() => {
          if (this.selectedMarker === marker) {
            this.setSelectedMarker(undefined);
          }
        });
      });

      this.markers.push(marker);
    });
  }

  private buildPopup(prof: Professional): string {
    const style = this.specialtyStyle(prof.specialty);
    const initials = this.getInitials(prof.name);
    
    const photoHtml = prof.photo 
      ? `<div class="popup-photo"><img src="${this.escapeHtml(prof.photo)}" alt="${this.escapeHtml(prof.name)}"></div>`
      : `<div class="popup-photo popup-photo-initials">${this.escapeHtml(initials)}</div>`;

    const verifiedBadge = prof.isVerified 
      ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" class="popup-verified">
           <circle cx="10" cy="10" r="9" fill="#10b981"/>
           <path d="M6 10l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`
      : '';

    // Solo mostrar distancia si hay ubicación del usuario
    const distanceStat = this.userLocation 
      ? `<span class="popup-stat">📍 ${prof.distance} km</span>`
      : '';

    return `
      <div class="popup-cover">
        <div class="popup-chip" style="background: ${style.color}">
          ${style.icon} ${this.escapeHtml(style.label)}
        </div>
        ${photoHtml}
      </div>
      <div class="popup-body">
        <h3>
          ${this.escapeHtml(prof.name)}
          ${verifiedBadge}
        </h3>
        <div class="popup-specialty">${this.escapeHtml(prof.specialty)}</div>
        <div class="popup-stats">
          <span class="popup-stat">⭐ ${prof.rating} (${prof.reviewCount})</span>
          <span class="popup-stat">🕒 ${this.escapeHtml(prof.arrivalTime)}</span>
          ${distanceStat}
        </div>
        <div class="popup-rate">Desde <strong>${this.escapeHtml(prof.visitRate)}</strong></div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-secondary" data-action="profile">Ver perfil</button>
          <button class="popup-btn" data-action="request">Solicitar</button>
        </div>
      </div>
    `;
  }

  private setSelectedMarker(marker?: LeafletMarker): void {
    if (!this.L) return;

    // Quitar selección del anterior
    if (this.selectedMarker) {
      const prevIcon = this.selectedMarker.getElement();
      if (prevIcon) {
        prevIcon.classList.remove('is-selected');
      }
      this.selectedMarker.setZIndexOffset(0);
    }

    // Marcar el nuevo
    this.selectedMarker = marker;
    if (marker) {
      const icon = marker.getElement();
      if (icon) {
        icon.classList.add('is-selected');
      }
      marker.setZIndexOffset(1000);
    }
  }

  toggleMapInteraction(): void {
    this.isMapInteractive = !this.isMapInteractive;
    
    if (this.map) {
      if (this.isMapInteractive) {
        // Activar el mapa
        this.map.dragging.enable();
        this.map.scrollWheelZoom.enable();
        this.map.touchZoom.enable();
        this.map.doubleClickZoom.enable();
      } else {
        // Desactivar el mapa
        this.map.dragging.disable();
        this.map.scrollWheelZoom.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
      }
    }
  }

  private getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  private highlightProfessional(prof: Professional): void {
    // Scroll a la tarjeta en la lista
    const cardElement = document.getElementById(`prof-${prof.id}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Filtros
  applyFilters(): void {
    this.filteredProfessionals = this.professionals.filter(prof => {
      // Filtro por especialidad
      const matchesSpecialty = this.selectedSpecialty === 'Todos los servicios' || 
                               prof.specialty === this.selectedSpecialty;

      // Filtro por área
      let matchesArea = true;
      if (this.selectedArea !== 'Todas las áreas') {
        const location = getProfessionalLocation(prof.id);
        matchesArea = location?.area === this.selectedArea;
      }

      return matchesSpecialty && matchesArea;
    });

    // Actualizar marcadores en el mapa
    this.addProfessionalMarkers();

    // Ajustar vista del mapa
    this.fitMapToResults();
  }

  private fitMapToResults(): void {
    if (!this.map || !this.L || this.filteredProfessionals.length === 0) return;

    const bounds = this.L.latLngBounds(
      this.filteredProfessionals
        .filter(p => p.lat && p.lng)
        .map(p => [p.lat!, p.lng!])
    );

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  clearFilters(): void {
    this.selectedSpecialty = 'Todos los servicios';
    this.selectedArea = 'Todas las áreas';
    this.applyFilters();
  }

  // Mi ubicación
  async getMyLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocalización no disponible en tu navegador';
      return;
    }

    this.isGettingLocation = true;
    this.locationError = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.isGettingLocation = false;

          // Centrar mapa en la ubicación del usuario
          if (this.map) {
            this.map.flyTo([this.userLocation.lat, this.userLocation.lng], 14, {
              duration: 1.5
            });

            // Agregar marcador del usuario
            this.addUserMarker();

            // Actualizar distancias
            this.updateDistances();
          }
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.isGettingLocation = false;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.locationError = 'Permiso de ubicación denegado';
              break;
            case error.POSITION_UNAVAILABLE:
              this.locationError = 'Ubicación no disponible';
              break;
            case error.TIMEOUT:
              this.locationError = 'Tiempo de espera agotado';
              break;
            default:
              this.locationError = 'Error al obtener ubicación';
          }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  private addUserMarker(): void {
    if (!this.L || !this.map || !this.userLocation) return;

    // Remover marcador anterior si existe
    if (this.userMarker) {
      this.userMarker.remove();
    }

    // Crear ícono del usuario con label "Tú"
    const icon = this.L.divIcon({
      html: `
        <div class="user-marker">
          <span class="user-marker-label">Tú</span>
          <div class="user-marker-dot"></div>
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    this.userMarker = this.L.marker([this.userLocation.lat, this.userLocation.lng], { 
      icon,
      zIndexOffset: 500
    })
      .addTo(this.map)
      .bindPopup('Tu ubicación');

    // Agregar círculo de precisión
    this.L.circle([this.userLocation.lat, this.userLocation.lng], {
      radius: 100,
      color: '#0d5959',
      fillColor: '#0d5959',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(this.map);
  }

  private updateDistances(): void {
    if (!this.userLocation) return;

    this.professionals.forEach(prof => {
      if (prof.lat && prof.lng) {
        const distance = calculateDistance(
          this.userLocation!.lat,
          this.userLocation!.lng,
          prof.lat,
          prof.lng
        );
        prof.distance = distance;

        const arrivalMinutes = estimateArrivalTime(distance);
        prof.arrivalTime = formatArrivalTime(arrivalMinutes);
      }
    });

    // Ordenar por cercanía
    this.filteredProfessionals.sort((a, b) => a.distance - b.distance);
  }

  selectProfessionalFromList(prof: Professional): void {
    if (!this.map || !prof.lat || !prof.lng) return;

    // Centrar mapa en el profesional
    this.map.flyTo([prof.lat, prof.lng], 16, { duration: 1 });

    // Encontrar y seleccionar el marcador
    const marker = this.markers.find(m => {
      const latLng = m.getLatLng();
      return latLng.lat === prof.lat && latLng.lng === prof.lng;
    });

    if (marker) {
      this.setSelectedMarker(marker);
      marker.openPopup();
    }
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

  /**
   * Maneja solicitud de abrir chat desde notificaciones.
   * Busca el profesional por conversationId (nombre normalizado).
   */
  private handleChatLaunchRequest(conversationId: string): void {
    // Buscar profesional cuyo nombre normalizado coincida con el conversationId
    const professional = this.professionals.find(p => {
      const normalizedName = toProfessionalKey(p.name);
      // El conversationId tiene formato: clientId__professionalKey
      // Extraer la parte del profesional
      const parts = conversationId.split('__');
      const professionalKey = parts.length > 1 ? parts[1] : conversationId;
      return normalizedName === professionalKey;
    });

    if (professional) {
      this.handleRequestService(professional);
    } else {
      console.warn('No se encontró profesional para conversationId:', conversationId);
    }
  }

  closeChat(): void {
    this.isChatOpen = false;
    this.chatProfessional = null;
    document.body.style.overflow = ''; // Restaurar scroll
  }
}