import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { DigitsOnlyDirective } from '../../../shared/directives/digits-only.directive';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';
import { CargoType, Order, VehicleType } from '../../../core/models/models';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [ReactiveFormsModule, AppDatePipe, CatalogLabelPipe, RouterLink, TranslatePipe, DigitsOnlyDirective],
  template: `
    @if (order) {
      <section class="page">
        <header class="page-header">
          <div class="page-header__copy">
            <p class="page-kicker">{{ 'COMMON.ORDERS' | translate }}</p>
            <h1 class="page-title">{{ order.orderNumber }}</h1>
            <p class="page-subtitle">
              <span class="badge" [class]="badgeClass(order.status)">{{ ('STATUS.' + order.status) | translate }}</span>
            </p>
          </div>
          <div class="page-actions">
            <a routerLink="/customer/orders" class="btn btn--ghost">{{ 'CUSTOMER.MY_ORDERS' | translate }}</a>
            @if (order.status === 'Pending') {
              <button
                type="button"
                class="icon-btn"
                (click)="editing = !editing"
                [attr.title]="(editing ? 'COMMON.CANCEL' : 'COMMON.EDIT') | translate"
                [attr.aria-label]="(editing ? 'COMMON.CANCEL' : 'COMMON.EDIT') | translate"
              >
                @if (editing) {
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18"/>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/>
                    <path d="M13.5 6.5l3 3"/>
                  </svg>
                }
              </button>
            }
            @if (order.status === 'Pending' || order.status === 'Accepted') {
              <button type="button" class="btn btn--danger" (click)="cancel()">
                {{ 'CUSTOMER.CANCEL_ORDER' | translate }}
              </button>
            }
          </div>
        </header>

        <div class="panel">
          @if (!editing) {
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">{{ 'CUSTOMER.ROUTE' | translate }}</span>
                <span class="detail-item__value">{{ order.pickupAddress }} → {{ order.destinationAddress }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'CUSTOMER.SCHEDULED' | translate }}</span>
                <span class="detail-item__value">{{ order.scheduledAt | appDate:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'CUSTOMER.VEHICLE_TYPE' | translate }}</span>
                <span class="detail-item__value">{{ order.vehicleTypeName | catalogLabel:'vehicle' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'CUSTOMER.CARGO' | translate }}</span>
                <span class="detail-item__value">{{ order.cargoTypeName | catalogLabel:'cargo' }}</span>
              </div>
              @if (order.districtName) {
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
                  <span class="detail-item__value">{{ order.districtName | catalogLabel:'district' }}</span>
                </div>
              }
              @if (order.customerPhone) {
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'CUSTOMER.CONTACT_PHONE' | translate }}</span>
                  <span class="detail-item__value">{{ order.customerPhone }}</span>
                </div>
              }
              @if (order.price) {
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'CUSTOMER.PROPOSED_PRICE' | translate }}</span>
                  <span class="detail-item__value">{{ order.price }}</span>
                </div>
              }
              @if (order.description) {
                <div class="detail-item span-2">
                  <span class="detail-item__label">{{ 'CUSTOMER.DESCRIPTION' | translate }}</span>
                  <span class="detail-item__value">{{ order.description }}</span>
                </div>
              }
              @if (order.driverName) {
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'CUSTOMER.DRIVER' | translate }}</span>
                  <span class="detail-item__value">{{ order.driverName }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'CUSTOMER.VEHICLE' | translate }}</span>
                  <span class="detail-item__value">{{ order.vehiclePlateNumber }}</span>
                </div>
              }
            </div>
          } @else {
            <h2 class="panel__title">{{ 'COMMON.EDIT' | translate }}</h2>
            <form class="form-grid form-grid--2" [formGroup]="editForm" (ngSubmit)="saveEdit()">
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
                <span class="field__label">{{ 'CUSTOMER.CONTACT_PHONE' | translate }}</span>
                <input formControlName="contactPhone" appDigitsOnly inputmode="numeric" />
              </label>
              <label class="field span-2">
                <span class="field__label">{{ 'CUSTOMER.PICKUP_ADDRESS' | translate }}</span>
                <input formControlName="pickupAddress" />
              </label>
              <label class="field span-2">
                <span class="field__label">{{ 'CUSTOMER.DESTINATION_ADDRESS' | translate }}</span>
                <input formControlName="destinationAddress" />
              </label>
              <label class="field span-2">
                <span class="field__label">{{ 'CUSTOMER.DESCRIPTION' | translate }}</span>
                <textarea formControlName="description"></textarea>
              </label>
              <label class="field">
                <span class="field__label">{{ 'CUSTOMER.ESTIMATED_WEIGHT' | translate }}</span>
                <input formControlName="estimatedWeightKg" type="number" />
              </label>
              <label class="field">
                <span class="field__label">{{ 'CUSTOMER.PROPOSED_PRICE' | translate }}</span>
                <input formControlName="price" type="number" />
              </label>
              <label class="field span-2">
                <span class="field__label">{{ 'CUSTOMER.SCHEDULED_AT' | translate }}</span>
                <input formControlName="scheduledAt" type="datetime-local" />
              </label>
              <div class="form-actions span-2">
                <button class="btn btn--xs" type="submit" [disabled]="editForm.invalid || busy">{{ 'COMMON.SAVE' | translate }}</button>
              </div>
            </form>
          }

          @if (order.status === 'Completed' && !reviewSubmitted) {
            <div class="panel-block">
              <h2 class="panel__title">{{ 'CUSTOMER.LEAVE_REVIEW' | translate }}</h2>
              <form class="form-grid form-grid--2" [formGroup]="reviewForm" (ngSubmit)="submitReview()">
                <label class="field">
                  <span class="field__label">{{ 'CUSTOMER.RATING' | translate }}</span>
                  <input formControlName="rating" type="number" min="1" max="5" />
                </label>
                <label class="field span-2">
                  <span class="field__label">{{ 'CUSTOMER.COMMENT' | translate }}</span>
                  <textarea formControlName="comment"></textarea>
                </label>
                <div class="form-actions span-2">
                  <button class="btn btn--xs" type="submit" [disabled]="reviewForm.invalid || busy">
                    {{ 'CUSTOMER.SUBMIT_REVIEW' | translate }}
                  </button>
                </div>
              </form>
            </div>
          }

          @if (message) { <p class="success-msg">{{ message }}</p> }
          @if (error) { <p class="error">{{ error }}</p> }
        </div>
      </section>
    } @else {
      <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
    }
  `
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private language = inject(LanguageService);
  order?: Order;
  vehicleTypes: VehicleType[] = [];
  cargoTypes: CargoType[] = [];
  message = '';
  error = '';
  editing = false;
  reviewSubmitted = false;
  busy = false;

  reviewForm = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['']
  });

  editForm = this.fb.group({
    vehicleTypeId: ['', Validators.required],
    cargoTypeId: ['', Validators.required],
    contactPhone: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(15)]],
    pickupAddress: ['', Validators.required],
    destinationAddress: ['', Validators.required],
    description: [''],
    estimatedWeightKg: [null as number | null],
    price: [null as number | null],
    scheduledAt: ['', Validators.required]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getOrder(id).subscribe(o => {
      this.order = o;
      this.patchEdit(o);
    });
    this.api.getVehicleTypes().subscribe(v => this.vehicleTypes = v);
    this.api.getCargoTypes().subscribe(c => this.cargoTypes = c);
  }

  badgeClass(status: string): string {
    return `badge--${status.replace(/\s/g, '').toLowerCase()}`;
  }

  cancel(): void {
    if (!this.order) return;
    this.busy = true;
    this.api.cancelOrder(this.order.id, this.language.instant('CUSTOMER.CANCEL_REASON')).subscribe({
      next: o => {
        this.order = o;
        this.message = this.language.instant('CUSTOMER.ORDER_CANCELLED');
        this.editing = false;
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }

  saveEdit(): void {
    if (!this.order || this.editForm.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    const raw = this.editForm.getRawValue();
    const scheduledAt = new Date(raw.scheduledAt!).toISOString();
    this.api.updateOrder(this.order.id, { ...raw, scheduledAt }).subscribe({
      next: o => {
        this.order = o;
        this.editing = false;
        this.message = this.language.instant('CUSTOMER.ORDER_UPDATED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }

  submitReview(): void {
    if (!this.order || this.reviewForm.invalid || this.busy) return;
    this.busy = true;
    const { rating, comment } = this.reviewForm.getRawValue();
    this.api.createReview({ orderId: this.order.id, rating: rating!, comment: comment ?? undefined }).subscribe({
      next: () => {
        this.message = this.language.instant('CUSTOMER.REVIEW_SUBMITTED');
        this.reviewSubmitted = true;
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('CUSTOMER.REVIEW_FAILED');
        this.busy = false;
      }
    });
  }

  private patchEdit(o: Order): void {
    const local = new Date(o.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const scheduledAt = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    this.editForm.patchValue({
      vehicleTypeId: o.vehicleTypeId,
      cargoTypeId: o.cargoTypeId,
      contactPhone: (o.customerPhone ?? '').replace(/\D/g, ''),
      pickupAddress: o.pickupAddress,
      destinationAddress: o.destinationAddress,
      description: o.description ?? '',
      estimatedWeightKg: o.estimatedWeightKg ?? null,
      price: o.price ?? null,
      scheduledAt
    });
  }
}
