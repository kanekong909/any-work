import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { ToastComponent } from '@shared/components/toast/toast.component';

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

  // Paginación Proveedores
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = () => Math.ceil(this.totalItems() / this.itemsPerPage());
  pageSizeOptions = [10, 25, 50, 100];

  // Paginación para Recepciones
  receiptsCurrentPage = signal(1);
  receiptsItemsPerPage = signal(10);
  receiptsTotalItems = signal(0);
  receiptsTotalPages = () => Math.ceil(this.receiptsTotalItems() / this.receiptsItemsPerPage());

  // Tab Suppliers | Receipts
  activeTab = signal<'suppliers' | 'receipts'>('suppliers');
  receipts = signal<any[]>([]);
  showReceiptModal = signal(false);
  savingReceipt = signal(false);
  toDeleteReceipt = signal<string | null>(null);
  receiptForm: any = { supplierId: '', invoiceNumber: '', status: 'complete', notes: '', items: [] };

  // Edicion
  editingReceipt = signal<any>(null);

  // Buscador recepciones
  receiptsSearch = '';
  private receiptsSearchTimer: any;

  constructor(private api: ApiService) {}
  ngOnInit(): void { 
    this.load();
  }
  switchTab(tab: 'suppliers' | 'receipts') {
    this.activeTab.set(tab);
    if (tab === 'receipts' && this.receipts().length === 0) {
      this.loadReceipts();
    }
  }

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

  // PAGINACION PROVEEDORES
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

  // PAGINACION RECEPCIONES
  receiptsGoToPage(page: number): void {
      if (page < 1 || page > this.receiptsTotalPages()) return;
      this.receiptsCurrentPage.set(page);
      this.loadReceipts();
  }
  receiptsPreviousPage(): void {
      if (this.receiptsCurrentPage() > 1) {
          this.receiptsCurrentPage.update(page => page - 1);
          this.loadReceipts();
      }
  }
  receiptsNextPage(): void {
      if (this.receiptsCurrentPage() < this.receiptsTotalPages()) {
          this.receiptsCurrentPage.update(page => page + 1);
          this.loadReceipts();
      }
  }
  receiptsChangePageSize(size: number): void {
      this.receiptsItemsPerPage.set(size);
      this.receiptsCurrentPage.set(1);
      this.loadReceipts();
  }
  receiptsGetPageNumbers(): number[] {
      const total = this.receiptsTotalPages();
      const current = this.receiptsCurrentPage();
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
     console.log('Cargando con search:', this.receiptsSearch); // ← Para depurar
      const params: any = {
          limit: this.receiptsItemsPerPage(),
          page: this.receiptsCurrentPage()
      };
      
      // Agregar búsqueda si tiene valor
      if (this.receiptsSearch) {
          params.search = this.receiptsSearch;
      }

      console.log('Parámetros enviados a la API:', params); // ← Ver qué se envía
      
      this.api.getReceipts(params).subscribe(r => {
          console.log('RESPUESTA COMPLETA:', r); // ← Ver toda la respuesta
        console.log('Items recibidos:', r.items);
        console.log('Total:', r.total);
        console.log('Cantidad de items:', r.items?.length);
          // Limpiar cantidades de items existentes
          const cleanedReceipts = r.items.map((receipt: any) => ({
              ...receipt,
              items: receipt.items.map((item: any) => ({
                  ...item,
                  quantity: Math.floor(Number(item.quantity)), // Convierte 2.000 a 2
                  unitCost: Math.floor(Number(item.unitCost)) // Convierte 80000.00 a 80000
              }))
          }));
          
          this.receipts.set(cleanedReceipts);
          this.receiptsTotalItems.set(r.total || r.items?.length || 0);
      });
  }
  // Edicion recepcion
  openReceiptModal(r?: any): void {
    if (r) {
      this.editingReceipt.set(r);
      this.receiptForm = {
        supplierId: r.supplierId || '',
        invoiceNumber: r.invoiceNumber || '',
        status: r.status || 'complete',
        notes: r.notes || '',
        items: r.items.map((i: any) => ({ ...i })),
      };
    } else {
      this.editingReceipt.set(null);
      this.receiptForm = { supplierId: '', invoiceNumber: '', status: 'complete', notes: '', items: [] };
    }
    this.showReceiptModal.set(true);
  }

  closeReceiptModal(): void { this.showReceiptModal.set(false); }

  addReceiptItem(): void {
    this.receiptForm.items = [...this.receiptForm.items, {
        productName: '', 
        quantity: 0, 
        unit: 'unit', 
        unitCost: 0, 
        condition: 'bueno', 
        notes: ''
    }];
  }

  removeReceiptItem(index: number): void {
    this.receiptForm.items = this.receiptForm.items.filter((_: any, i: number) => i !== index);
  }

  saveReceipt(): void {
    if (!this.receiptForm.items.length) {
      this.toastService.error('Error', 'Agrega al menos un producto.');
      return;
    }
    const invalidItem = this.receiptForm.items.find((i: any) => !i.productName.trim());
    if (invalidItem) {
      this.toastService.error('Error', 'Todos los productos deben tener nombre.');
      return;
    }
    this.savingReceipt.set(true);

    const obs = this.editingReceipt()
      ? this.api.updateReceipt(this.editingReceipt().id, this.receiptForm)
      : this.api.createReceipt(this.receiptForm);

    obs.subscribe({
      next: () => {
        this.loadReceipts();
        this.closeReceiptModal();
        this.savingReceipt.set(false);
        this.toastService.success(
          this.editingReceipt() ? 'Recepción actualizada' : 'Recepción registrada',
          'Operación completada correctamente.'
        );
      },
      error: (err) => {
        this.savingReceipt.set(false);
        this.toastService.error('Error', err.error?.message || 'Error al guardar.');
      }
    });
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
      let value = event.target.value;
      
      // Elimina cualquier cosa que no sea número (incluyendo puntos y comas)
      let cleanValue = value.toString().replace(/[^0-9]/g, '');
      
      // Convierte a número entero
      let finalValue = cleanValue ? parseInt(cleanValue, 10) : 0;
      
      // Si el valor tiene punto decimal (ej: "2.000"), tomar solo la parte entera
      if (value.toString().includes('.')) {
          const parts = value.toString().split('.');
          finalValue = parseInt(parts[0], 10) || 0;
      }
      
      // Sincroniza el estado interno del formulario
      this.receiptForm.items[index].quantity = finalValue;
      
      // Actualiza el input mostrando solo el número entero
      event.target.value = finalValue;
  }
  formatQuantity(quantity: number): string {
    return Math.floor(quantity).toString();
  }
  parseToInt(value: any): number {
    return parseInt(value, 10) || 0;
  }

  // COSTO 80000.00 A 80.000
  formatUnitCost(value: number | string): string {
      if (!value) return '0';
      // Convertir a número y redondear a entero
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '0';
      // Formatear con separadores de miles (formato colombiano: punto como separador de miles)
      return Math.floor(numValue).toLocaleString('es-CO');
  }
  cleanUnitCost(value: string): number {
      if (!value) return 0;
      // Eliminar puntos y comas, solo números
      const cleanValue = value.replace(/[^0-9]/g, '');
      // Convertir a número entero
      const numValue = parseInt(cleanValue, 10);
      return isNaN(numValue) ? 0 : numValue;
  }
  onUnitCostInput(event: any, index: number): void {
      let rawValue = event.target.value;
      
      // Limpiar el valor a número entero
      const cleanNumber = this.cleanUnitCost(rawValue);
      
      // Guardar el número limpio en el formulario
      this.receiptForm.items[index].unitCost = cleanNumber;
      
      // Actualizar el input con el valor formateado
      event.target.value = this.formatUnitCost(cleanNumber);
  }

  // Calcular cantidad total de items en una recepción
  getTotalQuantity(items: any[]): number {
      if (!items || items.length === 0) return 0;
      return items.reduce((total, item) => total + (item.quantity || 0), 0);
  }
  // Calcular valor total de una recepción
  getTotalValue(items: any[]): string {
      if (!items || items.length === 0) return '0';
      const total = items.reduce((sum, item) => {
          const quantity = item.quantity || 0;
          const unitCost = item.unitCost || 0;
          return sum + (quantity * unitCost);
      }, 0);
      // Formatear con separadores de miles
      return Math.floor(total).toLocaleString('es-CO');
  }

  // Buscar recepciones
  onReceiptsSearch(): void {
     console.log('Buscando:', this.receiptsSearch); // ← Para depurar
      this.receiptsCurrentPage.set(1);
      clearTimeout(this.receiptsSearchTimer);
      this.receiptsSearchTimer = setTimeout(() => this.loadReceipts(), 300);
  }
  onReceiptsSearchInput(event: any): void {
      this.receiptsSearch = event.target.value;
      this.receiptsCurrentPage.set(1);
      clearTimeout(this.receiptsSearchTimer);
      this.receiptsSearchTimer = setTimeout(() => this.loadReceipts(), 300);
  }
  clearReceiptsSearch(): void {
      this.receiptsSearch = '';
      this.onReceiptsSearch();
  }
} 