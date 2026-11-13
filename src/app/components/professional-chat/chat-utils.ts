/**
 * Utilidades puras para manejo de fechas y formato
 */

/**
 * Convierte una fecha a formato ISO local (yyyy-mm-dd)
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea una fecha ISO (yyyy-mm-dd) a Date local
 */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formatea una fecha en formato largo español
 * Ejemplo: "Viernes 13 de noviembre"
 */
export function formatLongDate(date: Date): string {
  const formatted = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  
  // Primera letra en mayúscula
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formatea una hora HH:mm a formato 12h con "a. m." / "p. m."
 * Ejemplo: "14:30" -> "2:30 p. m."
 */
export function formatTime12(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const period = isPM ? 'p. m.' : 'a. m.';
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
