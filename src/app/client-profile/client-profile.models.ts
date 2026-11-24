/**
 * Modelos para el perfil del cliente
 */

export interface ClientProfile {
  clientId: string;
  name: string;
  phone: string;
  email: string;
  photo: string;
  address: string; // Una sola dirección, campo de texto simple
  createdAt: Date;
  updatedAt: Date;
}

export const CLIENT_PROFILE_ROUTE = '/perfil';

/**
 * Validaciones puras reutilizables
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (name.trim().length > 60) {
    return { valid: false, error: 'El nombre no puede tener más de 60 caracteres' };
  }
  return { valid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'El teléfono es obligatorio' };
  }
  
  // Extraer solo dígitos
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length !== 10) {
    return { valid: false, error: 'El teléfono debe tener 10 dígitos' };
  }
  
  if (!digits.startsWith('3')) {
    return { valid: false, error: 'El teléfono debe comenzar con 3' };
  }
  
  return { valid: true };
}

export function formatPhone(phone: string): string {
  // Guardar solo dígitos
  return phone.replace(/\D/g, '');
}

export function displayPhone(phone: string): string {
  // Mostrar con formato: 300 123 4567
  if (phone.length === 10) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: true }; // Email es opcional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'El correo no es válido' };
  }
  
  return { valid: true };
}

export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { valid: true }; // Dirección es opcional
  }
  if (address.trim().length < 5) {
    return { valid: false, error: 'La dirección debe tener al menos 5 caracteres' };
  }
  if (address.trim().length > 200) {
    return { valid: false, error: 'La dirección no puede tener más de 200 caracteres' };
  }
  return { valid: true };
}

/**
 * Verifica si un nombre es un nombre de invitado generado automáticamente
 */
export function isGuestName(name: string): boolean {
  return /^Cliente \d{4}$/.test(name);
}
