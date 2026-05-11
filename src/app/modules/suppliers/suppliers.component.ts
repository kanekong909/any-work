import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css'
})
export class SuppliersComponent implements OnInit {
  suppliers = signal<any[]>([]);
  total = signal(0);
  showModal = signal(false);
  editing = signal<any>(null);
  saving = signal(false);
  toDelete = signal<string | null>(null);
  toast = signal('');
  search = '';
  form: any = {};
  private searchTimer: any;

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = () => Math.ceil(this.totalItems() / this.itemsPerPage());
  pageSizeOptions = [10, 25, 50, 100];

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = { 
      limit: this.itemsPerPage(),
      page: this.currentPage()
    };
    if (this.search) params.search = this.search;
    
    this.api.getSuppliers(params).subscribe(r => { 
      this.suppliers.set(r.items); 
      this.total.set(r.total);
      this.totalItems.set(r.total || r.items?.length || 0);
    });
  }

  onSearch(): void { 
    this.currentPage.set(1);
    clearTimeout(this.searchTimer); 
    this.searchTimer = setTimeout(() => this.load(), 300); 
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.load();
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.currentPage.set(1);
    this.load();
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

  openModal(s?: any): void {
    this.editing.set(s || null);
    this.form = s ? { ...s } : { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' };
    this.showModal.set(true);
  }
  
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.name) return;
    this.saving.set(true);
    const obs = this.editing()
      ? this.api.updateSupplier(this.editing().id, this.form)
      : this.api.createSupplier(this.form);
    obs.subscribe({ 
      next: () => { 
        this.load(); 
        this.closeModal(); 
        this.saving.set(false); 
        this.showToast('Proveedor guardado'); 
      }, 
      error: () => this.saving.set(false) 
    });
  }

  confirmDelete(): void {
    this.api.deleteSupplier(this.toDelete()!).subscribe(() => { 
      this.load(); 
      this.toDelete.set(null); 
      this.showToast('Proveedor eliminado'); 
    });
  }

  showToast(msg: string): void { 
    this.toast.set(msg); 
    setTimeout(() => this.toast.set(''), 3000); 
  }

  parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  // Método para formatear fecha local (para la tabla)
  formatLocalDate(dateString: string): string {
    if (!dateString) return '-';
    
    if (dateString.includes(' ')) {
      const [datePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('es', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}