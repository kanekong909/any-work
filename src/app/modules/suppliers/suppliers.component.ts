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

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = { limit: 50 };
    if (this.search) params.search = this.search;
    this.api.getSuppliers(params).subscribe(r => { this.suppliers.set(r.items); this.total.set(r.total); });
  }

  onSearch(): void { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 300); }

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
    obs.subscribe({ next: () => { this.load(); this.closeModal(); this.saving.set(false); this.showToast('Proveedor guardado'); }, error: () => this.saving.set(false) });
  }

  confirmDelete(): void {
    this.api.deleteSupplier(this.toDelete()!).subscribe(() => { this.load(); this.toDelete.set(null); this.showToast('Proveedor eliminado'); });
  }

  showToast(msg: string): void { this.toast.set(msg); setTimeout(() => this.toast.set(''), 3000); }

  parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }
}