import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service'; // Ajusta la ruta exacta
import { ToastService } from '../../core/services/toast.service'; // Ajusta la ruta exacta

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css' 
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  logs = signal<any[]>([]);

  ngOnInit() {
    this.api.getAuditLogs().subscribe({
      next: (data) => this.logs.set(data),
      error: () => this.toast.error('Error', 'No se pudo cargar el historial de movimientos.')
    });
  }

  getModuleLabel(mod: string): string {
    const modules: Record<string, string> = {
      users: 'Personal', sales: 'Ventas', inventory: 'Inventario', 
      customers: 'Clientes', suppliers: 'Proveedores', auth: 'Sesión'
    };
    return modules[mod] || mod;
  }
}
