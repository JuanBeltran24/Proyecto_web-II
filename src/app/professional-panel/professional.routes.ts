import { Routes } from '@angular/router';
import { professionalGuard } from './professional-session.service';
import { ProfessionalShellComponent } from './professional-shell/professional-shell.component';
import { ProfessionalDashboardComponent } from './professional-dashboard/professional-dashboard.component';
import { ProfessionalRequestsComponent } from './professional-requests/professional-requests.component';
import { ProfessionalProfileComponent } from './professional-profile/professional-profile.component';

export const PROFESSIONAL_ROUTES: Routes = [
  {
    path: '',
    component: ProfessionalShellComponent,
    canActivate: [professionalGuard],
    children: [
      {
        path: '',
        redirectTo: 'solicitudes',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: ProfessionalDashboardComponent
      },
      {
        path: 'solicitudes',
        component: ProfessionalRequestsComponent
      },
      {
        path: 'perfil',
        component: ProfessionalProfileComponent
      }
    ]
  }
];
