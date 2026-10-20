import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-professional',
  imports: [CommonModule, FormsModule],
  templateUrl: './register-professional.component.html',
  styleUrl: './register-professional.component.css'
})
export class RegisterProfessionalComponent {
  showPassword = false;
  showConfirmPassword = false;

  formData = {
    // Información Personal
    fullName: '',
    email: '',
    phone: '',
    location: '',

    // Información Profesional
    profession: '',
    specialty: '',
    experience: '',
    currentCompany: '',

    // Experiencia y antecedentes
    workExperience: '',
    background: '',
    certifications: '',

    // Disponibilidad y servicios
    services: '',
    workMode: 'presencial',
    availability: '',

    // Seguridad
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

  /** True cuando el usuario ya escribió la confirmación y no coincide. */
  get passwordsMismatch(): boolean {
    return (
      !!this.formData.confirmPassword &&
      this.formData.password !== this.formData.confirmPassword
    );
  }

  isFormValid(): boolean {
    return !!(
      // Información Personal
      this.formData.fullName &&
      this.formData.email &&
      this.formData.location &&

      // Información Profesional
      this.formData.profession &&
      this.formData.specialty &&
      this.formData.experience &&

      // Seguridad
      this.formData.password &&
      this.formData.confirmPassword &&
      this.formData.password === this.formData.confirmPassword &&
      this.formData.acceptTerms
    );
  }

  onRegister(): void {
    if (this.isFormValid()) {
      console.log('Registrando profesional:', this.formData);
      // this.authService.registerProfessional(this.formData).subscribe(...)
    }
  }
}