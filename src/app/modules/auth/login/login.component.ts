import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false]
  });
  loading = signal(false);
  errorMsg = signal('');
  showPass = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}
  
  ngOnInit(): void {
    // 👈 Cargar email guardado si existe
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      this.form.patchValue({
        email: savedEmail,
        rememberMe: true
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.login(this.form.value as any).subscribe({
      next: (res) => {
        if (!res.tenant?.onboardingCompleted) this.router.navigate(['/onboarding']);
        else this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al iniciar sesión');
        this.loading.set(false);
      }
    });
  }
}
