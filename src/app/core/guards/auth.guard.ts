import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  const tenant = auth.currentTenant();
  if (auth.isSuperAdmin()) return router.createUrlTree(['/dashboard']);
  if (tenant && !tenant.onboardingCompleted) return router.createUrlTree(['/onboarding']);
  return router.createUrlTree(['/dashboard']);
};

export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  if (auth.isSuperAdmin()) return router.createUrlTree(['/dashboard']);
  const tenant = auth.currentTenant();
  if (tenant?.onboardingCompleted) return router.createUrlTree(['/dashboard']);
  return true;
};

export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};
