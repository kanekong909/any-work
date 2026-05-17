import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { ToastComponent } from '@shared/components/toast/toast.component';
import { Toast } from 'ngx-toastr';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css'
})
export class SuppliersComponent implements OnInit {
  private toastService = inject(ToastService);

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

  // Tab Suppliers | Receipts
  activeTab = signal<'suppliers' | 'receipts'>('suppliers');
  receipts = signal<any[]>([]);
  showReceiptModal = signal(false);
  savingReceipt = signal(false);
  toDeleteReceipt = signal<string | null>(null);
  receiptForm: any = { supplierId: '', invoiceNumber: '', status: 'complete', notes: '', items: [] };

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

    if (this.form.phone) {
      const phoneForDisplay = this.formatExistingPhone(this.form.phone);
      this.form.displayPhone = phoneForDisplay;
    } else {
      this.form.displayPhone = '';
    }

    this.showModal.set(true);
  }

  
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.name) return;
    
    this.saving.set(true);
    
    // Creamos un clon del formulario para enviar los datos procesados limpios a la API
    const payload = { ...this.form };
    if (payload.phone) {
      payload.phone = this.cleanPhoneNumber(payload.phone);
    }
    // Removemos la propiedad visual para que no ensucie la petición HTTP
    delete payload.displayPhone;

    const obs = this.editing()
      ? this.api.updateSupplier(this.editing().id, payload)
      : this.api.createSupplier(payload);
      
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

  formatPhoneForDisplay(value: string): string {
    if (!value) return '';
    
    // Eliminar todo lo que no sea número
    const numbers = value.replace(/\D/g, '');
    
    // Aplicar formato Colombia: 3-3-4
    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 6) {
        return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    } else {
        return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
    }
}

  // Limpia el teléfono (solo números) para guardar en BD
  cleanPhoneNumber(phone: string): string {
      if (!phone) return '';
      return phone.replace(/\D/g, '');
  }

  // Maneja el input del teléfono en el formulario
  onPhoneInput(event: any): void {
      let rawValue = event.target.value;
      // Guardar solo números en el form (para la BD)
      const cleanNumbers = this.cleanPhoneNumber(rawValue);
      this.form.phone = cleanNumbers;
      // Actualizar el valor visual del input con formato
      event.target.value = this.formatPhoneForDisplay(cleanNumbers);
  }

  formatExistingPhone(phone: string): string {
      if (!phone) return '';
      const cleanNumbers = this.cleanPhoneNumber(phone);
      return this.formatPhoneForDisplay(cleanNumbers);
  }

  loadReceipts(): void {
    this.api.getReceipts({ limit: 50 }).subscribe(r => this.receipts.set(r.items));
  }

  openReceiptModal(): void {
    this.receiptForm = { 
      supplierId: '', 
      invoiceNumber: '', 
      status: 'complete', 
      notes: '', 
      items: [{ productName: '', quantity: 1, unit: 'kg', unitCost: 0, condition: 'bueno', notes: '' }] // Item inicial por defecto
    };
    this.showReceiptModal.set(true);
  }

  closeReceiptModal(): void { this.showReceiptModal.set(false); }

  addReceiptItem(): void {
    this.receiptForm.items = [...this.receiptForm.items, {
      productName: '', quantity: 1, unit: 'unit', unitCost: 0, condition: 'bueno', notes: ''
    }];
  }

  removeReceiptItem(index: number): void {
    this.receiptForm.items = this.receiptForm.items.filter((_: any, i: number) => i !== index);
  }

  saveReceipt(): void {
    if (!this.receiptForm.items.length) {
      this.toastService.error('Error', 'Agrega al menos un producto');
      return;
    }
    
    const invalidItem = this.receiptForm.items.find((i: any) => !i.productName.trim());
    if (invalidItem) {
      this.toastService.error('Error', 'Todos los productos deben tener nombre');
      return;
    }
    
    this.savingReceipt.set(true);
    
    const obs = this.receiptForm.id
      ? this.api.updateReceipt(this.receiptForm.id, this.receiptForm)
      : this.api.createReceipt(this.receiptForm);
      
    obs.subscribe({
      next: () => {
        this.loadReceipts();
        this.closeReceiptModal();
        this.savingReceipt.set(false);
        this.toastService.success('Éxito', this.receiptForm.id ? 'Recepción actualizada' : 'Recepción registrada');
      },
      error: (err) => {
        this.savingReceipt.set(false);
        this.toastService.error('Error', err.error?.message || 'Error al guardar');
      }
    });
  }
  editReceipt(receipt: any): void {
    this.receiptForm = {
      id: receipt.id,
      supplierId: receipt.supplierId || '',
      invoiceNumber: receipt.invoiceNumber || '',
      status: receipt.status || 'complete',
      notes: receipt.notes || '',
      items: receipt.items.map((item: any) => ({ ...item }))
    };
    this.showReceiptModal.set(true);
  }
  confirmDeleteReceipt(): void {
    this.api.deleteReceipt(this.toDeleteReceipt()!).subscribe(() => {
      this.loadReceipts();
      this.toDeleteReceipt.set(null);
      this.toastService.success('Eliminada', 'Recepción eliminada.');
    });
  }
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      complete: 'Completo', partial: 'Parcial', damaged: 'Con daños'
    };
    return labels[status] || status;
  }

  onQuantityInput(event: any, index: number): void {
    const value = event.target.value;
    // Elimina cualquier cosa que no sea un número entero
    const cleanValue = value.toString().replace(/[^0-9]/g, '');
    // Convierte a número entero base 10
    const finalValue = cleanValue ? parseInt(cleanValue, 10) : 0;
    
    // Sincroniza el estado interno del formulario
    this.receiptForm.items[index].quantity = finalValue;
    // Fuerza al input de la pantalla a mostrar el número entero limpio de inmediato
    event.target.value = finalValue;
  }
  formatQuantity(quantity: number): string {
    return Math.floor(quantity).toString();
  }
  parseToInt(value: any): number {
    return parseInt(value, 10) || 0;
  }
  onUnitCostInput(event: any, index: number): void {
    let value = event.target.value;
    
    // Permite solo números y un único punto decimal para los centavos
    let cleanValue = value.toString().replace(/[^0-9.]/g, '');
    
    // Si hay más de un punto decimal, dejamos solo el primero
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Guardamos el valor numérico en el objeto del formulario
    this.receiptForm.items[index].unitCost = cleanValue ? parseFloat(cleanValue) : 0;
    // Actualizamos la vista en tiempo real sin formatear todavía para que deje escribir decimales
    event.target.value = cleanValue;
  }

} 