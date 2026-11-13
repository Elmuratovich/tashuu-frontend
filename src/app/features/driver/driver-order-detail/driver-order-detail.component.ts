import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Order, Vehicle } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-driver-order-detail',
  standalone: true,
  imports: [ReactiveFormsModule, AppDatePipe, CatalogLabelPipe, RouterLink, TranslatePipe],
  template: `
    @if (order) {
      <section class="page">
        <header class="page-header">
          <div class="page-header__copy">
            <p class="page-kicker">{{ 'NAV.AVAILABLE_ORDERS' | translate }}</p>
            <h1 class="page-title">{{ order.orderNumber }}</h1>
            <p class="page-subtitle">
              <span class="badge" [class]="badgeClass(order.status)">{{ ('STATUS.' + order.status) | translate }}</span>
            </p>
          </div>
          <div class="page-actions">
            <a routerLink="/driver/orders" class="btn btn--ghost">{{ 'DRIVER.ORDERS_HUB' | translate }}</a>
          </div>
        </header>

        <div class="panel">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">{{ 'CUSTOMER.ROUTE' | translate }}</span>
              <span class="detail-item__value">{{ order.pickupAddress }} → {{ order.destinationAddress }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'DRIVER.SCHEDULED' | translate }}</span>
              <span class="detail-item__value">{{ order.scheduledAt | appDate:'medium' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">{{ 'DRIVER.TYPE' | translate }}</span>
              <span class="detail-item__value">{{ order.vehicleTypeName | catalogLabel:'vehicle' }} · {{ order.cargoTypeName | catalogLabel:'cargo' }}</span>
            </div>
            @if (order.price) {
              <div class="detail-item">
                <span class="detail-item__label">{{ 'CUSTOMER.PROPOSED_PRICE' | translate }}</span>
                <span class="detail-item__value">{{ order.price }}</span>
              </div>
            }
            @if (order.districtName) {
              <div class="detail-item">
                <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
                <span class="detail-item__value">{{ order.districtName | catalogLabel:'district' }}</span>
              </div>
            }
            @if (order.customerPhone) {
              <div class="detail-item">
                <span class="detail-item__label">{{ 'REGISTER.PHONE' | translate }}</span>
                <span class="detail-item__value">{{ order.customerPhone }}</span>
              </div>
            }
          </div>

          @if (isOwner && order.status === 'Pending') {
            <div class="form-actions panel-block">
              <p class="hint">{{ 'DRIVER.OWN_ORDER_HINT' | translate }}</p>
              <button type="button" class="btn btn--danger" [disabled]="busy" (click)="cancel()">
                {{ 'CUSTOMER.CANCEL_ORDER' | translate }}
              </button>
            </div>
          }

          @if (!isOwner && order.status === 'Pending') {
            <div class="panel-block">
              <h2 class="panel__title">{{ 'DRIVER.ACCEPT_ORDER' | translate }}</h2>
              @if (!matchingVehicles.length) {
                <div class="empty">
                  <p class="empty__title">{{ 'DRIVER.NO_MATCHING_VEHICLE' | translate }}</p>
                  <p class="empty__text">{{ 'DRIVER.NO_MATCHING_VEHICLE_HINT' | translate }}</p>
                  <a routerLink="/driver/vehicles" class="btn btn--sm" style="margin-top:0.85rem">{{ 'DRIVER.ADD_VEHICLE' | translate }}</a>
                </div>
              } @else {
                <form class="form-grid" [formGroup]="form" (ngSubmit)="accept()">
                  <label class="field">
                    <span class="field__label">{{ 'DRIVER.SELECT_VEHICLE' | translate }}</span>
                    <select formControlName="vehicleId">
                      @for (v of matchingVehicles; track v.id) {
                        <option [value]="v.id">{{ v.plateNumber }} ({{ v.vehicleTypeName | catalogLabel:'vehicle' }})</option>
                      }
                    </select>
                  </label>
                  <div class="form-actions">
                    <button class="btn btn--xs" type="submit" [disabled]="form.invalid || busy">
                      {{ 'DRIVER.ACCEPT_ORDER' | translate }}
                    </button>
                  </div>
                </form>
              }
            </div>
          }

          @if (!isOwner && (order.status === 'Accepted' || order.status === 'InProgress')) {
            <div class="form-actions panel-block">
              @if (order.status === 'Accepted') {
                <button type="button" class="btn" [disabled]="busy" (click)="start()">{{ 'DRIVER.START' | translate }}</button>
                <button type="button" class="btn btn--danger" [disabled]="busy" (click)="cancel()">{{ 'CUSTOMER.CANCEL_ORDER' | translate }}</button>
              }
              @if (order.status === 'InProgress') {
                <button type="button" class="btn" [disabled]="busy" (click)="complete()">{{ 'DRIVER.COMPLETE' | translate }}</button>
              }
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
export class DriverOrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private language = inject(LanguageService);
  order?: Order;
  matchingVehicles: Vehicle[] = [];
  message = '';
  error = '';
  busy = false;

  form = this.fb.group({ vehicleId: ['', Validators.required] });

  get isOwner(): boolean {
    const userId = this.auth.currentUser()?.id;
    return !!userId && !!this.order && this.order.customerId === userId;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getOrder(id).subscribe({
      next: o => {
        this.order = o;
        if (!this.isOwner) this.loadVehicles();
      },
      error: () => this.error = this.language.instant('ERRORS.GENERIC')
    });
  }

  badgeClass(status: string): string {
    return `badge--${status.replace(/\s/g, '').toLowerCase()}`;
  }

  loadVehicles(): void {
    this.api.getVehicles().subscribe(v => {
      this.matchingVehicles = v.filter(x => x.isActive && x.vehicleTypeId === this.order?.vehicleTypeId);
      if (this.matchingVehicles[0]) this.form.patchValue({ vehicleId: this.matchingVehicles[0].id });
    });
  }

  accept(): void {
    if (!this.order || this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    this.api.acceptOrder(this.order.id, this.form.value.vehicleId!).subscribe({
      next: o => {
        this.order = o;
        this.message = this.language.instant('DRIVER.ACCEPTED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('DRIVER.ACCEPT_FAILED');
        this.busy = false;
      }
    });
  }

  start(): void {
    if (!this.order || this.busy) return;
    this.busy = true;
    this.api.startOrder(this.order.id).subscribe({
      next: o => {
        this.order = o;
        this.message = this.language.instant('DRIVER.STARTED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }

  complete(): void {
    if (!this.order || this.busy) return;
    this.busy = true;
    this.api.completeOrder(this.order.id).subscribe({
      next: o => {
        this.order = o;
        this.message = this.language.instant('DRIVER.COMPLETED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }

  cancel(): void {
    if (!this.order || this.busy) return;
    this.busy = true;
    this.api.cancelOrder(this.order.id, this.language.instant('DRIVER.CANCEL_REASON')).subscribe({
      next: o => {
        this.order = o;
        this.message = this.language.instant('CUSTOMER.ORDER_CANCELLED');
        this.busy = false;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }
}
