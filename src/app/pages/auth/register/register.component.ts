import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  showPassword = false;
  showConfirmPassword = false;

  formData = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordsMismatch(): boolean {
    return (
      !!this.formData.confirmPassword &&
      this.formData.password !== this.formData.confirmPassword
    );
  }

  isFormValid(): boolean {
    return !!(
      this.formData.fullName &&
      this.formData.email &&
      this.formData.password &&
      this.formData.confirmPassword &&
      this.formData.password === this.formData.confirmPassword &&
      this.formData.acceptTerms
    );
  }

  onRegister(): void {
    if (this.isFormValid()) {
      console.log('Registrando usuario:', this.formData);
      // this.authService.register(this.formData).subscribe(...)
    }
  }
}