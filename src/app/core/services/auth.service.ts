import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User, Tenant } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  // ── Signals (estado reactivo) ──────────────────────────────
  readonly currentUser = signal<User | null>(this.loadUser());
  readonly currentTenant = signal<Tenant | null>(this.loadTenant());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isSuperAdmin = computed(() => this.currentUser()?.role === 'superadmin');

  constructor(private http: HttpClient, private router: Router) {}

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/register`, data).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, data).pipe(
      tap(res => this.storeSession(res))
    );
  }

  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<any>(`${this.api}/auth/refresh`, { refreshToken }).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.api}/auth/logout`, {}).subscribe();
    localStorage.clear();
    this.currentUser.set(null);
    this.currentTenant.set(null);
    this.router.navigate(['/auth/login']);
  }

  updateTenant(tenant: Partial<Tenant>): void {
    const current = this.currentTenant();
    if (current) {
      const updated = { ...current, ...tenant };
      this.currentTenant.set(updated);
      localStorage.setItem('tenant', JSON.stringify(updated));
      this.applyTheme(updated);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // ── Theme dinámico ─────────────────────────────────────────
  applyTheme(tenant: Tenant): void {
    const root = document.documentElement;
    const primary = tenant.primaryColor || '#6366f1';
    const accent = tenant.accentColor || '#8b5cf6';

    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-accent', accent);
    root.style.setProperty('--brand-primary-10', primary + '1a');
    root.style.setProperty('--brand-primary-20', primary + '33');

    if (tenant.colorTheme === 'dark') {
      root.style.setProperty('--bg-page', '#0f172a');
      root.style.setProperty('--bg-card', '#1e293b');
      root.style.setProperty('--bg-hover', '#334155');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-tertiary', '#64748b');
      root.style.setProperty('--border-color', '#334155');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      root.style.setProperty('--bg-page', '#f8fafc');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-hover', '#f1f5f9');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#64748b');
      root.style.setProperty('--text-tertiary', '#94a3b8');
      root.style.setProperty('--border-color', '#e2e8f0');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }

  initTheme(): void {
    const tenant = this.currentTenant();
    if (tenant) this.applyTheme(tenant);
  }

  // ── Helpers privados ───────────────────────────────────────
  private storeSession(res: AuthResponse): void {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('tenant', JSON.stringify(res.tenant));
    this.currentUser.set(res.user);
    this.currentTenant.set(res.tenant);
    if (res.tenant) this.applyTheme(res.tenant);
  }

  private loadUser(): User | null {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }
  private loadTenant(): Tenant | null {
    try { return JSON.parse(localStorage.getItem('tenant') || 'null'); } catch { return null; }
  }
  
}
