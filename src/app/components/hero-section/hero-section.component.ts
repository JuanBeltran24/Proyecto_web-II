import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  imports: [FormsModule, RouterLink],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css'
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  // Imágenes en public/img/
  slides: string[] = [
    '/img/hero.png',
    '/img/hero2.png',
    '/img/hero3.png'
  ];

  current = signal(0);

  searchService = '';
  searchLocation = '';

  private readonly intervalMs = 10000; // tiempo entre imágenes (ms)
  private timer?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ---------- Carrusel ----------
  go(index: number): void {
    const total = this.slides.length;
    this.current.set((index + total) % total);
  }

  next(): void {
    this.go(this.current() + 1);
  }

  prev(): void {
    this.go(this.current() - 1);
  }

  // Si el usuario usa flechas o puntos, se reinicia el temporizador
  onNext(): void { this.next(); this.start(); }
  onPrev(): void { this.prev(); this.start(); }
  onDot(index: number): void { this.go(index); this.start(); }

  // Automático siempre: no se pausa por mouse, teclado ni preferencias del sistema
  private start(): void {
    this.stop();
    if (this.slides.length < 2) return;
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ---------- Búsqueda ----------
  onSearch(): void {
    const queryParams: Record<string, string> = {};
    if (this.searchService.trim()) queryParams['servicio'] = this.searchService.trim();
    if (this.searchLocation.trim()) queryParams['ubicacion'] = this.searchLocation.trim();
    this.router.navigate(['/buscar'], { queryParams });
  }
}