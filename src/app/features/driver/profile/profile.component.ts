import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { DriverProfile } from '../../../core/models/models';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, CatalogLabelPipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.PROFILE' | translate }}</p>
          <h1 class="page-title">{{ 'DRIVER.PROFILE_TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'DRIVER.PROFILE_SUBTITLE' | translate }}</p>
        </div>
        <div class="page-actions">
          <a routerLink="/drivers" class="btn btn--ghost">{{ 'NAV.AVAILABLE_DRIVERS' | translate }}</a>
          <a routerLink="/driver/vehicles" class="btn btn--ghost">{{ 'NAV.VEHICLES' | translate }}</a>
        </div>
      </header>

      @if (profile) {
        <div class="panel">
          <div class="detail-grid" style="margin-bottom: 1.25rem;">
            <div class="detail-item">
              <span class="detail-item__label">{{ 'REGISTER.FIRST_NAME' | translate }}</span>
              <span class="detail-item__value">{{ profile.firstName }} {{ profile.lastName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'LOCATION.REGION' | translate }}</span>
              <span class="detail-item__value">{{ profile.regionName | catalogLabel:'region' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
              <span class="detail-item__value">{{ profile.districtName | catalogLabel:'district' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'DRIVER.RATING' | translate }}</span>
              <span class="detail-item__value">
                {{ 'DRIVER.RATING_REVIEWS' | translate:{ rating: profile.averageRating, count: profile.reviewCount } }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'DRIVER.AVAILABLE_FOR_ORDERS' | translate }}</span>
              <span class="detail-item__value">
                <span class="badge" [class]="profile.isAvailable ? 'badge--active' : 'badge--inactive'">
                  {{ (profile.isAvailable ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                </span>
              </span>
            </div>
          </div>

          <p class="hint" style="margin-bottom: 1rem;">{{ 'DRIVER.AVAILABILITY_HINT' | translate }}</p>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
            <label class="field field--check">
              <input type="checkbox" formControlName="isAvailable" />
              <span class="field__label">{{ 'DRIVER.AVAILABLE_FOR_ORDERS' | translate }}</span>
            </label>
            <label class="field">
              <span class="field__label">{{ 'DRIVER.AVAILABILITY_NOTE' | translate }}</span>
              <textarea
                formControlName="availabilityNote"
                rows="3"
                [placeholder]="'DRIVER.AVAILABILITY_NOTE_PLACEHOLDER' | translate"
              ></textarea>
              <span class="hint">{{ 'DRIVER.AVAILABILITY_NOTE_HINT' | translate }}</span>
            </label>
            <label class="field">
              <span class="field__label">{{ 'DRIVER.LICENSE_NUMBER' | translate }}</span>
              <input formControlName="licenseNumber" />
            </label>
            <div class="form-actions">
              <button class="btn btn--xs" type="submit" [disabled]="busy">{{ 'COMMON.SAVE' | translate }}</button>
            </div>
          </form>

          @if (message) { <p class="success-msg">{{ message }}</p> }
          @if (error) { <p class="error">{{ error }}</p> }
        </div>
      } @else {
        <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
      }
    </section>
  `
})
export class DriverProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private language = inject(LanguageService);
  profile?: DriverProfile;
  message = '';
  error = '';
  busy = false;

  form = this.fb.group({
    isAvailable: [false],
    licenseNumber: [''],
    availabilityNote: ['', Validators.maxLength(500)]
  });

  ngOnInit(): void {
    this.api.getDriverProfile().subscribe(p => {
      this.profile = p;
      this.form.patchValue({
        isAvailable: p.isAvailable,
        licenseNumber: p.licenseNumber ?? '',
        availabilityNote: p.availabilityNote ?? ''
      });
    });
  }

  save(): void {
    this.busy = true;
    this.error = '';
    const raw = this.form.getRawValue();
    this.api.updateDriverProfile({
      isAvailable: !!raw.isAvailable,
      licenseNumber: raw.licenseNumber || undefined,
      availabilityNote: raw.availabilityNote || undefined
    }).subscribe({
      next: p => {
        this.profile = p;
        this.message = this.language.instant('DRIVER.PROFILE_UPDATED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('DRIVER.UPDATE_FAILED');
        this.busy = false;
      }
    });
  }
}
