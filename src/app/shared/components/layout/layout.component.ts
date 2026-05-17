import { Component, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);

  user = this.auth.currentUser;
  tenant = this.auth.currentTenant;
  isSuperAdmin = this.auth.isSuperAdmin;

  userInitial = computed(() => this.user()?.name?.charAt(0).toUpperCase() || 'U');

  // Señal de nuevo usuario
  showProfileTip = signal(false);

  ngOnInit(): void {
    this.checkNewUserTip();
  }

  navItems = computed<{
    path: string;
    icon: string;
    label: string;
    badge?: string;
  }[]>(() => {
    const tenant = this.tenant();
    const modules = tenant?.enabledModules || {};
    const role = this.user()?.role || ''; // 👈 Obtenemos el rol actual del usuario

    // 1. Menú para Superadmin de la plataforma
    if (this.isSuperAdmin()) {
      return [
        // { path: '/dashboard', icon: 'assets/icons/dashboard.svg', label: 'Dashboard' },
        { path: '/admin',     icon: 'assets/icons/admina.svg', label: 'Panel Admin' },
        // { path: '/settings',  icon: 'assets/icons/setting.svg', label: 'Configuración' },
      ];
    }

    // 2. Filtro estricto por Roles del Negocio
    if (role === 'cashier') {
      // 🛒 Cajero: Solo ventas y clientes (si el módulo de clientes está activo)
      return [
        { path: '/sales', icon: 'assets/icons/sales.svg', label: 'Ventas' },
        ...(modules['customers'] ? [{ path: '/customers', icon: 'assets/icons/customer.svg', label: 'Clientes' }] : [])
      ];
    }

    if (role === 'warehouse') {
      // 📦 Bodega: Solo inventario y proveedores (si el módulo está activo)
      return [
        { path: '/inventory', icon: 'assets/icons/inventory.svg', label: 'Inventario' },
        ...(modules['suppliers'] ? [{ path: '/suppliers', icon: 'assets/icons/supplier.svg', label: 'Proveedores' }] : [])
      ];
    }

    // 3. Menú completo para Admin y Supervisor (Se muestran todas las pestañas habilitadas)
    // Nota: El bloqueo de escritura para el 'supervisor' se maneja dentro de cada vista, no en el menú.
    const fullMenu = [
      { path: '/dashboard', icon: 'assets/icons/dashboard.svg', label: 'Dashboard' },
      { path: '/inventory', icon: 'assets/icons/inventory.svg', label: 'Inventario' },
      { path: '/sales',     icon: 'assets/icons/sales.svg', label: 'Ventas' },
      { path: '/expenses',  icon: 'assets/icons/expenses.svg', label: 'Gastos' },
      ...(modules['customers']  ? [{ path: '/customers',  icon: 'assets/icons/customer.svg', label: 'Clientes' }]  : []),
      ...(modules['suppliers']  ? [{ path: '/suppliers',  icon: 'assets/icons/supplier.svg', label: 'Proveedores' }] : []),
      ...(modules['reports']    ? [{ path: '/reports',    icon: 'assets/icons/reports.svg', label: 'Reportes' }]   : []),
    ];

    // Solo el rol administrador tiene acceso a la pestaña de configuración del negocio
    if (role === 'admin') {
      fullMenu.push({ path: '/audit', icon: 'assets/icons/history.svg', label: 'Historial' });
      fullMenu.push({ path: '/settings', icon: 'assets/icons/setting.svg', label: 'Configuración' });
    }

    return fullMenu;
  });

  businessTypes: Record<string, string> = {
    bakery: 'Panadería', pastry: 'Repostería', hardware: 'Ferretería',
    restaurant: 'Restaurante', boutique: 'Boutique', grocery: 'Tienda',
    pharmacy: 'Farmacia', services: 'Servicios', other: 'Negocio',
  };

  constructor(private auth: AuthService
    
  ) {}

  getBusinessTypeLabel(): string {
    return this.businessTypes[this.tenant()?.businessType || ''] || '';
  }

  getRoleLabel(): string {
    const roles: Record<string, string> = {
      superadmin: 'Super Admin', admin: 'Administrador',
      cashier: 'Cajero', warehouse: 'Bodega', supervisor: 'Supervisor',
    };
    return roles[this.user()?.role || ''] || '';
  }

  getLogoUrl(url: string): string {
    return url || '';
  }

  // Checar nuevo usuario
  checkNewUserTip(): void {
    const tenant = this.tenant();
    if (!tenant) return;

    // Solo mostrar si no tiene logo y no ha visto el tip antes
    const tipSeen = localStorage.getItem(`tip_profile_${tenant.id}`);
    if (tipSeen || tenant.logoUrl) return;

    // Mostrar después de 3 segundos
    setTimeout(() => {
      this.showProfileTip.set(true);
      // Auto-ocultar después de 8 segundos
      setTimeout(() => this.dismissTip(), 8000);
    }, 3000);
  }

  dismissTip(): void {
    const tenant = this.tenant();
    if (tenant) localStorage.setItem(`tip_profile_${tenant.id}`, 'true');
    this.showProfileTip.set(false);
  }

  logout(): void { this.auth.logout(); }
}
