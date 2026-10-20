import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showPassword = false;

  formData = {
    email: '',
    password: ''
  };

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  isFormValid(): boolean {
    return !!(this.formData.email && this.formData.password);
  }

  onLogin(): void {
    if (this.isFormValid()) {
      console.log('Iniciando sesión:', this.formData);
      // this.authService.login(this.formData).subscribe(...)
    }
  }

  onGoogle(): void {
    console.log('Continuar con Google');
    // this.authService.loginWithGoogle();
  }

  onApple(): void {
    console.log('Continuar con Apple');
    // this.authService.loginWithApple();
  }
}