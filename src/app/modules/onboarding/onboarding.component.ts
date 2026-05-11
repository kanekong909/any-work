import { Component, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const BUSINESS_TYPES = [
  { value: 'bakery',      label: 'Panadería',      icon: '🍞', color: '#d97706' },
  { value: 'pastry',      label: 'Repostería',      icon: '🎂', color: '#ec4899' },
  { value: 'hardware',    label: 'Ferretería',      icon: '🔧', color: '#6b7280' },
  { value: 'restaurant',  label: 'Restaurante',     icon: '🍽️', color: '#ef4444' },
  { value: 'boutique',    label: 'Boutique / Ropa', icon: '👗', color: '#8b5cf6' },
  { value: 'grocery',     label: 'Tienda / Abarrotes', icon: '🛒', color: '#10b981' },
  { value: 'pharmacy',    label: 'Farmacia',        icon: '💊', color: '#3b82f6' },
  { value: 'services',    label: 'Servicios',       icon: '🛠️', color: '#f59e0b' },
  { value: 'other',       label: 'Otro negocio',    icon: '🏪', color: '#6366f1' },
];

const MODULES = [
  { key: 'sales',      label: 'Ventas / Caja',    icon: '💰', desc: 'Registro de ventas y cierre de caja' },
  { key: 'inventory',  label: 'Inventario',        icon: '📦', desc: 'Productos, stock y alertas' },
  { key: 'expenses',   label: 'Gastos',            icon: '📋', desc: 'Control de egresos y costos' },
  { key: 'customers',  label: 'Clientes',          icon: '👥', desc: 'Historial y datos de clientes' },
  { key: 'suppliers',  label: 'Proveedores',       icon: '🚚', desc: 'Contactos y órdenes de compra' },
  { key: 'reports',    label: 'Reportes',          icon: '📊', desc: 'Gráficas y reportes en PDF' },
];

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#3b82f6','#06b6d4',
  '#d97706','#84cc16','#14b8a6','#f43f5e',
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.css'
})
export class OnboardingComponent implements OnInit {
  businessTypes = BUSINESS_TYPES;
  modules = MODULES;
  colorPalette = COLORS;
  totalSteps = 6;

  teamOptions = [
    { value: 'solo',   icon: '👤', label: 'Solo yo',       desc: 'Soy el único usuario' },
    { value: 'small',  icon: '👥', label: '2 a 5 personas', desc: 'Cajero, bodega u otro rol' },
    { value: 'medium', icon: '🏢', label: 'Más de 5',       desc: 'Múltiples sucursales o áreas' },
  ];

  currentStep = signal(1);
  selectedBusinessType = signal('');
  selectedModules = signal(new Set(['sales', 'inventory', 'expenses']));
  primaryColor = signal('#6366f1');
  accentColor = signal('#8b5cf6');
  colorTheme = signal<'light' | 'dark'>('light');
  teamSize = signal('solo');
  loading = signal(false);

  progressPct = computed(() => ((this.currentStep() - 1) / (this.totalSteps - 1)) * 100);

  infoForm = this.fb.group({
    businessName: [''],
    city: [''],
    phone: [''],
    taxId: [''],
  });

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const tenant = this.auth.currentTenant();
    if (tenant) {
      this.infoForm.patchValue({ businessName: tenant.businessName });
      if (tenant.primaryColor) this.primaryColor.set(tenant.primaryColor);
      if (tenant.accentColor) this.accentColor.set(tenant.accentColor);
      if (tenant.businessType && tenant.businessType !== 'other' && (tenant.onboardingStep ?? 1) > 1) {
        this.selectedBusinessType.set(tenant.businessType);
      }
    }
  }

  selectBusinessType(val: string): void { this.selectedBusinessType.set(val); }
  toggleModule(key: string): void {
    const set = new Set(this.selectedModules());
    set.has(key) ? set.delete(key) : set.add(key);
    this.selectedModules.set(set);
  }
  setPrimaryColor(c: string): void {
    this.primaryColor.set(c);
    document.documentElement.style.setProperty('--brand-primary', c);
  }
  setAccentColor(c: string): void {
    this.accentColor.set(c);
    document.documentElement.style.setProperty('--brand-accent', c);
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) return !!this.selectedBusinessType();
    if (this.currentStep() === 3) return this.selectedModules().size > 0;
    return true;
  }

  nextStep(): void {
    if (!this.canProceed()) return;
    this.saveCurrentStep();
    this.currentStep.update(s => s + 1);
  }
  prevStep(): void { this.currentStep.update(s => s - 1); }

  private saveCurrentStep(): void {
    const step = this.currentStep();
    const modulesObj: Record<string, boolean> = {};
    this.modules.forEach(m => modulesObj[m.key] = this.selectedModules().has(m.key));

    const dataMap: Record<number, any> = {
      1: { businessType: this.selectedBusinessType() },
      2: this.infoForm.value,
      3: { enabledModules: modulesObj },
      4: { primaryColor: this.primaryColor(), accentColor: this.accentColor(), colorTheme: this.colorTheme() },
      5: {},
    };
    this.api.saveOnboardingStep(step, dataMap[step] || {}).subscribe();
  }

  finish(): void {
    this.loading.set(true);
    const modulesObj: Record<string, boolean> = {};
    this.modules.forEach(m => modulesObj[m.key] = this.selectedModules().has(m.key));
    this.api.saveOnboardingStep(6, {}).subscribe({
      next: () => {
       this.auth.updateTenant({
          onboardingCompleted: true,
          primaryColor: this.primaryColor(),
          accentColor: this.accentColor(),
          colorTheme: this.colorTheme(),
          businessType: this.selectedBusinessType() as any,
          enabledModules: modulesObj,
        });
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getBusinessTypeLabel(): string {
    return this.businessTypes.find(b => b.value === this.selectedBusinessType())?.label || 'No definido';
  }
}
