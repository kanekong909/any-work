// modules/inventory/stock-adjust-modal/stock-adjust-modal.component.ts
import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-stock-adjust-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="visible" (mousedown)="onOverlayMouseDown($event)" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Ajustar Stock: {{ productName }}</h3>
          <button class="close-btn" (click)="close()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="current-stock">
            <label>Stock actual:</label>
            <span class="stock-value">{{ currentStock | number:'1.0-3' }} {{ unit }}</span>
          </div>

          <div class="form-group">
            <label>Tipo de ajuste:</label>
            <div class="radio-group">
              <label>
                <input type="radio" value="add" [(ngModel)]="adjustmentType" (change)="onTypeChange()">
                <span class="positive">➕ Aumentar stock</span>
              </label>
              <label>
                <input type="radio" value="remove" [(ngModel)]="adjustmentType" (change)="onTypeChange()">
                <span class="negative">➖ Reducir stock</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Cantidad:</label>
            <input 
              type="number" 
              [(ngModel)]="quantity" 
              [min]="adjustmentType === 'remove' ? (unit === 'unit' ? 1 : 0.001) : (unit === 'unit' ? 1 : 0.001)"
              [step]="unit === 'unit' ? 1 : 0.001"
              class="form-control"
              (wheel)="$event.preventDefault()"
              (keydown)="onKeyDown($event)"
              (input)="onInputChange($event)"
              (blur)="onBlur()"
              [attr.inputmode]="unit === 'unit' ? 'numeric' : 'decimal'"
            />
            <small *ngIf="adjustmentType === 'remove' && quantity > currentStock" class="error">
              ⚠️ La cantidad supera el stock actual
            </small>
        </div>

          <div class="form-group">
            <label>Razón del ajuste:</label>
            <select [(ngModel)]="reason" class="form-control">
              <option value="INVENTORY_ADJUSTMENT">📊 Ajuste por inventario físico</option>
              <option value="DAMAGED">💔 Producto dañado</option>
              <option value="EXPIRED">⏰ Producto vencido</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notas (opcional):</label>
            <textarea [(ngModel)]="notes" rows="3" class="form-control" 
              placeholder="Ej: Rotura de stock, merma, etc."></textarea>
          </div>

          <div *ngIf="adjustmentType === 'remove'" class="warning-box">
            <span class="warning-icon">⚠️</span>
            <span>Esta acción reducirá el inventario permanentemente. Asegúrate de que sea correcto.</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="close()">Cancelar</button>
          <button class="btn-primary" (click)="save()" [disabled]="!isValid() || saving()">
            {{ saving() ? 'Guardando...' : 'Confirmar ajuste' }}
          </button>
        </div>
      </div>
    </div>
  `,
  // styles mejorados para stock-adjust-modal.component.ts
styles: [`
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--bg-card, #ffffff);
    border-radius: 20px;
    width: 90%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideIn 0.2s ease;
  }

  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: var(--bg-hover, #f1f1f1);
    border-radius: 4px;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: var(--border-color, #c1c1c1);
    border-radius: 4px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 2px solid var(--border-color, #e5e7eb);
    background: linear-gradient(135deg, var(--bg-card, #fff) 0%, var(--bg-page, #f9fafb) 100%);
    border-radius: 20px 20px 0 0;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .modal-header h3::before {
    content: "🔧";
    font-size: 1.25rem;
  }

  .close-btn {
    background: var(--bg-hover, #f3f4f6);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--text-secondary, #6b7280);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.05);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .current-stock {
    background: linear-gradient(135deg, var(--bg-hover, #f3f4f6) 0%, var(--bg-page, #f9fafb) 100%);
    padding: 1rem 1.25rem;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .current-stock label {
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    margin: 0;
  }

  .stock-value {
    font-weight: 700;
    font-size: 1.5rem;
    color: var(--brand-primary, #6366f1);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary, #374151);
  }

  .form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    background: var(--bg-card, white);
    color: var(--text-primary, #1f2937);
    font-size: 0.875rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .form-control:focus {
    outline: none;
    border-color: var(--brand-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  textarea.form-control {
    resize: vertical;
    font-family: inherit;
  }

  .radio-group {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .radio-group label:hover {
    background: var(--bg-hover, #f3f4f6);
  }

  .radio-group input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--brand-primary, #6366f1);
  }

  .positive { 
    color: #10b981;
    font-weight: 600;
  }

  .negative { 
    color: #ef4444;
    font-weight: 600;
  }

  .error {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .warning-box {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-top: 1.5rem;
  }

  .warning-icon {
    font-size: 1.25rem;
  }

  .warning-box span:last-child {
    font-size: 0.813rem;
    color: #92400e;
    line-height: 1.4;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color, #e5e7eb);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    background: var(--bg-page, #f9fafb);
    border-radius: 0 0 20px 20px;
  }

  .btn-primary, .btn-secondary {
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: var(--brand-primary, #6366f1);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-card, white);
    color: var(--text-secondary, #6b7280);
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #f3f4f6);
    color: var(--text-primary, #374151);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .modal-content {
      width: 95%;
      max-height: 85vh;
    }

    .modal-header h3 {
      font-size: 1rem;
    }

    .stock-value {
      font-size: 1.25rem;
    }

    .radio-group {
      gap: 1rem;
    }

    .radio-group label {
      padding: 0.375rem 0.75rem;
      font-size: 0.813rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.5rem 1rem;
    }
  }

  /* Deshabilitar spinners del input number */
  .form-control[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .form-control[type="number"]::-webkit-inner-spin-button,
  .form-control[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`]
})
export class StockAdjustModalComponent {
  @Input() visible = false;
  @Input() productId = '';
  @Input() productName = '';
  @Input() currentStock = 0;
  @Input() unit = 'unit';
  @Output() closeModal = new EventEmitter();
  @Output() adjusted = new EventEmitter();

  private api = inject(ApiService);
  private toast = inject(ToastService);
  
  adjustmentType = 'add';
  quantity = 0;
  reason = 'INVENTORY_ADJUSTMENT';
  notes = '';
  saving = signal(false);

  onTypeChange(): void {
    this.quantity = 0;
  }

  validateQuantity(): void {
  // No hacer nada durante la edición activa
  // Este método se llama solo al salir del input o al guardar
}

  // Nuevo método para validar al perder el foco (blur)
  onBlur(): void {
    // Solo al salir del input, aplicar validaciones
    if (isNaN(this.quantity) || this.quantity === null || this.quantity === undefined) {
      this.quantity = this.unit === 'unit' ? 1 : 0.001;
    }
    
    if (this.unit === 'unit') {
      this.quantity = Math.floor(this.quantity);
      if (this.quantity < 1) this.quantity = 1;
    } else {
      this.quantity = Math.round(this.quantity * 1000) / 1000;
      if (this.quantity < 0.001) this.quantity = 0.001;
    }
    
    if (this.adjustmentType === 'remove' && this.quantity > this.currentStock) {
      this.quantity = this.currentStock;
    }
  }

  isValid(): boolean {
    // Asegurar que quantity sea válido
    let validQuantity = this.quantity;
    if (isNaN(validQuantity) || validQuantity <= 0) return false;
    
    if (this.unit === 'unit') {
      validQuantity = Math.floor(validQuantity);
      if (validQuantity < 1) return false;
    } else {
      validQuantity = Math.round(validQuantity * 1000) / 1000;
      if (validQuantity < 0.001) return false;
    }
    
    if (this.adjustmentType === 'remove' && validQuantity > this.currentStock) return false;
    return true;
  }

  save(): void {
    if (!this.isValid()) return;
    
    this.saving.set(true);
    
    // Asegurar que la cantidad sea un número entero sin decimales
    let finalQuantity = this.adjustmentType === 'add' ? this.quantity : -this.quantity;
    
    // Redondear a 0 decimales para productos por unidad
    if (this.unit === 'unit') {
      finalQuantity = Math.round(finalQuantity);
    } else {
      // Para kg, litros, etc., mantener 3 decimales
      finalQuantity = Math.round(finalQuantity * 1000) / 1000;
    }
    
    console.log('Enviando ajuste:', { quantity: finalQuantity, type: this.adjustmentType }); // Para depurar
    
    this.api.adjustStock(this.productId, {
      quantity: finalQuantity,
      reason: this.reason,
      notes: this.notes
    }).subscribe({
      next: (res) => {
        this.toast.success('Stock ajustado', `Stock actualizado a ${res.product.stock}`);
        this.adjusted.emit(res);
        this.close();
      },
      error: (err) => {
        this.toast.error('Error', err.error?.message || 'No se pudo ajustar el stock');
        this.saving.set(false);
      }
    });
  }

  close(): void {
    this.visible = false;
    this.quantity = 0;
    this.notes = '';
    this.reason = 'INVENTORY_ADJUSTMENT';
    this.closeModal.emit();
  }

  // Prevenir scroll en input number
  onKeyDown(event: KeyboardEvent): void {
    // Prevenir teclas 'e', 'E', '-', '+'
    if (event.key === 'e' || event.key === 'E' || event.key === '-' || event.key === '+') {
      event.preventDefault();
    }
  }

  // Sin forzar el valor mientras se edita
  onInputChange(event: any): void {
    let value = event.target.value;
    
    // Si está vacío, no hacer nada (permitir que el usuario borre)
    if (value === '' || value === null || value === undefined) {
      return;
    }
    
    let numValue: number;
    
    if (this.unit === 'unit') {
      numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return; // No forzar, solo esperar
      }
      // Solo asignar si es un número válido, sin forzar mínimo aún
      this.quantity = numValue;
    } else {
      numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return;
      }
      // Limitar a 3 decimales pero sin forzar mínimo
      this.quantity = Math.round(numValue * 1000) / 1000;
    }
    
    // Actualizar el input con el valor procesado
    event.target.value = this.quantity;
  }

  // Prevenir cierre al hacer mousedown en el overlay
  onOverlayMouseDown(event: MouseEvent): void {
    // Evitar que el evento se propague
    event.stopPropagation();
  }

  // Solo cerrar si el click fue DIRECTAMENTE en el overlay (no en el contenido)
  onOverlayClick(event: MouseEvent): void {
    // Verificar que el target sea el overlay, no el contenido
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }
}