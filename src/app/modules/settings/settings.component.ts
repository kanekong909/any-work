import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Plan, TenantSubscription } from '../../core/models';
import { ToastService } from '@core/services/toast.service';
import { Subscription, interval, switchMap, takeWhile } from 'rxjs';

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#3b82f6','#06b6d4',
  '#d97706','#84cc16','#14b8a6','#f43f5e',
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css' 
})
export class SettingsComponent implements OnInit {
  colors = COLORS;
  plans = signal<Plan[]>([]);
  subscription = signal<TenantSubscription | null>(null);
  uploadingLogo = signal(false);
  alcanzoLimiteUsuarios = computed(() => {
    const sub = this.subscription();
    const listaUsuarios = this.users();
    
    // Si no hay suscripción cargada todavía, bloqueamos por seguridad
    if (!sub || !sub.plan) return true;
    
    const maxPermitidos = sub.plan.maxUsers;
    
    // Si el plan permite usuarios ilimitados (-1), nunca se alcanza el límite
    if (maxPermitidos === -1) return false;
    
    // Contamos cuántos usuarios invitados activos existen en el @for actual (excluyendo administradores si aplica)
    // Basado en tu lógica del backend, contamos los roles CASHIER, WAREHOUSE y SUPERVISOR
    const invitadosActivos = listaUsuarios.filter(u => 
      u.isActive && ['cashier', 'warehouse', 'supervisor'].includes(u.role)
    ).length;

    // Retorna verdadero si la cantidad de invitados actuales es igual o mayor a la permitida
    return invitadosActivos >= maxPermitidos;
  });
  saving = signal(false);
  savingColors = signal(false);
  showPayInfo = signal(false);
  nequiNumber = '3022311279';
  bankInfo = 'Bancolombia · Ricardo Mateo';
  whatsapp = '573022311279';
  form: any = {};
  users = signal<any[]>([]);
  showUserModal = signal(false);
  editingUser = signal<any>(null);
  userToDelete = signal<any | null>(null);
  savingUser = signal(false);
  userForm: any = {};
  tenant = this.auth.currentTenant;

  // Peligro
  showDeleteAccount = signal(false);
  deletingAccount = signal(false);
  deleteConfirmText = '';

  private pollSubscription?: Subscription;
  private isChecking = false;

  private toastService = inject(ToastService);

  constructor(private auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    const t = this.auth.currentTenant();
    if (t) this.form = {
      businessName: t.businessName, 
      city: t.city, 
      phone: t.phone, 
      taxId: t.taxId,
      primaryColor: t.primaryColor || '#6366f1', accentColor: t.accentColor || '#8b5cf6',
      colorTheme: t.colorTheme || 'light',
      logoUrl: t.logoUrl || ''
    };
    this.api.getPlans().subscribe(p => this.plans.set(p));
    this.api.getMySubscription().subscribe(s => this.subscription.set(s));
    this.loadUsers();
    this.pollSubscription?.unsubscribe();
    this.initSubscriptionCheck();
  }

  ngOnDestroy(): void {
    // 🛡️ Limpieza obligatoria para evitar fugas de memoria al salir de la pantalla
    this.pollSubscription?.unsubscribe();
  }

  initSubscriptionCheck(): void {
    // 1. Carga inicial del plan al entrar a la pantalla
    this.api.getMySubscription().subscribe((sub: any) => {
      this.subscription.set(sub);

      // 2. Si el plan está en espera de pago, activamos el rastreador automático
      if (sub && sub.status === 'pending_payment' && !this.isChecking) {
        this.startRealTimeCheck();
      }
    });
  }

  startRealTimeCheck(): void {
    this.isChecking = true;

    // Ejecuta una consulta cada 10 segundos hacia el servidor
    this.pollSubscription = interval(10000)
      .pipe(
        switchMap(() => this.api.getMySubscription()),
        // Se mantiene escuchando MIENTRAS el estado siga siendo 'pending_payment'
        takeWhile((sub) => sub && sub.status === 'pending_payment', true)
      )
      .subscribe({
        next: (sub) => {
          // 3. En el momento en que cambia a 'active' (Aprobado en backend)
          if (sub && sub.status === 'active') {
            this.subscription.set(sub);
            this.isChecking = false;
            
            // 4. LANZAR NOTIFICACIÓN TOAST INMEDIATA 🎉
            this.toastService.success(
              '¡Suscripción Activada! 🎉',
              `Tu pago ha sido verificado con éxito. Ya tienes acceso al plan ${sub.plan.displayName}.`
            );

            // 5. Refrescar la lista de usuarios para desbloquear el formulario de invitación
            this.loadUsers(); 
          }
        }
      });
  }

