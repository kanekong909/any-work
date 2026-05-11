import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent) },
      { 
        path: 'forgot-password', 
        loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) 
      },
      { 
        path: 'reset-password', 
        loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent) 
      },
    ]
  }
];
