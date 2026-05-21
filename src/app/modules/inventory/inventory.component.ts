import { Component, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Product, Category } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { ProductMovementsComponent } from './product-movements/product-movements.component';
import { StockAdjustModalComponent } from './stock-adjust-modal/stock-adjust-modal.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, ProductMovementsComponent, StockAdjustModalComponent],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css' 
})
export class InventoryComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  total = signal(0);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  productToDelete = signal<string | null>(null);
  searchQuery = '';
  selectedCategory = '';
  showLowStock = false;

  // Paginacion
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(0);
  pageSizeOptions = [10, 25, 50, 100];

  // Categorias
  showCatManager = signal(false);
  editingCat = signal<any>(null);
  editingCatName = '';
  editingCatColor = '#6366f1';
  newCatName = '';
  newCatColor = '#6366f'; // Gris por defecto
  catToDelete = signal<any>(null);
  catColors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#3b82f6','#d97706'];

  // Imagen producto
  uploadingImage = signal(false);
  previewUrl = signal<string | null>(null);
  pendingImageFile: File | null = null;
  viewingImage = signal<string | null>(null);

  // Eliminaciones masivas
  selectedIds = signal<Set<string>>(new Set());
  showBulkDelete = signal(false);

  // Stock
  showMovementsModal = signal(false);
  selectedProductForMovements = signal<Product | null>(null);
  showStockAdjustModal = signal(false);
  selectedProductForAdjust = signal<Product | null>(null);
  showLowStockReport = signal(false);
  lowStockProducts = signal<Product[]>([]);

  form: any = this.emptyForm();

  private toastService = inject(ToastService);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.api.getCategories().subscribe(c => this.categories.set(c));
  }

  // Cargar productos con filtros y paginación
  loadProducts(): void {
    this.loading.set(true);
    const params: any = { 
      page: this.currentPage(),
      limit: this.pageSize()
    };
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.showLowStock) params.lowStock = true;
    
    this.api.getProducts(params).subscribe(r => {
      this.products.set(r.items);
      this.total.set(r.total);
      this.totalPages.set(Math.ceil(r.total / this.pageSize()));
      this.loading.set(false);
    });
  }

  onSearch(): void {
    this.currentPage.set(1); 
    setTimeout(() => this.loadProducts(), 300); 
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadProducts();
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadProducts();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadProducts();
  }

  // Agrega este método después de changePageSize()
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

  openModal(p?: Product): void {
    this.editingProduct.set(p || null);
    this.form = p ? { ...p } : this.emptyForm();
    this.previewUrl.set(p?.imageUrl || null);
    this.pendingImageFile = null;
    this.showModal.set(true);
  }
  closeModal(): void { this.showModal.set(false); }

  // Crear o actualizar producto
  saveProduct(): void {
    if (!this.form.name || !this.form.salePrice) return;
    this.saving.set(true);
    
    const obs = this.editingProduct()
      ? this.api.updateProduct(this.editingProduct()!.id, this.form)
      : this.api.createProduct(this.form);

    obs.subscribe({
      next: async (saved) => {
        // Si hay imagen pendiente, subirla
        if (this.pendingImageFile) {
          await this.uploadPendingImage(saved.id);
        }
        
        // Si es un producto NUEVO y tiene stock inicial, registrar movimiento
        if (!this.editingProduct() && saved.stock > 0) {
          await this.api.addStock(saved.id, {
            quantity: saved.stock,
            unitCost: saved.costPrice,
            notes: 'Stock inicial al crear producto'
          }).toPromise();
        }
        
        this.loadProducts();
        this.closeModal();
        this.saving.set(false);
        this.toastService.success('Guardado', this.editingProduct() ? 'Producto actualizado.' : 'Producto creado.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.error('Error', err.error?.message || 'Error al guardar producto.');
      }
    });
  }

  deleteProduct(id: string): void {
    this.productToDelete.set(id);
  }

  // Confirmar eliminación
  confirmDelete(): void {
    const id = this.productToDelete();
    if (!id) return;
    this.api.deleteProduct(id).subscribe({
      next: () => {
        this.loadProducts();
        this.productToDelete.set(null);
        this.toastService.success('Eliminado', 'Producto eliminado correctamente.');
      },
      error: () => {
        this.productToDelete.set(null);
        this.toastService.error('Error', 'No se pudo eliminar el producto.');
      }
    });
  }

  formatNum(val: number | string): string {
    if (!val && val !== 0) return '';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    return num.toLocaleString('es-CO');
  }

  parseNum(val: string): number {
    // Elimina puntos de miles y reemplaza coma decimal por punto
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Formulario vacío para nuevo producto
  emptyForm() {
    return { name: '', sku: '', description: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 0, unit: 'unit', categoryId: '' };
  }

  // Crear Categoria
  createCategory(): void {
    if (!this.newCatName.trim()) return;
    this.api.createCategory({ name: this.newCatName.trim(), color: this.newCatColor })
      .subscribe({
        next: (cat) => {
          this.categories.update(cats => [...cats, cat]);
          this.form.categoryId = cat.id;
          this.newCatName = '';
          this.toastService.success('Categoría creada', `"${cat.name}" fue agregada correctamente.`);
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo crear la categoría.');
        }
      });
  }

  // Edicion categoria
  startEditCategory(cat: any): void {
    this.editingCat.set(cat);
    this.editingCatName = cat.name;
    this.editingCatColor = cat.color || '#6366f1';
  }

  saveEditCategory(): void {
    const cat = this.editingCat();
    if (!cat || !this.editingCatName.trim()) return;
    this.api.updateCategory(cat.id, { name: this.editingCatName.trim(), color: this.editingCatColor })
      .subscribe({
        next: (updated) => {
          this.categories.update(cats => cats.map(c => c.id === updated.id ? updated : c));
          this.editingCat.set(null);
          this.toastService.success('Categoría actualizada', `"${updated.name}" fue actualizada.`);
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo actualizar la categoría.');
        }
      });
  }

  deleteCategory(cat: any): void {
    this.catToDelete.set(cat);
  }

  confirmDeleteCategory(): void {
    const cat = this.catToDelete();
    if (!cat) return;
    this.api.deleteCategory(cat.id).subscribe({
      next: () => {
        this.categories.update(cats => cats.filter(c => c.id !== cat.id));
        if (this.form.categoryId === cat.id) this.form.categoryId = '';
        this.catToDelete.set(null);
        this.toastService.success('Eliminada', `Categoría "${cat.name}" eliminada.`);
      },
      error: () => {
        this.catToDelete.set(null);
        this.toastService.error('Error', 'No se pudo eliminar la categoría.');
      }
    });
  }

  // Imagen
  onImageChange(file: File): void {
    if (!file) return;
    this.pendingImageFile = file;
    // Preview local antes de subir
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async uploadPendingImage(productId: string): Promise<void> {
    if (!this.pendingImageFile) return;
    return new Promise((resolve) => {
      this.uploadingImage.set(true);
      this.api.uploadProductImage(productId, this.pendingImageFile!).subscribe({
        next: (res) => {
          this.form.imageUrl = res.imageUrl;
          this.uploadingImage.set(false);
          resolve();
        },
        error: () => {
          this.uploadingImage.set(false);
          this.toastService.error('Error', 'No se pudo subir la imagen.');
          resolve();
        }
      });
    });
  }

  // Eliminaciones masivas
  toggleSelect(id: string): void {
    const set = new Set(this.selectedIds());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selectedIds.set(set);
  }
  toggleSelectAll(): void {
    if (this.selectedIds().size === this.products().length) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.products().map(p => p.id)));
    }
  }
  isAllSelected(): boolean {
    return this.products().length > 0 && this.selectedIds().size === this.products().length;
  }
  bulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.showBulkDelete.set(false);
    
    Promise.all(ids.map(id => this.api.deleteProduct(id).toPromise()))
      .then(() => {
        this.selectedIds.set(new Set());
        this.loadProducts();
        this.toastService.success('Eliminados', `${ids.length} productos eliminados correctamente.`);
      })
      .catch(() => {
        this.toastService.error('Error', 'Ocurrió un error al eliminar algunos productos.');
      });
  }

  // STOCK MOVEMENTS AND ADJUSTMENTS
  // Ver historial de movimientos
  viewMovements(product: Product): void {
    this.selectedProductForMovements.set(product);
    this.showMovementsModal.set(true);
  }
  // Ajustar stock
  openStockAdjust(product: Product): void {
    this.selectedProductForAdjust.set(product);
    this.showStockAdjustModal.set(true);
  }
  // Cargar reporte de bajo stock
  loadLowStockReport(): void {
    this.api.getLowStockReport().subscribe({
      next: (res) => {
        this.lowStockProducts.set(res.items);
        this.showLowStockReport.set(true);
      },
      error: (err) => {
        this.toastService.error('Error', 'No se pudo cargar el reporte');
      }
    });
  }
  // Después de ajustar stock, recargar productos
  onStockAdjusted(): void {
    this.loadProducts();
    this.showStockAdjustModal.set(false);
  }
}
