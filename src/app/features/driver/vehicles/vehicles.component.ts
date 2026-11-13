import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Vehicle, VehicleType } from '../../../core/models/models';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, CatalogLabelPipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.PROFILE' | translate }}</p>
          <h1 class="page-title">{{ 'DRIVER.MY_VEHICLES' | translate }}</h1>
          <p class="page-subtitle">{{ 'DRIVER.VEHICLES_SUBTITLE' | translate }}</p>
        </div>
      </header>

      <div class="split-layout split-layout--equal">
        <div class="panel">
          <div class="panel-stack">
            <h2 class="panel__title">{{ 'DRIVER.MY_VEHICLES' | translate }}</h2>
            <div class="panel-stack__list panel-stack__list--grow">
              @if (!vehicles.length) {
                <div class="empty">
                  <p class="empty__title">{{ 'DRIVER.NO_VEHICLES' | translate }}</p>
                  <p class="empty__text">{{ 'DRIVER.NO_VEHICLES_HINT' | translate }}</p>
                </div>
              } @else {
                @for (v of vehicles; track v.id) {
                  <div class="list-item">
                    <div class="list-item__main">
                      <p class="list-item__title">{{ v.plateNumber }}</p>
                      <p class="list-item__sub">
                        {{ v.vehicleTypeName | catalogLabel:'vehicle' }}
                        @if (v.brand || v.model) { · {{ v.brand }} {{ v.model }} }
                      </p>
                    </div>
                    <div class="list-item__actions">
                      <span class="badge" [class]="v.isActive ? 'badge--active' : 'badge--inactive'">
                        {{ (v.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                      </span>
                      @if (v.isActive) {
                        <button type="button" class="btn btn--ghost btn--xs" (click)="deactivate(v)">
                          {{ 'DRIVER.DEACTIVATE' | translate }}
                        </button>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-stack">
            <h2 class="panel__title">{{ 'DRIVER.ADD_VEHICLE' | translate }}</h2>
            <div class="panel-stack__form panel-stack__form--plain">
              <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
                <label class="field">
                  <span class="field__label">{{ 'DRIVER.VEHICLE_TYPE' | translate }}</span>
                  <select formControlName="vehicleTypeId">
                    @for (t of vehicleTypes; track t.id) {
                      <option [value]="t.id">{{ t.name | catalogLabel:'vehicle' }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span class="field__label">{{ 'DRIVER.PLATE_NUMBER' | translate }}</span>
                  <input formControlName="plateNumber" />
                </label>
                <label class="field">
                  <span class="field__label">{{ 'DRIVER.BRAND' | translate }}</span>
                  <input formControlName="brand" />
                </label>
                <label class="field">
                  <span class="field__label">{{ 'DRIVER.MODEL' | translate }}</span>
                  <input formControlName="model" />
                </label>
                <div class="form-actions">
                  <button class="btn btn--xs" type="submit" [disabled]="form.invalid || busy">
                    {{ 'DRIVER.ADD_VEHICLE' | translate }}
                  </button>
                </div>
              </form>
              @if (message) { <p class="success-msg">{{ message }}</p> }
              @if (error) { <p class="error">{{ error }}</p> }
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class VehiclesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private language = inject(LanguageService);
  vehicles: Vehicle[] = [];
  vehicleTypes: VehicleType[] = [];
  message = '';
  error = '';
  busy = false;

  form = this.fb.group({
    vehicleTypeId: ['', Validators.required],
    plateNumber: ['', Validators.required],
    brand: [''],
    model: ['']
  });

  ngOnInit(): void {
    this.reload();
    this.api.getVehicleTypes().subscribe(t => {
      this.vehicleTypes = t;
      if (t[0]) this.form.patchValue({ vehicleTypeId: t[0].id });
    });
  }

  submit(): void {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    this.api.createVehicle(this.form.getRawValue()).subscribe({
      next: () => {
        this.message = this.language.instant('DRIVER.VEHICLE_ADDED');
        this.form.reset();
        if (this.vehicleTypes[0]) this.form.patchValue({ vehicleTypeId: this.vehicleTypes[0].id });
        this.reload();
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('DRIVER.VEHICLE_ADD_FAILED');
        this.busy = false;
      }
    });
  }

  deactivate(v: Vehicle): void {
    this.api.updateVehicle(v.id, {
      vehicleTypeId: v.vehicleTypeId,
      plateNumber: v.plateNumber,
      brand: v.brand,
      model: v.model,
      capacityKg: v.capacityKg,
      volumeM3: v.volumeM3,
      isActive: false
    }).subscribe({
      next: () => {
        this.message = this.language.instant('DRIVER.VEHICLE_DEACTIVATED');
        this.reload();
      },
      error: err => this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC')
    });
  }

  reload(): void {
    this.api.getVehicles().subscribe(v => this.vehicles = v);
  }
}
