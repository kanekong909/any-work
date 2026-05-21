// modules/inventory/product-movements/product-movements.component.ts
import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { StockMovement, StockMovementSummary } from '../../../core/models';

@Component({
  selector: 'app-product-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="movements-container">
      <!-- Resumen -->
      <div class="summary-cards" *ngIf="summary(); else noSummary">
          <div class="card entries">
            <div class="card-icon">📥</div>
            <div class="card-info">
              <span class="label">Entradas</span>
              <span class="value">{{ formatNumber(summary()!.totals.entries) }}</span>
            </div>
          </div>
          <div class="card exits">
            <div class="card-icon">📤</div>
            <div class="card-info">
              <span class="label">Salidas</span>
              <span class="value">{{ formatNumber(summary()!.totals.exits) }}</span>
            </div>
          </div>
          <div class="card balance" [class.negative]="(summary()?.totals?.balance || 0) < 0">
            <div class="card-icon">⚖️</div>
            <div class="card-info">
              <span class="label">Balance</span>
              <span class="value">{{ formatNumber(summary()!.totals.balance) }}</span>
            </div>
          </div>
        </div>
      </div>
      <ng-template #noSummary>
        <div class="summary-cards-placeholder">
          <div class="card loading">
            <div class="card-icon">📊</div>
            <div class="card-info">
              <span class="label">Cargando resumen...</span>
            </div>
          </div>
        </div>
      </ng-template>

      <!-- Filtros -->
      <div class="filters">
        <input 
          type="text" 
          [(ngModel)]="searchTerm" 
          (ngModelChange)="onSearchChange()"
          placeholder="Buscar por referencia o nota..."
          class="search-input"
        />
        <select [(ngModel)]="movementTypeFilter" (change)="loadMovements()" class="type-select">
          <option value="">Todos los movimientos</option>
          <option value="IN">Entradas</option>
          <option value="OUT">Salidas</option>
          <option value="ADJUSTMENT">Ajustes</option>
        </select>
      </div>

      <!-- Tabla de movimientos -->
      <div class="table-container">
        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
          <span>Cargando movimientos...</span>
        </div>
        
        <table class="movements-table" *ngIf="!loading()">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Razón</th>
              <th>Cantidad</th>
              <th>Stock Anterior</th>
              <th>Stock Nuevo</th>
              <th>Costo Unit.</th>
              <th>Realizado por</th>
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let movement of movements()">
              <!-- Fecha -->
              <td>{{ formatLocalDate(movement.createdAt) }}</td>

              <!-- Tipo -->
              <td>
                <span class="badge" [class]="movement.movementType | lowercase">
                  {{ getTypeLabel(movement.movementType) }}
                </span>
               </td>

              <!-- Razon -->
              <td>{{ getReasonLabel(movement.reason) }}</td>
              
              <!-- Cantidad -->
              <td [class.positive]="movement.movementType === 'IN'" [class.negative]="movement.movementType === 'OUT'">
                {{ movement.movementType === 'IN' ? '+' : '-' }}{{ formatNumber(movement.quantity) }}
              </td>
              <td>{{ movement.stockBefore | number:'1.0-3' }}</td>
              <td>{{ movement.stockAfter | number:'1.0-3' }}</td>
              <td>{{ movement.unitCost | currency:'COP':'symbol':'1.0-0' }}</td>
              <td>{{ movement.user?.name || 'Sistema' }}</td>
              <td class="reference">
                <span *ngIf="movement.referenceType === 'supplier_receipt'" class="ref-badge receipt">
                  📄 Recepción
                </span>
                <span *ngIf="movement.referenceType === 'sale'" class="ref-badge sale">
                  🛒 Venta
                </span>
                <span *ngIf="movement.referenceType === 'purchase_order'" class="ref-badge purchase">
                  📦 Compra
                </span>
                <span *ngIf="movement.notes" class="notes" [title]="movement.notes">
                  📝
                </span>
               </td>
            </tr>
            <tr *ngIf="movements().length === 0">
              <td colspan="9" class="empty-state">
                No hay movimientos registrados para este producto
               </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination" *ngIf="total() > 0">
        <button (click)="previousPage()" [disabled]="currentPage() === 1">
          Anterior
        </button>
        <span>Página {{ currentPage() }} de {{ totalPages() }}</span>
        <button (click)="nextPage()" [disabled]="currentPage() === totalPages()">
          Siguiente
        </button>
        <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
          <option [value]="10">10</option>
          <option [value]="25">25</option>
          <option [value]="50">50</option>
          <option [value]="100">100</option>
        </select>
    </div>
  `,
  styles: [`
    .movements-container {
      width: 100%;
    }
    
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    
    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 0.6rem 1rem;
      border: 1.5px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      background: var(--bg-card, white);
      font-size: 0.875rem;
    }
    
    .type-select {
      padding: 0.6rem 1rem;
      border: 1.5px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      background: var(--bg-card, white);
      font-size: 0.875rem;
      cursor: pointer;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .card {
      background: var(--bg-card, #f9fafb);
      border-radius: 16px;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
    }
    
    .card-icon {
      font-size: 2rem;
    }
    
    .card-info .label {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-secondary, #6b7280);
    }
    
    .card-info .value {
      font-size: 1.5rem;
      font-weight: bold;
    }
    
    .card.entries .value { color: #10b981; }
    .card.exits .value { color: #ef4444; }
    
    .table-container {
      overflow-x: auto;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
    }
    
    .movements-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.813rem;
    }
    
    .movements-table th,
    .movements-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
    
    .movements-table th {
      background: var(--bg-hover, #f9fafb);
      font-weight: 600;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 20px;
      font-size: 0.688rem;
      font-weight: 600;
    }
    
    .badge.in { background: #dcfce7; color: #16a34a; }
    .badge.out { background: #fee2e2; color: #dc2626; }
    .badge.adjustment { background: #fef3c7; color: #d97706; }
    
    .positive { color: #10b981; font-weight: 600; }
    .negative { color: #ef4444; font-weight: 600; }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }
    
    .pagination button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #d1d5db);
      background: var(--bg-card, white);
      border-radius: 8px;
      cursor: pointer;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }
  `]
})
export class ProductMovementsComponent implements OnInit {
  @Input() productId!: string;
  @Input() productUnit: string = 'unit';
  
  private api = inject(ApiService);
  private toast = inject(ToastService);
  
  movements = signal<StockMovement[]>([]);
  summary = signal<StockMovementSummary | null>(null);
  loading = signal(false);
  total = signal(0);
  currentPage = signal(1);
  pageSize = signal(10);
  movementTypeFilter = signal('');
  searchTerm = signal('');
  private searchTimeout: any;

  ngOnInit(): void {
    this.loadMovements();
    this.loadSummary();
  }

  loadMovements(): void {
    this.loading.set(true);
    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize()
    };
    
    // 👈 Enviar el searchTerm al backend
    if (this.searchTerm() && this.searchTerm().trim()) {
      params.search = this.searchTerm().trim();
    }
    
    // 👈 Enviar el movementTypeFilter al backend
    if (this.movementTypeFilter()) {
      params.movementType = this.movementTypeFilter();
    }
    
    console.log('Parámetros enviados:', params); // Para depurar
    
    this.api.getProductMovements(this.productId, params).subscribe({
      next: (res) => {
        this.movements.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading movements:', err);
        this.toast.error('Error', 'No se pudo cargar el historial de movimientos');
        this.loading.set(false);
      }
    });
  }

  loadSummary(): void {
    this.api.getProductMovementsSummary(this.productId).subscribe({
      next: (res) => this.summary.set(res),
      error: (err) => {
        console.error('Error loading summary:', err);
        // No mostramos toast aquí para no molestar, solo log
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadMovements();
    }, 500);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadMovements();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadMovements();
    }
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.loadMovements();
  }

  totalPages(): number {
    return Math.ceil(this.total() / this.pageSize());
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'IN': 'Entrada',
      'OUT': 'Salida',
      'ADJUSTMENT': 'Ajuste'
    };
    return labels[type] || type;
  }

  getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'PURCHASE': 'Compra',
      'SALE': 'Venta',
      'INVENTORY_ADJUSTMENT': 'Ajuste manual',
      'DAMAGED': 'Dañado',
      'EXPIRED': 'Vencido',
      'CUSTOMER_RETURN': 'Devolución cliente',
      'SUPPLIER_RETURN': 'Devolución proveedor',
      'INITIAL_STOCK': 'Stock inicial',
      'SUPPLIER_RECEIPT': 'Recepción proveedor'
    };
    return labels[reason] || reason;
  }

  formatNumber(value: number): string {
    if (this.productUnit === 'unit') {
      // Para productos por unidad, mostrar sin decimales
      return Math.round(value).toLocaleString('es-CO');
    } else {
      // Para kg, litros, etc., mostrar con 3 decimales
      return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    }
  }

  formatLocalDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    // Restar 5 horas para Colombia (UTC-5)
    d.setHours(d.getHours() - 5);
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    // Formato 12 horas
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12:00 en lugar de 0:00
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  }
}