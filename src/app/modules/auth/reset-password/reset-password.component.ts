import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card">
      @if (!done()) {
        <h1 class="auth-title">Nueva contraseña</h1>
        <p class="auth-subtitle">Crea una contraseña segura para tu cuenta.</p>

        <div class="auth-form">
          <div class="field">
            <label>Nueva contraseña</label>
            <input [type]="showPass() ? 'text' : 'password'" [(ngModel)]="newPassword"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número">
            <button type="button" class="toggle-pass" (click)="showPass.set(!showPass())">
              {{ showPass() ? '🙈' : '👁️' }}
            </button>
          </div>
          <div class="field">
            <label>Confirmar contraseña</label>
            <input [type]="showPass() ? 'text' : 'password'" [(ngModel)]="confirmPassword"
              placeholder="Repite la contraseña">
          </div>

          @if (errorMsg()) {
            <div class="alert-error">{{ errorMsg() }}</div>
          }

          <button class="btn-primary" [disabled]="loading()" (click)="submit()">
            @if (loading()) { <span class="spinner"></span> } @else { Cambiar contraseña }
          </button>
        </div>
      } @else {
        <div class="success-state">
          <div class="success-icon">✅</div>
          <h2>¡Contraseña actualizada!</h2>
          <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <a routerLink="/auth/login" class="btn-primary" style="display:block;text-align:center;margin-top:1.5rem;text-decoration:none;">
            Ir al inicio de sesión
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .auth-card { width: 100%; max-width: 420px; }
    .auth-title { font-family: 'Sora', sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem; }
    .auth-subtitle { color: var(--text-secondary); margin: 0 0 2rem; }
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; position: relative; }
    label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
    input { padding: 0.75rem 1rem; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 0.95rem; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border 0.2s; }
    input:focus { border-color: var(--brand-primary); }
    .toggle-pass { position: absolute; right: 0.75rem; bottom: 0.6rem; background: none; border: none; cursor: pointer; font-size: 1rem; width: auto; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    .btn-primary { background: var(--brand-primary); color: white; border: none; padding: 0.875rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-state { text-align: center; padding: 1rem 0; }
    .success-icon { font-size: 3rem; margin-bottom: 1rem; }
    .success-state h2 { font-family: 'Sora', sans-serif; font-size: 1.4rem; color: var(--text-primary); margin: 0 0 0.75rem; }
    .success-state p { color: var(--text-secondary); font-size: 0.9rem; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  errorMsg = signal('');
  done = signal(false);
  showPass = signal(false);
  private token = '';
  private email = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.token || !this.email) this.router.navigate(['/auth/login']);
  }

  submit(): void {
    if (!this.newPassword) { this.errorMsg.set('Ingresa una contraseña.'); return; }
    if (this.newPassword.length < 8) { this.errorMsg.set('Mínimo 8 caracteres.'); return; }
    if (!/[A-Z]/.test(this.newPassword)) { this.errorMsg.set('Debe tener al menos una mayúscula.'); return; }
    if (!/[0-9]/.test(this.newPassword)) { this.errorMsg.set('Debe tener al menos un número.'); return; }
    if (this.newPassword !== this.confirmPassword) { this.errorMsg.set('Las contraseñas no coinciden.'); return; }

    this.loading.set(true);
    this.errorMsg.set('');
    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      email: this.email, token: this.token, newPassword: this.newPassword,
    }).subscribe({
      next: () => { this.done.set(true); this.loading.set(false); },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al cambiar la contraseña.');
        this.loading.set(false);
      },
    });
  }
}