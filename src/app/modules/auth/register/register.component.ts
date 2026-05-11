import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    businessName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8),
      Validators.pattern(/(?=.*[A-Z])(?=.*[0-9])/)]],
  });
  loading = signal(false);
  errorMsg = signal('');
  showPass = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/onboarding']),
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al crear cuenta');
        this.loading.set(false);
      }
    });
  }
}
