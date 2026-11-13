/**
 * Mapa de servicios por especialidad del profesional
 * Debe coincidir con el usado en professional-modal.component.ts
 */
export function getServicesBySpecialty(specialty: string): string[] {
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
