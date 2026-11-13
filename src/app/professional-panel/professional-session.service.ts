import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { toProfessionalKey } from '../components/professional-chat/chat-store.service';

// Rutas
export const PROFESSIONAL_BASE = '/profesional';

// TODO: Ajustar esta ruta a tu ruta real de login de profesional
export const PROFESSIONAL_LOGIN_ROUTE = '/login-profesional';

// Modo demo: permite entrar sin login usando DEMO_PROFESSIONAL
export const ENABLE_DEMO_FALLBACK = true;

/**
 * IMPORTANTE: El 'name' debe coincidir EXACTAMENTE con el nombre de una tarjeta
 * de profesional del lado usuario (se compara con toProfessionalKey).
 * 
 * Por ejemplo, si tienes una tarjeta con nombre "Carlos Pérez", usar ese mismo nombre aquí.
 */
export const DEMO_PROFESSIONAL = {
  name: 'Juan Pérez', // Este debe coincidir con el nombre de tu tarjeta
  specialty: 'Electricista Residencial',
  photo: '/img/tarjetas/persona1.png'
};

const SESSION_KEY = 'ahc_pro_session_v1';

export interface ProfessionalSession {
  key: string;
  name: string;
  photo: string;
  specialty: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfessionalSessionService {
  private sessionSubject = new BehaviorSubject<ProfessionalSession | null>(null);
  
  session$: Observable<ProfessionalSession | null> = this.sessionSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  get current(): ProfessionalSession | null {
    return this.sessionSubject.value;
  }

  /**
   * Inicia sesión como profesional
   */
  login(params: { name: string; specialty: string; photo?: string }): void {
    const session: ProfessionalSession = {
      key: toProfessionalKey(params.name),
      name: params.name,
      specialty: params.specialty,
      photo: params.photo || ''
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Error guardando sesión:', e);
    }

    this.sessionSubject.next(session);
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.warn('Error eliminando sesión:', e);
    }

    this.sessionSubject.next(null);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        this.sessionSubject.next(session);
      }
    } catch (e) {
      console.warn('Error cargando sesión:', e);
    }
  }
}

/**
 * Guard para rutas del profesional
 * Si hay sesión, deja pasar
 * Si no hay y ENABLE_DEMO_FALLBACK es true, hace login con DEMO_PROFESSIONAL
 * Si no, redirige a PROFESSIONAL_LOGIN_ROUTE
 */
export const professionalGuard: CanActivateFn = () => {
  const session = inject(ProfessionalSessionService);
  const router = inject(Router);

  if (session.current) {
    return true;
  }

  if (ENABLE_DEMO_FALLBACK) {
    session.login(DEMO_PROFESSIONAL);
    return true;
  }

  return router.createUrlTree([PROFESSIONAL_LOGIN_ROUTE]);
};
