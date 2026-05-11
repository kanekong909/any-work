import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      <!-- CORREGIDO: llamar a la señal con () para obtener el array -->
      @for (toast of toastService.getToasts()(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { <span>✅</span> }
              @case ('error') { <span>❌</span> }
              @case ('warning') { <span>⚠️</span> }
              @case ('info') { <span>ℹ️</span> }
            }
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" (click)="toastService.remove(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      max-width: 380px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #ffffff; /* <-- Cambiado de var(--bg-card) */
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
      color: #333333; /* <-- Fuerza un color de texto visible */
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 4px;
      color: #111111; /* <-- Cambiado de var(--text-primary) */
    }

    .toast-message {
      font-size: 0.813rem;
      color: #666666; /* <-- Cambiado de var(--text-secondary) */
      line-height: 1.4;
    }

    .toast-success { border-left-color: #10b981; }
    .toast-error { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-info { border-left-color: #3b82f6; }

    .toast-icon { font-size: 20px; flex-shrink: 0; }
    
    .toast-content { flex: 1; }
    
    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--text-secondary);
      padding: 4px;
      line-height: 1;
      flex-shrink: 0;
    }
    
    .toast-close:hover {
      color: var(--text-primary);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%, -20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}