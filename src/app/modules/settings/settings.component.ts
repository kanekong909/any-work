import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
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
  
  users = signal<any[]>([]);
  
  tenant = this.auth.currentTenant;
  
  alcanzoLimiteUsuarios = computed(() => {
    const sub = this.subscription();
    const listaUsuarios = this.users(); 
    
    if (!sub || !sub.plan) return true;
    
    const maxPermitidos = sub.plan.maxUsers;
    
    if (maxPermitidos === -1) return false;
    
    const invitadosActivos = listaUsuarios.filter(u => 
      u.isActive && ['cashier', 'warehouse', 'supervisor'].includes(u.role)
    ).length;

    return invitadosActivos >= maxPermitidos;
  });
  
  saving = signal(false);
  savingColors = signal(false);
  showPayInfo = signal(false);
  nequiNumber = '3022311279';
  bankInfo = 'Bancolombia · Ricardo Mateo';
  whatsapp = '573022311279';
  form: any = {};
  showUserModal = signal(false);
  editingUser = signal<any>(null);
  userToDelete = signal<any | null>(null);
  savingUser = signal(false);
  userForm: any = {};

  // Peligro
  showDeleteAccount = signal(false);
  deletingAccount = signal(false);
  deleteConfirmText = '';

  private pollSubscription?: Subscription;
  private isChecking = false;

  private toastService = inject(ToastService);

  constructor(private auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    const t = this.auth.currentTenant(); // ✅ tenant() como función
    if (t) this.form = {
      businessName: t.businessName, 
      city: t.city, 
      phone: t.phone, 
      taxId: t.taxId,
      primaryColor: t.primaryColor || '#6366f1', 
      accentColor: t.accentColor || '#8b5cf6',
      colorTheme: t.colorTheme || 'light',
      logoUrl: t.logoUrl || ''
    };
    this.api.getPlans().subscribe(p => this.plans.set(p));
    this.api.getMySubscription().subscribe(s => {
      this.subscription.set(s);
    });
    this.loadUsers();
    this.pollSubscription?.unsubscribe();
    this.initSubscriptionCheck();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  initSubscriptionCheck(): void {
    this.api.getMySubscription().subscribe((sub: any) => {
      this.subscription.set(sub);

      if (sub && sub.status === 'pending_payment' && !this.isChecking) {
        this.startRealTimeCheck();
      }
    });
  }

  startRealTimeCheck(): void {
    this.isChecking = true;

    this.pollSubscription = interval(10000)
      .pipe(
        switchMap(() => this.api.getMySubscription()),
        takeWhile((sub) => sub && sub.status === 'pending_payment', true)
      )
      .subscribe({
        next: (sub) => {
          if (sub && sub.status === 'active') {
            this.subscription.set(sub);
            this.isChecking = false;
            
            this.toastService.success(
              '¡Suscripción Activada! 🎉',
              `Tu pago ha sido verificado con éxito. Ya tienes acceso al plan ${sub.plan.displayName}.`
            );

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
      businessName: this.form.businessName, 
      city: this.form.city,
      phone: this.form.phone, 
      taxId: this.form.taxId,
    }).subscribe({
      next: (t) => { 
        this.auth.updateTenant(t); 
        this.saving.set(false);
        this.toastService.success('Guardado', 'Datos actualizados correctamente.');
      },
      error: () => {
        this.saving.set(false);
        this.toastService.error('Error', 'No se pudieron guardar los datos.');
      },
    });
  }

  saveColors(): void {
    this.savingColors.set(true);
    this.api.updateTenant({
      primaryColor: this.form.primaryColor, 
      accentColor: this.form.accentColor,
      colorTheme: this.form.colorTheme,
    }).subscribe({
      next: (t) => { 
        this.auth.updateTenant(t); 
        this.auth.applyTheme(t as any);
        this.savingColors.set(false); 
        this.toastService.success('Colores actualizados', 'El tema se aplicó correctamente.');
      },
      error: () => {
        this.savingColors.set(false);
        this.toastService.error('Error', 'No se pudieron aplicar los colores.');
      },
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
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'No se pudo solicitar el upgrade');
        }
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
      
      // Pequeño delay para asegurar que el modal se haya renderizado
      setTimeout(() => {
          const modal = document.querySelector('.modal-overlay');
          if (modal) {
              modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }, 100);
  }

  closeUserModal(): void { this.showUserModal.set(false); }

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
        this.toastService.success('Completado', this.editingUser() ? 'Usuario actualizado.' : 'Usuario creado.');
      },
      error: (err) => {
        this.savingUser.set(false);
        const errorMsg = err.error?.message || 'Error al guardar usuario';
        this.toastService.error('Error', errorMsg);
      }
    });
  }
  
  prepareDelete(user: any): void {
    this.userToDelete.set(user);
  }

  cancelDelete(): void {
    this.userToDelete.set(null);
  }

  confirmDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.api.deleteUser(user.id).subscribe({
      next: (response: any) => {
        this.loadUsers(); 
        
        // Verificar si el backend devolvió que fue desactivado
        if (response.deactivated === true) {
          this.toastService.warning('Usuario Desactivado', 
            `${user.name} tiene ventas registradas y no puede eliminarse. Ha sido desactivado.`);
        } else {
          this.toastService.success('Eliminado', `El usuario ${user.name} ha sido eliminado.`);
        }
        this.userToDelete.set(null);
      },
      error: (err) => {
        // Si el error es por foreign key (tiene ventas asociadas)
        if (err.error?.message?.includes('violates foreign key') || 
            err.error?.message?.includes('foreign key constraint')) {
          
          // Intentar desactivar el usuario manualmente
          this.api.updateUser(user.id, { isActive: false }).subscribe({
            next: () => {
              this.loadUsers();
              this.toastService.warning('Usuario Desactivado', 
                `${user.name} tiene ventas asociadas. Ha sido desactivado.`);
              this.userToDelete.set(null);
            },
            error: () => {
              this.toastService.error('Error', 'No se pudo desactivar el usuario');
              this.userToDelete.set(null);
            }
          });
        } else {
          const errorMsg = err.error?.message || 'Error al eliminar usuario';
          this.toastService.error('Error', errorMsg);
          this.userToDelete.set(null);
        }
      }
    });
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin', admin: 'Administrador',
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
    return url; // Cloudinary siempre devuelve URL completa
  }
}