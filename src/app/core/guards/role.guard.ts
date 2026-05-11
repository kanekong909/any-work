import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Ajusta tu ruta

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser(); // Asumiendo que expone un Signal

    const role = user?.role || '';

    // Si el rol del usuario está en la lista permitida, da acceso
    if (allowedRoles.includes(role) || authService.isSuperAdmin?.()) {
      return true;
    }

    // Si no tiene permiso, redirige a su pantalla principal según su rol
    const redirects: Record<string, string> = {
      cashier: '/sales',
      warehouse: '/inventory',
      supervisor: '/dashboard',
      admin: '/dashboard'
    };

    router.navigate([redirects[role] || '/dashboard']);
    return false;
  };
};
