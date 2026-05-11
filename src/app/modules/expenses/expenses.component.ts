import { Component, signal, OnInit, inject } from '@angular/core';
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
  imports: [FormsModule, CurrencyPipe, DatePipe],
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
  form: any = this.emptyForm();

  categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
  months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('es', { month: 'long' }),
  }));

  constructor(private api: ApiService) {}
  ngOnInit(): void { this.loadExpenses(); }

  // Cargar Gastos
  loadExpenses(): void {
    const params: any = { month: this.filterMonth, year: this.filterYear };
    if (this.filterCategory) params.category = this.filterCategory;
    this.api.getExpenses(params).subscribe(r => {
      this.expenses.set(r.items);
      this.sum.set(r.sum);
    });
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
}
