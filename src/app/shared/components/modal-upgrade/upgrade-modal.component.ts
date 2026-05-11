import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="upgrade-modal" (click)="$event.stopPropagation()">
        <div class="modal-icon">🚀</div>
        <h3>¡Plan alcanzado!</h3>
        <p>Tu plan actual permite máximo <strong>{{ maxUsers }} usuarios</strong>. 
        Para agregar más miembros al equipo, necesitas actualizar tu plan.</p>
        
        <div class="benefits">
          <div class="benefit">
            <span>✓</span> Más usuarios activos
          </div>
          <div class="benefit">
            <span>✓</span> Funcionalidades avanzadas
          </div>
          <div class="benefit">
            <span>✓</span> Soporte prioritario
          </div>
        </div>

        <div class="actions">
          <button class="btn-secondary" (click)="close()">Cancelar</button>
          <button class="btn-upgrade" (click)="goToPlans()">
            Ver planes disponibles →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    .upgrade-modal {
      background: var(--bg-card);
      border-radius: 24px;
      padding: 2rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      animation: slideUp 0.3s ease-out;
    }

    .modal-icon {
      font-size: 56px;
      margin-bottom: 1rem;
    }

    h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
      color: var(--text-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .benefits {
      background: var(--bg-page);
      border-radius: 16px;
      padding: 1.25rem;
      margin: 1.5rem 0;
      text-align: left;
    }

    .benefit {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .benefit span {
      color: #10b981;
      font-weight: 700;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .btn-secondary {
      padding: 0.625rem 1.25rem;
      border-radius: 10px;
      border: 1.5px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-weight: 500;
    }

    .btn-upgrade {
      padding: 0.625rem 1.5rem;
      border-radius: 10px;
      border: none;
      background: var(--brand-primary);
      color: white;
      cursor: pointer;
      font-weight: 600;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class UpgradeModalComponent {
  @Input() maxUsers: number = 1;
  @Output() closeModal = new EventEmitter<void>();
  @Output() upgrade = new EventEmitter<void>();

  close() {
    this.closeModal.emit();
  }

  goToPlans() {
    this.upgrade.emit();
    this.close();
  }
}