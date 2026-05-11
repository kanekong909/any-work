import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard, superadminGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard'; // 👈 Importamos el nuevo Guard funcional

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth (solo si NO está logueado)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // Onboarding (logueado pero sin completar wizard)
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./modules/onboarding/onboarding.component').then(m => m.OnboardingComponent),
  },

  // App principal (layout con sidebar)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard(['admin', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard(['admin', 'warehouse', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/inventory/inventory.component').then(m => m.InventoryComponent),
      },
      {
        path: 'sales',
        canActivate: [roleGuard(['admin', 'cashier', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/sales/sales.component').then(m => m.SalesComponent),
      },
      {
        path: 'expenses',
        canActivate: [roleGuard(['admin', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/expenses/expenses.component').then(m => m.ExpensesComponent),
      },
      {
        path: 'customers',
        canActivate: [roleGuard(['admin', 'cashier', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/customers/customers.component').then(m => m.CustomersComponent),
      },
      {
        path: 'suppliers',
        canActivate: [roleGuard(['admin', 'warehouse', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/suppliers/suppliers.component').then(m => m.SuppliersComponent),
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['admin', 'supervisor'])], // 👈 Protegido
        loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard(['admin'])], // 👈 Exclusivo Admin
        loadComponent: () => import('./modules/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'audit',
        canActivate: [roleGuard(['admin'])], // 👈 Exclusivo Admin
        loadComponent: () => import('./modules/audit/audit.component').then(m => m.AuditComponent),
      },
      // Solo superadmin
      {
        path: 'admin',
        canActivate: [superadminGuard],
        loadComponent: () => import('./modules/admin/admin.component').then(m => m.AdminComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
