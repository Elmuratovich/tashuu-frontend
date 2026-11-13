import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LanguageSwitcherComponent,
    BrandLogoComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private language = inject(LanguageService);

  loading = false;
  error = '';
  showPassword = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: user => this.router.navigateByUrl(this.homeRoute(user.user.role)),
      error: err => {
        this.error = err.error?.title ?? this.language.instant('LOGIN.FAILED');
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private homeRoute(role: string): string {
    if (role === 'Admin') return '/admin';
    return '/';
  }
}
