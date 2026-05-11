import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Expense, ExpenseCategory } from '../../core/models';
import { ToastService } from '@core/services/toast.service';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: 'Insumos', utilities: 'Servicios públicos', rent: 'Arriendo',
  salary: 'Nómina', transport: 'Transporte', maintenance: 'Mantenimiento',
  marketing: 'Publicidad', other: 'Otro',
};

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  // ── INYECCIÓN DE SERVICIOS MODERNOS ────────────────────────────────
  toast = inject(ToastService);

  expenses = signal<any[]>([]);
  sum = signal(0);
  showModal = signal(false);
  saving = signal(false);

  // Señales añadidadas para manejar edición y eliminación de gastos
  editingExpenseId = signal<string | null>(null);
  expenseToDelete = signal<string | null>(null);

   // 🚚 SEÑALES NUEVAS PARA EL BUSCADOR DE PROVEEDORES
  supplierSearch = signal('');
  supplierResults = signal<any[]>([]);
  selectedSupplier = signal<any | null>(null);
  private supplierTimer: any;

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  filterCategory = '';

  // Paginacion
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(0);
  totalPages = () => Math.ceil(this.totalItems() / this.itemsPerPage());
  pageSizeOptions = [10, 25, 50, 100];

  // Meses disponibles (solo los que tienen datos)
  availableMonths = signal<{ value: number; label: string; year: number }[]>([]);
  
  // Años disponibles (calculado a partir de los meses)
  availableYears = computed(() => {
    const years = new Set(this.availableMonths().map(m => m.year));
    return Array.from(years).sort((a, b) => b - a);
  });

  form: any = this.emptyForm();

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
  months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('es', { month: 'long' }),
  }));

  constructor(private api: ApiService) {}
  ngOnInit(): void { 
    this.loadAvailableMonths();
    // this.loadExpenses(); 
  }

  // Cargar meses disponibles desde el backend
  loadAvailableMonths(): void {
    this.api.getExpensesMonths().subscribe({
      next: (months: { month: number; year: number }[]) => {
        const monthsList = months.map(m => ({
          value: m.month,
          year: m.year,
          label: new Date(m.year, m.month - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
        }));
        this.availableMonths.set(monthsList);
        
        if (monthsList.length > 0) {
          // Verificar si el mes/año actual tiene datos
          const currentHasData = monthsList.some(m => m.value === this.filterMonth && m.year === this.filterYear);
          if (!currentHasData) {
            this.filterMonth = monthsList[0].value;
            this.filterYear = monthsList[0].year;
          }
        }
        this.loadExpenses();
      },
      error: () => {
        // Si hay error, cargar todos los meses del año actual como respaldo
        this.loadDefaultMonths();
      }
    });
  }

  // Método de respaldo
  loadDefaultMonths(): void {
    const currentYear = new Date().getFullYear();
    const monthsList = [];
    for (let i = 1; i <= 12; i++) {
      monthsList.push({
        value: i,
        year: currentYear,
        label: new Date(currentYear, i - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
      });
    }
    this.availableMonths.set(monthsList);
    this.loadExpenses();
  }

  // Cargar Gastos con paginación
  loadExpenses(): void {
    const params: any = { 
      month: this.filterMonth, 
      year: this.filterYear,
      page: this.currentPage(),
      limit: this.itemsPerPage()
    };
    if (this.filterCategory) params.category = this.filterCategory;
    
    this.api.getExpenses(params).subscribe(r => {
      console.log('Datos de gastos:', r.items);
      this.expenses.set(r.items);
      this.totalItems.set(r.total || r.items?.length || 0);
      this.sum.set(r.sum);
    });
  }

  // Cambio de mes
  onMonthChange(month: number): void {
    this.filterMonth = month;
    this.currentPage.set(1);
    this.loadExpenses();
  }

  // Cambio de año
  onYearChange(): void {
    // Filtrar meses del año seleccionado
    const year = this.filterYear;
    const monthsOfYear = this.availableMonths().filter(m => m.year === year);
    if (monthsOfYear.length > 0 && !monthsOfYear.some(m => m.value === this.filterMonth)) {
      this.filterMonth = monthsOfYear[0].value;
    }
    this.currentPage.set(1);
    this.loadExpenses();
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadExpenses();
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadExpenses();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadExpenses();
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage.set(size);
    this.currentPage.set(1);
    this.loadExpenses();
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

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadExpenses();
  }

  getCatLabel(cat: ExpenseCategory): string { return CATEGORY_LABELS[cat] || cat; }

  // Con soporte a proveedores
  openModal(expense?: any): void {
    this.supplierSearch.set('');
    this.supplierResults.set([]);
    
    if (expense) {
      this.editingExpenseId.set(expense.id);
      this.form = {
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        notes: expense.notes || '',
        supplierId: expense.supplierId || null // Asigna el ID al formulario
      };
      
      // Si el gasto ya contiene la relación de proveedor cargada desde el backend
      if (expense.supplier) {
        this.selectedSupplier.set(expense.supplier);
        this.supplierSearch.set(expense.supplier.name);
      } else {
        this.selectedSupplier.set(null);
      }
    } else {
      this.editingExpenseId.set(null);
      this.selectedSupplier.set(null);
      this.form = this.emptyForm();
    }
    this.showModal.set(true);
  }
  closeModal(): void { this.showModal.set(false); }

  // Guardar nuevo gasto
  saveExpense(): void {
    if (!this.form.description || !this.form.amount) return;
    this.saving.set(true);

    const idParaEditar = this.editingExpenseId();
    const obs = idParaEditar
      ? this.api.updateExpense(idParaEditar, this.form)
      : this.api.createExpense(this.form);

    obs.subscribe({
      next: () => {
        this.loadExpenses();
        this.closeModal();
        this.saving.set(false);
        this.toast.success(
          idParaEditar ? 'Gasto Actualizado' : 'Gasto Registrado',
          idParaEditar ? 'Los cambios se guardaron con éxito.' : 'El egreso ha sido asentado correctamente.'
        );
      },
      error: (err) => {
        this.saving.set(false);
        const errorMsg = err.error?.message || 'Error al procesar la operación';
        this.toast.error('Error', errorMsg);
      }
    });
  }
  // Eliminar gasto
  deleteExpense(id: string): void {
    if (!confirm('¿Eliminar este gasto?')) return;
    this.api.deleteExpense(id).subscribe(() => this.loadExpenses());
  }

  // 🚚 MÉTODOS DEL BUSCADOR DE PROVEEDORES
  searchSuppliers(): void {
    clearTimeout(this.supplierTimer);
    const query = this.supplierSearch().trim();
    if (!query) { this.supplierResults.set([]); return; }

    this.supplierTimer = setTimeout(() => {
      // Reutiliza tu ApiService inyectando la cadena de texto
      this.api.getSuppliers({ search: query, limit: 5 }).subscribe((res: any) => {
        const items = res.items || res;
        this.supplierResults.set(items.filter((s: any) => s.isActive));
      });
    }, 250);
  }

  selectSupplier(supplier: any): void {
    this.selectedSupplier.set(supplier);
    this.form.supplierId = supplier.id; // Guarda el ID en el cuerpo del formulario
    this.supplierSearch.set(supplier.name);
    this.supplierResults.set([]);
  }

  clearSupplier(): void {
    this.selectedSupplier.set(null);
    this.form.supplierId = null; // Remueve la llave del formulario
    this.supplierSearch.set('');
    this.supplierResults.set([]);
  }

  // Flujo reactivo de eliminación en línea integrado en la fila de la tabla
  prepareDelete(id: string): void { this.expenseToDelete.set(id); }
  cancelDelete(): void { this.expenseToDelete.set(null); }

  confirmDeleteExpense(): void {
    const id = this.expenseToDelete();
    if (!id) return;

    this.api.deleteExpense(id).subscribe({
      next: () => {
        this.loadExpenses();
        this.toast.success('Gasto Eliminado', 'El egreso fue removido del balance del mes.');
        this.expenseToDelete.set(null);
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'No se pudo eliminar el gasto';
        this.toast.error('Error', errorMsg);
        this.expenseToDelete.set(null);
      }
    });
  }

  emptyForm() {
    return {
      description: '', amount: 0, category: 'supplies',
      date: new Date().toISOString().split('T')[0], notes: '',
      supplierId: null // Atributo inicial nulo
    };
  }

  formatDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatLocalDate(dateString: string): string {
    if (!dateString) return '-';
    
    // Si la fecha viene en formato YYYY-MM-DD
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    // Si viene con timestamp, extraer solo la fecha
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('es', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      timeZone: 'America/Bogota'
    });
  }

  // Agrega después del método emptyForm()
  formatCOP(val: number | string): string {
    if (!val && val !== 0) return '';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    return num.toLocaleString('es-CO');
  }

  parseCOP(val: string): number {
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
}
