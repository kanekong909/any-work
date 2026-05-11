import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css' 
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  
  logs = signal<any[]>([]);
  
  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = () => Math.ceil(this.totalItems() / this.itemsPerPage());
  pageSizeOptions = [10, 25, 50, 100];
  
  // Filtros
  filterModule = signal('');
  filterAction = signal('');
  searchTerm = signal('');
  startDate = signal('');
  endDate = signal('');
  
  private searchTimer: any;
  
  // Opciones para filtros
  modules = [
    { value: 'users', label: 'Personal' },
    { value: 'sales', label: 'Ventas' },
    { value: 'inventory', label: 'Inventario' },
    { value: 'customers', label: 'Clientes' },
    { value: 'suppliers', label: 'Proveedores' },
    { value: 'expenses', label: 'Gastos' },
    { value: 'auth', label: 'Sesión' }
  ];
  
  actions = [
    { value: 'CREATE', label: 'Creación', icon: '➕' },
    { value: 'UPDATE', label: 'Edición', icon: '📝' },
    { value: 'DELETE', label: 'Eliminación', icon: '🗑️' },
    { value: 'LOGIN', label: 'Inicio sesión', icon: '🔑' }
  ];

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs(): void {
    const params: any = {
      page: this.currentPage(),
      limit: this.itemsPerPage()
    };
    
    if (this.filterModule()) params.module = this.filterModule();
    if (this.filterAction()) params.action = this.filterAction();
    if (this.searchTerm()) params.search = this.searchTerm();
    if (this.startDate()) params.startDate = this.startDate();
    if (this.endDate()) params.endDate = this.endDate();
    
    this.api.getAuditLogs(params).subscribe({
      next: (response: any) => {
        // El backend ahora devuelve { items, total, page, limit, totalPages }
        this.logs.set(response.items || []);
        this.totalItems.set(response.total || 0);
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el historial de movimientos.');
        this.logs.set([]);
        this.totalItems.set(0);
      }
    });
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadLogs();
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadLogs();
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.currentPage.set(1);
    this.loadLogs();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  // Filtros
  onSearch(): void {
    this.currentPage.set(1);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadLogs(), 350);
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterModule.set('');
    this.filterAction.set('');
    this.searchTerm.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
    this.loadLogs();
  }

  getModuleLabel(mod: string): string {
    const module = this.modules.find(m => m.value === mod);
    return module?.label || mod;
  }

  getActionIcon(action: string): string {
    const act = this.actions.find(a => a.value === action);
    return act?.icon || '📋';
  }

  getActionLabel(action: string): string {
    const act = this.actions.find(a => a.value === action);
    return act?.label || action;
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}