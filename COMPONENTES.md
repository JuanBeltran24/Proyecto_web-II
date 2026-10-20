# Componentes de Aquí hay Camello

Este documento describe los componentes creados basados en el diseño de Figma.

## Estructura del Proyecto

```
src/app/
├── components/
│   ├── header/              # Barra de navegación principal
│   ├── hero-section/        # Sección hero de la landing page
│   └── professional-card/   # Tarjeta de profesional
├── pages/
│   ├── home/               # Página principal
│   └── auth/
│       ├── login/          # Página de inicio de sesión
│       └── register/       # Página de registro
└── styles.scss             # Estilos globales
```

## Componentes Principales

### 1. Header Component (`components/header`)
**Ubicación**: `src/app/components/header/`

**Características**:
- Logo de "Aquí hay Camello"
- Navegación principal (Inicio, Buscar Servicios, ¿Cómo funciona?, Ayuda)
- Botones de autenticación (Iniciar Sesión, Regístrate)
- Responsive con menú móvil hamburguesa
- Sticky header que se mantiene fijo al hacer scroll

**Colores extraídos**:
- Color primario: `#0d5959` (verde azulado)
- Color secundario: `#f39c12` (amarillo/naranja)
- Fondo: `#ffffff`
- Bordes: `#e0e0e0`

### 2. Hero Section Component (`components/hero-section`)
**Ubicación**: `src/app/components/hero-section/`

**Características**:
- Título principal con texto destacado en amarillo
- Buscador de servicios con dos inputs (servicio y ubicación)
- Botón de búsqueda con ícono
- Mensaje de CTA para registro
- Botones de acción (Regístrate gratis, Iniciar sesión)
- Badge de confianza flotante (Profesionales verificados)

**Elementos**:
- Input de búsqueda de servicio
- Input de ubicación con ícono de mapa
- Gradiente de fondo sutil

### 3. Professional Card Component (`components/professional-card`)
**Ubicación**: `src/app/components/professional-card/`

**Características**:
- Foto del profesional + mapa de ubicación
- Badge de distancia y tiempo de llegada
- Nombre con verificación de ID
- Estado de antecedentes
- Especialidad
- Sistema de calificación (estrellas)
- Cantidad de reviews
- Tiempo estimado de llegada
- Ubicación detallada
- Tarifa de visita con descripción
- Botón de acción para ver perfil completo

**Interfaz TypeScript**:
```typescript
interface Professional {
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
}
```

### 4. Home Component (`pages/home`)
**Ubicación**: `src/app/pages/home/`

**Características**:
- Hero section integrado
- Sección "¿Cómo Funciona?" con 4 pasos visuales
- Mapa de profesionales (placeholder)
- Filtros (Más cercanos, Mejor reputación, 100% Verificados)
- Grid de tarjetas de profesionales
- Sección dual (Para Clientes / Para Profesionales)
- Footer completo con enlaces y redes sociales

**Secciones**:
1. **Hero**: Búsqueda y CTA principal
2. **¿Cómo Funciona?**: Proceso en 4 pasos
3. **Profesionales**: Lista de profesionales con filtros
4. **Para Clientes/Profesionales**: Beneficios para cada tipo de usuario
5. **Footer**: Información corporativa y legal

### 5. Register Component (`pages/auth/register`)
**Ubicación**: `src/app/pages/auth/register/`

**Características**:
- Formulario completo de registro
- Campos: Nombre completo, Email, Teléfono (opcional), Contraseña, Confirmar contraseña
- Iconos en inputs
- Toggle de visibilidad de contraseña
- Checkbox de términos y condiciones
- Botón de registro para clientes
- Botón de registro para profesionales
- Login social (Google y Apple)
- Mensaje de seguridad
- Validación de formulario

**Validaciones**:
- Todos los campos requeridos (excepto teléfono)
- Contraseñas deben coincidir
- Aceptar términos y condiciones

### 6. Login Component (`pages/auth/login`)
**Ubicación**: `src/app/pages/auth/login/`

**Características**:
- Formulario de inicio de sesión
- Campos: Email, Contraseña
- Toggle de visibilidad de contraseña
- Link "¿Olvidaste tu contraseña?"
- Botón de inicio de sesión
- Login social (Google y Apple)
- Mensaje de seguridad
- Link a registro

## Paleta de Colores

```scss
$primary-color: #0d5959;    // Verde azulado principal
$primary-hover: #0a4848;    // Hover del primario
$secondary-color: #f39c12;  // Amarillo/naranja para acentos
$text-dark: #2c3e50;        // Texto principal
$text-gray: #666666;        // Texto secundario
$text-light: #8a8a8a;       // Placeholder text
$border-color: #e0e0e0;     // Bordes
$background-light: #f8f9fa; // Fondos claros
$white: #ffffff;            // Blanco
$success-color: #4caf50;    // Verde de éxito
$rating-star: #ffc107;      // Amarillo para estrellas
```

## Tipografía

- **Fuente principal**: 'Inter', sans-serif
- **Títulos**: Bold (700), tamaños de 48px a 20px según nivel
- **Cuerpo**: Regular (400) y Medium (500), 14px a 18px
- **Botones**: Semi-bold (600), 15px a 16px

## Espaciado y Tamaños

- **Border radius**: 8px a 12px para elementos
- **Padding de botones**: 12px 24px (normal), 14px 32px (large)
- **Inputs**: 14px 16px
- **Gaps en grids**: 16px a 40px según contexto
- **Sombras**: 
  - Cards: `0 2px 8px rgba(0, 0, 0, 0.08)`
  - Hover: `0 8px 24px rgba(0, 0, 0, 0.12)`

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 968px
- **Desktop**: > 968px

## Rutas Configuradas

- `/` - Home (Página principal)
- `/login` - Inicio de sesión
- `/register` - Registro
- `/**` - Redirige a Home

## Cómo Ejecutar

### Modo Desarrollo
```bash
npm start
# o
ng serve
```

Navega a `http://localhost:4200/`

### Compilar para Producción
```bash
npm run build
# o
ng build
```

Los archivos se generarán en `dist/aqui-hay-camello/`

## Próximos Pasos

1. **Integración con Backend**:
   - Conectar formularios de registro y login con API
   - Implementar autenticación JWT
   - Cargar profesionales desde base de datos

2. **Funcionalidades Adicionales**:
   - Implementar búsqueda real de profesionales
   - Integración de mapas (Google Maps o Mapbox)
   - Sistema de filtros funcional
   - Página de perfil de profesional
   - Sistema de reviews y calificaciones
   - Sistema de mensajería

3. **Optimizaciones**:
   - Lazy loading de módulos
   - Optimización de imágenes
   - Service Workers para PWA
   - SEO con Angular Universal

4. **Testing**:
   - Unit tests para componentes
   - E2E tests para flujos principales
   - Tests de accesibilidad

## Notas de Implementación

- Todos los componentes son **standalone** (Angular 19)
- Se usa **SCSS** para los estilos
- **FormsModule** para formularios template-driven
- **CommonModule** para directivas comunes (*ngFor, *ngIf)
- Los SVGs de iconos están inline para mayor control
- Las imágenes de profesionales usan placeholders (pravatar.cc)
- Los colores fueron extraídos exactamente del diseño de Figma

## Iconos y Assets Pendientes

Para completar la implementación, considera:
- Descargar el logo real de "Aquí hay Camello"
- Exportar iconos SVG del diseño de Figma
- Optimizar imágenes para web (WebP)
- Agregar favicon y meta tags
