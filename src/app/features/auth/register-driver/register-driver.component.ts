import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { DigitsOnlyDirective } from '../../../shared/directives/digits-only.directive';
import { LocationCascadeComponent } from '../../../shared/location-cascade/location-cascade.component';

@Component({
  selector: 'app-register-driver',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LanguageSwitcherComponent,
    BrandLogoComponent,
    DigitsOnlyDirective,
    LocationCascadeComponent
  ],
  templateUrl: './register-driver.component.html',
  styleUrl: './register-driver.component.scss'
})
export class RegisterDriverComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private language = inject(LanguageService);

  loading = false;
  error = '';
  showPassword = false;

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.pattern(/^\d*$/)]],
    districtId: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onDistrictIdChange(districtId: string): void {
    this.form.patchValue({ districtId });
    this.form.controls.districtId.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.registerDriver(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/driver/profile']),
      error: err => {
        this.error = err.error?.title ?? this.language.instant('REGISTER.FAILED');
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
