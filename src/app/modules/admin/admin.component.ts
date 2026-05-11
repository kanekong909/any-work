import { Component, signal, OnInit } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AdminStats, TenantSubscription, Tenant } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  stats = signal<AdminStats | null>(null);
  pendingPayments = signal<TenantSubscription[]>([]);
  tenants = signal<Tenant[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAdminStats().subscribe(s => this.stats.set(s));
    this.api.getPendingSubscriptions().subscribe(p => this.pendingPayments.set(p));
    this.api.getAdminTenants().subscribe(r => this.tenants.set(r.items));
  }

  activate(sub: TenantSubscription): void {
    const notes = prompt('Notas de activación (opcional):') || '';
    this.api.activateSubscription(sub.id, notes).subscribe(() => { alert('✅ Plan activado'); this.ngOnInit(); });
  }

  reject(sub: TenantSubscription): void {
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;
    this.api.rejectSubscription(sub.id, reason).subscribe(() => this.ngOnInit());
  }

  updateStatus(tenant: Tenant, status: string): void {
    this.api.updateTenantStatus(tenant.id, status).subscribe(() => this.ngOnInit());
  }
}
