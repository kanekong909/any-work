import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
// import { ToastComponent } from '@shared/components/toast/toast.component';
import { Product, Sale } from '../../core/models';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    FormsModule, 
    CurrencyPipe, 
    DatePipe, 
    DecimalPipe, 
    // ToastComponent
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css' 
})
export class SalesComponent implements OnInit {
  private toast = inject(ToastService);

  // Busqueda
  searchTerm = signal('');
  startDate = signal('');
  endDate = signal('');

  // Estado de paginacion
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = () => Math.ceil(this.totalItems() / this.itemsPerPage());
  pageSizeOptions = [10, 20, 50, 100];

  private salesSearchTimer: any;

  sales = signal<Sale[]>([]);
  todayRevenue = signal(0);
  showPOS = signal(false);
  saving = signal(false);
  cart = signal<any[]>([]);
  searchResults = signal<Product[]>([]);
  productSearch = '';
  discount = 0;
  paymentType = 'cash';
  customerName = '';
  private searchTimer: any;
  showCartError = signal(false);

  // Productos suggested
  suggestedProducts = signal<Product[]>([]);
  selectedPosCategory = signal<string>('');
  categories = signal<any[]>([]);

  // Editar & Eliminar
  saleToDelete = signal<string | null>(null);
  saleToEdit = signal<Sale | null>(null);
  editForm: any = {};
  savingEdit = signal(false);

  // Propiedades de control para la busqueda de clientes
  customerSearch = signal('');
  customerSearchResults = signal<any[]>([]);
  selectedCustomer = signal<any | null>(null);
  private customerSearchTimer: any;

