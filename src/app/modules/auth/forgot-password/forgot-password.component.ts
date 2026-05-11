import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card">
      @if (!sent()) {
        <h1 class="auth-title">¿Olvidaste tu contraseña?</h1>
        <p class="auth-subtitle">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

        <div class="auth-form">
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" [(ngModel)]="email" placeholder="tu@correo.com"
              (keyup.enter)="submit()">
          </div>

          @if (errorMsg()) {
            <div class="alert-error">{{ errorMsg() }}</div>
          }

          <button class="btn-primary" [disabled]="loading()" (click)="submit()">
            @if (loading()) { <span class="spinner"></span> } @else { Enviar enlace }
          </button>
        </div>
      } @else {
        <div class="success-state">
          <div class="success-icon">📧</div>
          <h2>¡Revisa tu correo!</h2>
          <p>Si el correo <strong>{{ email }}</strong> está registrado, recibirás un enlace en los próximos minutos.</p>
          <p class="hint">Revisa también tu carpeta de spam.</p>
        </div>
      }

      <p class="auth-link">
        <a routerLink="/auth/login">← Volver al inicio de sesión</a>
      </p>
    </div>
  `,
  styles: [`
    .auth-card { width: 100%; max-width: 420px; }
    .auth-title { font-family: 'Sora', sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem; }
    .auth-subtitle { color: var(--text-secondary); margin: 0 0 2rem; }
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
    input { padding: 0.75rem 1rem; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 0.95rem; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border 0.2s; }
    input:focus { border-color: var(--brand-primary); }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    .btn-primary { background: var(--brand-primary); color: white; border: none; padding: 0.875rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-state { text-align: center; padding: 1rem 0 2rem; }
    .success-icon { font-size: 3rem; margin-bottom: 1rem; }
    .success-state h2 { font-family: 'Sora', sans-serif; font-size: 1.4rem; color: var(--text-primary); margin: 0 0 0.75rem; }
    .success-state p { color: var(--text-secondary); margin: 0 0 0.5rem; font-size: 0.9rem; }
    .hint { font-size: 0.8rem !important; color: var(--text-tertiary) !important; }
    .auth-link { text-align: center; margin-top: 1.5rem; }
    .auth-link a { font-size: 0.875rem; color: var(--brand-primary); text-decoration: none; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  errorMsg = signal('');
  sent = signal(false);

  constructor(private http: HttpClient) {}

  submit(): void {
    if (!this.email.trim()) { this.errorMsg.set('Ingresa tu correo.'); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email }).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: () => { this.errorMsg.set('Error al enviar. Intenta de nuevo.'); this.loading.set(false); },
    });
  }
}