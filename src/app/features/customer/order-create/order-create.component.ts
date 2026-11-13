import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { DigitsOnlyDirective } from '../../../shared/directives/digits-only.directive';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';
import { LocationCascadeComponent } from '../../../shared/location-cascade/location-cascade.component';
import { CargoType, VehicleType } from '../../../core/models/models';

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, DigitsOnlyDirective, CatalogLabelPipe, LocationCascadeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'NAV.NEW_ORDER' | translate }}</p>
          <h1 class="page-title">{{ 'CUSTOMER.CREATE_ORDER_TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'CUSTOMER.PRICE_HINT' | translate }}</p>
        </div>
        <div class="page-actions">
          <a [routerLink]="ordersListLink" class="btn btn--ghost">{{ 'CUSTOMER.MY_ORDERS' | translate }}</a>
        </div>
      </header>

      <div class="panel">
        <form class="form-grid form-grid--2" [formGroup]="form" (ngSubmit)="submit()">
          <div class="span-2 location-cascade-grid">
            <app-location-cascade
              [districtId]="form.controls.districtId.value || ''"
              [required]="true"
              (districtIdChange)="form.patchValue({ districtId: $event })"
            />
          </div>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.CONTACT_PHONE' | translate }}</span>
            <input
              formControlName="contactPhone"
              appDigitsOnly
              inputmode="numeric"
              autocomplete="tel"
              [placeholder]="'CUSTOMER.CONTACT_PHONE_PLACEHOLDER' | translate"
            />
            <span class="hint">{{ 'CUSTOMER.CONTACT_PHONE_HINT' | translate }}</span>
          </label>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.SCHEDULED_AT' | translate }}</span>
            <input formControlName="scheduledAt" type="datetime-local" />
          </label>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.VEHICLE_TYPE' | translate }}</span>
            <select formControlName="vehicleTypeId">
              @for (t of vehicleTypes; track t.id) {
                <option [value]="t.id">{{ t.name | catalogLabel:'vehicle' }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.CARGO_TYPE' | translate }}</span>
            <select formControlName="cargoTypeId">
              @for (t of cargoTypes; track t.id) {
                <option [value]="t.id">{{ t.name | catalogLabel:'cargo' }}</option>
              }
            </select>
          </label>

          <label class="field span-2">
            <span class="field__label">{{ 'CUSTOMER.PICKUP_ADDRESS' | translate }}</span>
            <input formControlName="pickupAddress" [placeholder]="'CUSTOMER.PICKUP_PLACEHOLDER' | translate" />
          </label>

          <label class="field span-2">
            <span class="field__label">{{ 'CUSTOMER.DESTINATION_ADDRESS' | translate }}</span>
            <input formControlName="destinationAddress" [placeholder]="'CUSTOMER.DESTINATION_PLACEHOLDER' | translate" />
          </label>

          <label class="field span-2">
            <span class="field__label">{{ 'CUSTOMER.DESCRIPTION' | translate }}</span>
            <textarea formControlName="description"></textarea>
          </label>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.ESTIMATED_WEIGHT' | translate }}</span>
            <input formControlName="estimatedWeightKg" type="number" min="0" />
          </label>

          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.PROPOSED_PRICE' | translate }}</span>
            <input formControlName="price" type="number" min="0" />
          </label>

          @if (error) { <p class="error span-2">{{ error }}</p> }

          <div class="form-actions span-2">
            <button class="btn btn--xs" type="submit" [disabled]="form.invalid || loading">
              {{ loading ? ('COMMON.WAITING' | translate) : ('CUSTOMER.SUBMIT_ORDER' | translate) }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class OrderCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private language = inject(LanguageService);
  vehicleTypes: VehicleType[] = [];
  cargoTypes: CargoType[] = [];
  loading = false;
  error = '';

  get ordersListLink(): string {
    return this.auth.currentUser()?.role === 'Driver' ? '/driver/orders' : '/customer/orders';
  }

  form = this.fb.group({
    districtId: ['', Validators.required],
    contactPhone: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(15)]],
    vehicleTypeId: ['', Validators.required],
    cargoTypeId: ['', Validators.required],
    pickupAddress: ['', Validators.required],
    destinationAddress: ['', Validators.required],
    description: [''],
    estimatedWeightKg: [null as number | null],
    price: [null as number | null],
    scheduledAt: ['', Validators.required]
  });

  ngOnInit(): void {
    const phone = this.auth.currentUser()?.phoneNumber ?? '';
    if (phone) this.form.patchValue({ contactPhone: phone.replace(/\D/g, '') });

    this.api.getVehicleTypes().subscribe(v => {
      this.vehicleTypes = v;
      if (v[0]) this.form.patchValue({ vehicleTypeId: v[0].id });
    });
    this.api.getCargoTypes().subscribe(c => {
      this.cargoTypes = c;
      if (c[0]) this.form.patchValue({ cargoTypeId: c[0].id });
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const scheduledAt = new Date(raw.scheduledAt!).toISOString();
    this.api.createOrder({ ...raw, scheduledAt }).subscribe({
      next: o => {
        const role = this.auth.currentUser()?.role;
        this.router.navigate(role === 'Driver' ? ['/driver/orders', o.id] : ['/customer/orders', o.id]);
      },
      error: err => {
        this.error = err.error?.errors?.contactPhone?.[0]
          ?? err.error?.title
          ?? this.language.instant('CUSTOMER.CREATE_FAILED');
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
