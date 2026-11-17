/**
 * Coordenadas de ejemplo de profesionales en Neiva, Huila
 * BACKEND: Estos datos se reemplazarán por coordenadas reales desde la API
 */

export interface ProfessionalLocation {
  professionalId: string;
  name: string;
  lat: number;
  lng: number;
  area: string; // Zona geográfica
}

/**
 * Áreas de Neiva con sus coordenadas centrales
 * BACKEND: Estas áreas se cargarán desde la API según la ciudad seleccionada
 */
export interface GeographicArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

// Centro de Neiva, Huila (por ahora solo Neiva)
export const NEIVA_CENTER = {
  lat: 2.9273,
  lng: -75.2819,
  zoom: 13
};

// Áreas de Neiva para el filtro (solo Neiva por ahora)
export const NEIVA_AREAS: GeographicArea[] = [
  {
    id: 'all',
    name: 'Todas las áreas',
    lat: 2.9273,
    lng: -75.2819,
    zoom: 13  // Mismo zoom que Neiva
  },
  {
    id: 'norte',
    name: 'Zona Norte',
    lat: 2.9550,
    lng: -75.2850,
    zoom: 14
  },
  {
    id: 'sur',
    name: 'Zona Sur',
    lat: 2.9050,
    lng: -75.2850,
    zoom: 14
  },
  {
    id: 'centro',
    name: 'Centro',
    lat: 2.9273,
    lng: -75.2819,
    zoom: 15
  },
  {
    id: 'oriente',
    name: 'Zona Oriente',
    lat: 2.9300,
    lng: -75.2500,
    zoom: 14
  }
];

/**
 * Coordenadas de ejemplo de los profesionales
 * NOTA: Estas son coordenadas aproximadas distribuidas por Neiva
 * En producción vendrán del backend con la ubicación real de cada profesional
 */
export const PROFESSIONAL_LOCATIONS: ProfessionalLocation[] = [
  {
    professionalId: '1',
    name: 'Juan Pérez',
    lat: 2.9550, // Zona Norte
    lng: -75.2830,
    area: 'Zona Norte'
  },
  {
    professionalId: '2',
    name: 'María Paz',
    lat: 2.9050, // Zona Sur
    lng: -75.2820,
    area: 'Zona Sur'
  },
  {
    professionalId: '3',
    name: 'David Roa',
    lat: 2.9320, // Zona Oriente
    lng: -75.2520,
    area: 'Zona Oriente'
  },
  {
    professionalId: '4',
    name: 'Daniel Villa',
    lat: 2.9600, // Zona Norte (otro punto)
    lng: -75.2880,
    area: 'Zona Norte'
  },
  {
    professionalId: '5',
    name: 'Sofía Acost',
    lat: 2.9000, // Zona Sur (otro punto)
    lng: -75.2900,
    area: 'Zona Sur'
  },
  {
    professionalId: '6',
    name: 'Julian Peña',
    lat: 2.9350, // Zona Oriente (otro punto)
    lng: -75.2450,
    area: 'Zona Oriente'
  }
];

/**
 * Obtiene las coordenadas de un profesional por su ID
 */
export function getProfessionalLocation(professionalId: string): ProfessionalLocation | undefined {
  return PROFESSIONAL_LOCATIONS.find(loc => loc.professionalId === professionalId);
}

/**
 * Obtiene todos los profesionales de un área específica
 */
export function getProfessionalsByArea(areaName: string): ProfessionalLocation[] {
  if (areaName === 'Todas las áreas') {
    return PROFESSIONAL_LOCATIONS;
  }
  return PROFESSIONAL_LOCATIONS.filter(loc => loc.area === areaName);
}

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @returns Distancia en kilómetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Redondear a 1 decimal
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estima el tiempo de llegada basado en la distancia
 * Asume una velocidad promedio de 20 km/h en ciudad
 * @returns Tiempo estimado en minutos
 */
export function estimateArrivalTime(distanceKm: number): number {
  const AVERAGE_SPEED_KMH = 20;
  const timeInHours = distanceKm / AVERAGE_SPEED_KMH;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  // Añadir un mínimo de 5 minutos (preparación)
  return Math.max(5, timeInMinutes);
}

/**
 * Formatea el tiempo de llegada para mostrar
 */
export function formatArrivalTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