  setPrimary(c: string): void {
    this.form.primaryColor = c;
    document.documentElement.style.setProperty('--brand-primary', c);
  }

  saveInfo(): void {
    this.saving.set(true);
    this.api.updateTenant({
      businessName: this.form.businessName, city: this.form.city,
      phone: this.form.phone, taxId: this.form.taxId,
    }).subscribe({
      next: (t) => { this.auth.updateTenant(t); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }

  saveColors(): void {
    this.savingColors.set(true);
    this.api.updateTenant({
      primaryColor: this.form.primaryColor, accentColor: this.form.accentColor,
      colorTheme: this.form.colorTheme,
    }).subscribe({
      next: (t) => { 
        this.auth.updateTenant(t); 
        this.auth.applyTheme(t as any)
        this.savingColors.set(false); 
        this.toastService.success('Colores actualizados', 'El tema se aplicó correctamente.');
      },
      error: () => this.savingColors.set(false),
    });
  }

  previewTheme(theme: 'light' | 'dark'): void {
    const fakeTenant = { 
      ...this.auth.currentTenant()!, 
      colorTheme: theme,
      primaryColor: this.form.primaryColor,
      accentColor: this.form.accentColor,
    };
    this.auth.applyTheme(fakeTenant as any);
  }

  requestUpgrade(plan: Plan): void {
    this.api.requestUpgrade({ planId: plan.id, paymentMethod: 'nequi', amountPaid: plan.priceMonthly })
      .subscribe({
        next: () => this.showPayInfo.set(true),
        error: (err) => alert(err.error?.message),
      });
  }

  loadUsers(): void {
    this.api.getUsers().subscribe(u => this.users.set(u));
  }

  openUserModal(u?: any): void {
    this.editingUser.set(u || null);
    this.userForm = u
      ? { name: u.name, email: u.email, role: u.role, isActive: u.isActive }
      : { name: '', email: '', password: '', role: 'cashier' };
    this.showUserModal.set(true);
  }

  closeUserModal(): void { this.showUserModal.set(false); }

  // Crear usuario
  saveUser(): void {
    if (!this.userForm.name || !this.userForm.email) return;
    if (!this.editingUser() && !this.userForm.password) return;
    this.savingUser.set(true);
    
    const obs = this.editingUser()
      ? this.api.updateUser(this.editingUser().id, this.userForm)
      : this.api.createUser(this.userForm);
      
    obs.subscribe({
      next: () => {
        this.loadUsers();
        this.closeUserModal();
        this.savingUser.set(false);
        // Desencadena el mensaje de éxito usando tu servicio
        this.toastService.success('Completado', this.editingUser() ? 'Usuario actualizado.' : 'Usuario creado.');
      },
      error: (err) => {
        this.savingUser.set(false);
        const errorMsg = err.error?.message || 'Error al guardar usuario';
        // Reemplazo definitivo del alert()
        this.toastService.error('Error', errorMsg);
      }
    });
  }
  
  // Eliminar usuario
  // Al hacer clic en la papelera, guardamos el usuario temporalmente
  prepareDelete(user: any): void {
    this.userToDelete.set(user);
  }

  // Cancela la operación limpia la señal
  cancelDelete(): void {
    this.userToDelete.set(null);
  }

  // Ejecuta la petición HTTP definitiva
  confirmDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers(); 
        this.toastService.success('Eliminado', `El usuario ${user.name} ha sido eliminado.`);
        this.userToDelete.set(null); // Resetea el estado
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Error al eliminar usuario';
        this.toastService.error('Error', errorMsg);
        this.userToDelete.set(null);
      }
    });
  }

  // Traer rol
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin', admin: 'Admin',
      cashier: 'Cajero', warehouse: 'Bodega', supervisor: 'Supervisor',
    };
    return labels[role] || role;
  }

  deleteAccount(): void {
    if (this.deleteConfirmText !== 'ELIMINAR') return;
    this.deletingAccount.set(true);
    this.api.deleteTenant().subscribe({
      next: () => {
        this.auth.logout();
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Error al eliminar cuenta');
        this.deletingAccount.set(false);
      }
    });
  }

  onLogoChange(file: File): void {
    if (!file) return;
    this.uploadingLogo.set(true);
    this.api.uploadLogo(file).subscribe({
      next: (t) => {
        this.form = { ...this.form, logoUrl: t.logoUrl };
        this.auth.updateTenant(t);
        this.uploadingLogo.set(false);
        this.toastService.success('Logo actualizado', 'El logo se actualizó correctamente.');
      },
      error: (err) => {
        this.uploadingLogo.set(false);
        this.toastService.error('Error', err.error?.message || 'Error al subir imagen');
      }
    });
  }

  getLogoUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  }
}
