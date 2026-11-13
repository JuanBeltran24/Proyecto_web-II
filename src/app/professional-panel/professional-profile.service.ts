import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProfessionalSessionService } from './professional-session.service';
import { getServicesBySpecialty } from '../components/professional-chat/professional-services';

export interface ProfessionalProfile {
  description: string;
  visitRate: string;
  coverage: string;
  availability: string;
  language: string;
  experience: number;
  services: string[];
  available: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfessionalProfileService {
  private sessionService = inject(ProfessionalSessionService);
  private profileSubject = new BehaviorSubject<ProfessionalProfile | null>(null);
  
  profile$: Observable<ProfessionalProfile | null> = this.profileSubject.asObservable();

  constructor() {
    // Cargar perfil cuando cambia la sesión
    this.sessionService.session$.subscribe(session => {
      if (session) {
        this.loadProfile(session.key, session.specialty);
      } else {
        this.profileSubject.next(null);
      }
    });
  }

  get snapshot(): ProfessionalProfile | null {
    return this.profileSubject.value;
  }

  /**
   * Guarda el perfil
   */
  save(profile: ProfessionalProfile): void {
    const session = this.sessionService.current;
    if (!session) return;

    const key = `ahc_pro_profile_v1_${session.key}`;
    
    try {
      localStorage.setItem(key, JSON.stringify(profile));
      this.profileSubject.next(profile);
    } catch (e) {
      console.warn('Error guardando perfil:', e);
    }
  }

  /**
   * Cambia el estado de disponibilidad
   */
  setAvailable(available: boolean): void {
    const profile = this.profileSubject.value;
    if (!profile) return;

    this.save({ ...profile, available });
  }

  private loadProfile(professionalKey: string, specialty: string): void {
    const key = `ahc_pro_profile_v1_${professionalKey}`;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        this.profileSubject.next(JSON.parse(stored));
        return;
      }
    } catch (e) {
      console.warn('Error cargando perfil:', e);
    }

    // Crear perfil por defecto
    const defaultProfile: ProfessionalProfile = {
      description: `Profesional especializado en ${specialty}. Orientado a brindar soluciones de calidad.`,
      visitRate: '$30.000',
      coverage: 'Neiva y alrededores',
      availability: 'Lunes a sábado',
      language: 'Español',
      experience: 5,
      services: getServicesBySpecialty(specialty),
      available: true
    };

    this.profileSubject.next(defaultProfile);
  }
}