  payLabels: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', nequi: 'Nequi',
    transfer: 'Transferencia', credit: 'Fiar',
  };

  subtotal = () => this.cart().reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void { 
    this.loadSales(); 
    this.api.getSalesSummary().subscribe(s => this.todayRevenue.set(s.today?.revenue || 0));
  }

  loadSales(): void {
    const queryParams: any = {
      limit: this.itemsPerPage(),
      page: this.currentPage(), 
    };

    if (this.searchTerm().trim()) {
      queryParams.search = this.searchTerm().trim();
    }
    if (this.startDate()) {
      queryParams.startDate = this.startDate();
    }
    if (this.endDate()) {
      queryParams.endDate = this.endDate();
    }

    this.api.getSales(queryParams).subscribe({
      next: (r: any) => {
        console.log('Respuesta del backend', r);
        this.sales.set(r.items || []);
        this.totalItems.set(r.total || r.items?.length || 0);

        // Verifica que estos valores sean correctos
        console.log('totalItems:', this.totalItems());
        console.log('itemsPerPage:', this.itemsPerPage());
        console.log('totalPages calculado:', Math.ceil(this.totalItems() / this.itemsPerPage()));
      },
      error: () => {
        this.sales.set([]);
        this.totalItems.set(0);
      }
    });
  }

  // Métodos reactivos para los filtros de la barra superior
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1); 
    
    clearTimeout(this.salesSearchTimer);
    this.salesSearchTimer = setTimeout(() => {
      this.loadSales();
    }, 350); // Espera 350ms antes de disparar la petición
  }

  // Agrega después del método goToPage()
  changePageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.currentPage.set(1);
    this.loadSales();
  }

  // Agrega después de changePageSize()
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

  onDateFilterChange(): void {
    this.currentPage.set(1);
    this.loadSales();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
    this.loadSales();
  }

  // Métodos para controlar el cambio de páginas
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadSales();
    }
  }

  searchProducts(): void {
    clearTimeout(this.searchTimer);
    if (!this.productSearch.trim()) { this.searchResults.set([]); return; }
    this.searchTimer = setTimeout(() => {
      this.api.getProducts({ search: this.productSearch, limit: 6 }).subscribe(r => {
        this.searchResults.set(r.items.filter(p => p.stock > 0));
      });
    }, 250);
  }

  addToCart(product: Product): void {
    const existing = this.cart().find(i => i.productId === product.id);
    if (existing) {
      this.cart.update(c => c.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      this.cart.update(c => [...c, {
        productId: product.id, productName: product.name,
        unitPrice: product.salePrice, quantity: 1,
      }]);
    }
    this.productSearch = '';
    this.searchResults.set([]);
  }

  updateQty(item: any, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty <= 0) { this.removeFromCart(item.productId); return; }
    this.cart.update(c => c.map(i => i.productId === item.productId
      ? { ...i, quantity: newQty } : i));
  }

  removeFromCart(productId: string): void {
    this.cart.update(c => c.filter(i => i.productId !== productId));
  }

  openPOS(): void {
    this.cart.set([]); 
    this.discount = 0;
    this.paymentType = 'cash'; 
    this.customerName = '';
    this.customerSearch.set('');
    this.customerSearchResults.set([]);
    this.selectedCustomer.set(null); 
    this.showPOS.set(true);
    this.loadSuggestedProducts();
    this.api.getCategories().subscribe(c => this.categories.set(c));
  }
  closePOS(): void { this.showPOS.set(false); }

  // 3. NUEVO MÉTODO: Buscar clientes registrados de forma reactiva mediante la API
  searchCustomers(): void {
    clearTimeout(this.customerSearchTimer);
    const query = this.customerSearch().trim();
    
    if (!query) { 
      this.customerSearchResults.set([]); 
      return; 
    }
    
    this.customerSearchTimer = setTimeout(() => {
      // Reutiliza tu ApiService inyectando el filtro de texto
      this.api.getCustomers({ search: query, limit: 5 }).subscribe({
        next: (res: any) => {
          // Adaptado asumiendo que tu endpoint responde con { items: [] } o un array directo
          const items = res.items || res;
          this.customerSearchResults.set(items.filter((c: any) => c.isActive));
        },
        error: () => this.customerSearchResults.set([])
      });
    }, 250);
  }

  // 4. NUEVO MÉTODO: Seleccionar un cliente de la lista desplegable
  selectCustomer(customer: any): void {
    this.selectedCustomer.set(customer);
    this.customerName = customer.name; // Almacena el nombre para mantener compatibilidad con el backend
    this.customerSearch.set(customer.name); // Muestra el nombre en el input
    this.customerSearchResults.set([]); // Cierra el desplegable
  }

  // 5. NUEVO MÉTODO: Limpiar el cliente seleccionado si desea cambiarlo
  clearSelectedCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerName = '';
    this.customerSearch.set('');
    this.customerSearchResults.set([]);
  }

  completeSale(): void {
    if (!this.cart().length) {
      this.showCartError.set(true);
      setTimeout(() => this.showCartError.set(false), 3000);
      return;
    }
    this.showCartError.set(false);
    this.saving.set(true);
    
    this.api.createSale({
      items: this.cart(),
      paymentType: this.paymentType,
      discount: this.discount,
      customerName: this.customerName || undefined,
    }).subscribe({
      next: () => { 
        this.loadSales(); 
        this.closePOS(); 
        this.saving.set(false); 
        this.toast.success('Venta Exitosa', 'La transacción fue guardada y el inventario actualizado.');
      },
      error: (err) => {
        this.saving.set(false);
        if (err.error?.code === 'SALES_LIMIT_REACHED') {
          this.toast.error('Límite de ventas', err.error.message);
        } else {
          this.toast.error('Error en POS', err.error?.message || 'Error al procesar la venta');
        }
      }
    });
  }

  getPayLabel(type: string): string { return this.payLabels[type] || type; }

  openEdit(sale: Sale): void {
    this.saleToEdit.set(sale);
    this.editForm = {
      customerName: sale.customerName || '',
      paymentType: sale.paymentType,
      notes: sale.notes || '',
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      items: sale.items.map(i => ({ ...i }))
    };
  }

  saveEdit(): void {
    const sale = this.saleToEdit();
    if (!sale) return;
    this.savingEdit.set(true);
    this.api.updateSale(sale.id, {
      customerName: this.editForm.customerName,
      paymentType: this.editForm.paymentType,
      notes: this.editForm.notes,
      discount: this.editForm.discount,
      items: this.editForm.items,
    }).subscribe({
      next: () => {
        this.loadSales();
        this.saleToEdit.set(null);
        this.savingEdit.set(false);
        this.toast.success('Actualizado', 'Venta actualizada correctamente.');
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.toast.error('Error', err.error?.message || 'Error al actualizar.');
      }
    });
  }

  confirmDeleteSale(): void {
    const id = this.saleToDelete();
    if (!id) return;
    this.api.deleteSale(id).subscribe({
      next: () => {
        this.loadSales();
        this.saleToDelete.set(null);
        this.toast.success('Eliminada', 'La venta fue eliminada.');
      },
      error: (err) => {
        this.saleToDelete.set(null);
        this.toast.error('Error', err.error?.message || 'Error al eliminar.');
      }
    });
  }

  formatCOP(val: number): string {
    if (!val && val !== 0) return '';
    return Number(val).toLocaleString('es-CO');
  }

  parseCOP(val: string): number {
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  onDiscountChange(val: string): void {
    this.editForm = { ...this.editForm, discount: this.parseCOP(val) };
  }

  // PRODUCTOS
  updateEditQty(index: number, delta: number): void {
    const items = [...this.editForm.items];
    const newQty = Number(items[index].quantity) + delta;
    if (newQty <= 0) {
      items.splice(index, 1);
    } else {
      items[index] = {
        ...items[index],
        quantity: newQty,
        subtotal: newQty * items[index].unitPrice,
      };
    }
    // Recalcular subtotal
    const subtotal = items.reduce((a: number, i: any) => a + Number(i.unitPrice) * Number(i.quantity), 0);
    this.editForm = { ...this.editForm, items, subtotal };
  }
  removeEditItem(index: number): void {
    const items = [...this.editForm.items];
    items.splice(index, 1);
    const subtotal = items.reduce((a: number, i: any) => a + Number(i.unitPrice) * Number(i.quantity), 0);
    this.editForm = { ...this.editForm, items, subtotal };
  }
  loadSuggestedProducts(): void {
    const params: any = { limit: 12 };
    if (this.selectedPosCategory()) params.categoryId = this.selectedPosCategory();
    this.api.getProducts(params).subscribe(r => {
      this.suggestedProducts.set(r.items.filter((p: Product) => p.stock > 0));
    });
  }

  // FORMATEAR FECHA - 14 de mayo de 2027
  formatDateLong(dateString: string): string {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
      });
  }

  // SABER QUIEN INGRESO LA VENTA
  isAdmin(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'superadmin';
  }
  isCurrentUser(cashierId: string): boolean {
    return cashierId === this.auth.currentUser()?.id;
  }
  getCashierColor(name: string): string {
    if (!name) return '#6366f1';
    const colors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#3b82f6','#d97706'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
