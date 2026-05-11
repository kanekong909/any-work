import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './customers.component.html',  
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit {
  customers = signal<any[]>([]);
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
    
    this.api.getCustomers(params).subscribe(r => { 
      this.customers.set(r.items); 
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

  openModal(c?: any): void {
    this.editing.set(c || null);
    this.form = c ? { ...c } : { name: '', phone: '', email: '', address: '', notes: '' };
    this.showModal.set(true);
  }
  
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.name) return;
    this.saving.set(true);
    const obs = this.editing()
      ? this.api.updateCustomer(this.editing().id, this.form)
      : this.api.createCustomer(this.form);
    obs.subscribe({ 
      next: () => { 
        this.load(); 
        this.closeModal(); 
        this.saving.set(false); 
        this.showToast('Cliente guardado'); 
      }, 
      error: () => this.saving.set(false) 
    });
  }

  confirmDelete(): void {
    this.api.deleteCustomer(this.toDelete()!).subscribe(() => { 
      this.load(); 
      this.toDelete.set(null); 
      this.showToast('Cliente eliminado'); 
    });
  }

  showToast(msg: string): void { 
    this.toast.set(msg); 
    setTimeout(() => this.toast.set(''), 3000); 
  }

  formatLocalDate(dateString: string): string {
    if (!dateString) return '-';
    
    // Si la fecha viene en formato YYYY-MM-DD HH:MM:SS.ms
    if (dateString.includes(' ')) {
      const [datePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    // Si viene solo la fecha YYYY-MM-DD
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    // Fallback para otros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('es', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}