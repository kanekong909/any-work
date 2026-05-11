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

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = { limit: 50 };
    if (this.search) params.search = this.search;
    this.api.getCustomers(params).subscribe(r => { this.customers.set(r.items); this.total.set(r.total); });
  }

  onSearch(): void { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 300); }

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
    obs.subscribe({ next: () => { this.load(); this.closeModal(); this.saving.set(false); this.showToast('Cliente guardado'); }, error: () => this.saving.set(false) });
  }

  confirmDelete(): void {
    this.api.deleteCustomer(this.toDelete()!).subscribe(() => { this.load(); this.toDelete.set(null); this.showToast('Cliente eliminado'); });
  }

  showToast(msg: string): void { this.toast.set(msg); setTimeout(() => this.toast.set(''), 3000); }
}