import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { CargoType, District, Order, Region, VehicleType } from '../../core/models/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-marketplace-home',
  standalone: true,
  imports: [AppDatePipe, CatalogLabelPipe, DecimalPipe, FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="page marketplace">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.APP_NAME' | translate }}</p>
          <h1 class="page-title">{{ 'MARKETPLACE.TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'MARKETPLACE.SUBTITLE' | translate }}</p>
        </div>
        <div class="page-actions">
          <a routerLink="/drivers" class="btn btn--ghost">{{ 'NAV.AVAILABLE_DRIVERS' | translate }}</a>
          @if (auth.currentUser()?.role === 'Customer' || auth.currentUser()?.role === 'Driver') {
            <a routerLink="/customer/orders/new" class="btn">{{ 'CUSTOMER.CREATE_ORDER' | translate }}</a>
          } @else if (!auth.currentUser()) {
            <a routerLink="/register/customer" class="btn">{{ 'MARKETPLACE.POST_ORDER' | translate }}</a>
          }
        </div>
      </header>

      <div class="filters-panel">
        <div class="filters-grid">
          <label class="field">
            <span class="field__label">{{ 'LOCATION.REGION' | translate }}</span>
            <select [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (r of regions; track r.id) {
                <option [value]="r.id">{{ r.name | catalogLabel:'region' }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
            <select [(ngModel)]="districtId" (ngModelChange)="onFilterChange()" [disabled]="!regionId">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (d of districts; track d.id) {
                <option [value]="d.id">{{ d.name | catalogLabel:'district' }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.VEHICLE_TYPE' | translate }}</span>
            <select [(ngModel)]="vehicleTypeId" (ngModelChange)="onFilterChange()">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (t of vehicleTypes; track t.id) {
                <option [value]="t.id">{{ t.name | catalogLabel:'vehicle' }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">{{ 'CUSTOMER.CARGO_TYPE' | translate }}</span>
            <select [(ngModel)]="cargoTypeId" (ngModelChange)="onFilterChange()">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (t of cargoTypes; track t.id) {
                <option [value]="t.id">{{ t.name | catalogLabel:'cargo' }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">{{ 'MARKETPLACE.FROM_DATE' | translate }}</span>
            <input type="date" [(ngModel)]="fromDate" (ngModelChange)="onFilterChange()" />
          </label>
        </div>
        <button type="button" class="btn btn--ghost btn--sm filters-panel__clear" (click)="clearFilters()">
          {{ 'MARKETPLACE.CLEAR_FILTERS' | translate }}
        </button>
      </div>

      <div class="panel">
        @if (!loading && !error && orders.length) {
          <div class="list-toolbar">
            <p class="list-toolbar__count">
              {{ 'COMMON.SHOWING' | translate:{ from: rangeFrom, to: rangeTo, total: totalCount } }}
            </p>
          </div>
        }

        @if (loading) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error) {
          <p class="error">{{ error }}</p>
        } @else if (!orders.length) {
          <div class="empty">
            <p class="empty__title">{{ 'MARKETPLACE.EMPTY' | translate }}</p>
            <p class="empty__text">{{ 'MARKETPLACE.EMPTY_HINT' | translate }}</p>
          </div>
        } @else {
          <div class="stack stack--orders">
            @for (order of orders; track order.id) {
              <a class="order-card" [routerLink]="orderLink(order)">
                <div class="order-card__head">
                  <div class="order-card__identity">
                    <span class="order-card__id">{{ order.orderNumber }}</span>
                    <span class="badge badge--pending">{{ 'STATUS.Pending' | translate }}</span>
                  </div>
                  @if (order.price) {
                    <div class="order-card__price">
                      <span class="order-card__price-value">{{ order.price | number:'1.0-0' }}</span>
                      <span class="order-card__price-unit">{{ 'COMMON.CURRENCY' | translate }}</span>
                    </div>
                  } @else {
                    <span class="order-card__price-empty">{{ 'MARKETPLACE.PRICE_NEGOTIABLE' | translate }}</span>
                  }
                </div>

                <div class="order-card__route">
                  <div class="route-leg">
                    <span class="route-leg__label">{{ 'MARKETPLACE.FROM' | translate }}</span>
                    <span class="route-leg__value">{{ order.pickupAddress }}</span>
                  </div>
                  <div class="route-leg">
                    <span class="route-leg__label">{{ 'MARKETPLACE.TO' | translate }}</span>
                    <span class="route-leg__value">{{ order.destinationAddress }}</span>
                  </div>
                </div>

                <dl class="order-card__facts">
                  <div class="fact">
                    <dt>{{ 'LOCATION.REGION' | translate }}</dt>
                    <dd>{{ order.regionName | catalogLabel:'region' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>{{ 'LOCATION.DISTRICT' | translate }}</dt>
                    <dd>{{ order.districtName | catalogLabel:'district' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>{{ 'CUSTOMER.VEHICLE_TYPE' | translate }}</dt>
                    <dd>{{ order.vehicleTypeName | catalogLabel:'vehicle' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>{{ 'CUSTOMER.CARGO_TYPE' | translate }}</dt>
                    <dd>{{ order.cargoTypeName | catalogLabel:'cargo' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>{{ 'CUSTOMER.CONTACT_PHONE' | translate }}</dt>
                    <dd class="fact__phone">{{ order.customerPhone || '—' }}</dd>
                  </div>
                  <div class="fact fact--wide">
                    <dt>{{ 'CUSTOMER.SCHEDULED' | translate }}</dt>
                    <dd>{{ order.scheduledAt | appDate:'medium' }}</dd>
                  </div>
                </dl>
                @if (isPhoneMasked(order.customerPhone)) {
                  <p class="order-card__hint">
                    {{ (auth.currentUser() ? 'MARKETPLACE.SUB_FOR_PHONE' : 'DRIVERS.LOGIN_FOR_PHONE') | translate }}
                  </p>
                }
              </a>
            }
          </div>

          @if (totalPages > 1) {
            <nav class="pagination" [attr.aria-label]="'COMMON.PAGINATION' | translate">
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                [disabled]="page <= 1 || loading"
                (click)="goToPage(page - 1)"
              >
                {{ 'COMMON.PREVIOUS' | translate }}
              </button>

              <div class="pagination__pages">
                @for (p of pageNumbers; track p) {
                  @if (p === '…') {
                    <span class="pagination__ellipsis">…</span>
                  } @else {
                    <button
                      type="button"
                      class="pagination__page"
                      [class.pagination__page--active]="p === page"
                      [disabled]="loading"
                      (click)="goToPage(+p)"
                    >
                      {{ p }}
                    </button>
                  }
                }
              </div>

              <button
                type="button"
                class="btn btn--ghost btn--sm"
                [disabled]="page >= totalPages || loading"
                (click)="goToPage(page + 1)"
              >
                {{ 'COMMON.NEXT' | translate }}
              </button>
            </nav>
          }
        }
      </div>
    </section>
  `
})
export class MarketplaceHomeComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private language = inject(LanguageService);

  orders: Order[] = [];
  regions: Region[] = [];
  districts: District[] = [];
  vehicleTypes: VehicleType[] = [];
  cargoTypes: CargoType[] = [];
  regionId = '';
  districtId = '';
  vehicleTypeId = '';
  cargoTypeId = '';
  fromDate = '';
  loading = true;
  error = '';

  page = 1;
  readonly pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  isPhoneMasked(phone: string | null | undefined): boolean {
    return !phone || phone.includes('*');
  }

  get rangeFrom(): number {
    if (!this.totalCount) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get rangeTo(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get pageNumbers(): Array<number | '…'> {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    if (current <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    }
    if (current >= total - 2) {
      pages.add(total - 1);
      pages.add(total - 2);
      pages.add(total - 3);
    }

    const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: Array<number | '…'> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push('…');
      result.push(p);
      prev = p;
    }
    return result;
  }

  ngOnInit(): void {
    forkJoin({
      regions: this.api.getRegions().pipe(catchError(() => of([] as Region[]))),
      vehicles: this.api.getVehicleTypes().pipe(catchError(() => of([] as VehicleType[]))),
      cargo: this.api.getCargoTypes().pipe(catchError(() => of([] as CargoType[])))
    }).subscribe(({ regions, vehicles, cargo }) => {
      this.regions = regions;
      this.vehicleTypes = vehicles;
      this.cargoTypes = cargo;
      this.reload();
    });
  }

  onRegionChange(): void {
    this.districtId = '';
    if (!this.regionId) {
      this.districts = [];
      this.onFilterChange();
      return;
    }
    this.api.getDistricts(this.regionId).pipe(catchError(() => of([] as District[]))).subscribe(d => {
      this.districts = d.filter(x => x.isActive);
      this.onFilterChange();
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.reload();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.reload(true);
  }

  reload(scrollToList = false): void {
    this.loading = true;
    this.error = '';
    const params: Record<string, string | number> = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: 'scheduledAt',
      sortDirection: 'asc'
    };
    if (this.districtId) params['districtId'] = this.districtId;
    if (this.vehicleTypeId) params['vehicleTypeId'] = this.vehicleTypeId;
    if (this.cargoTypeId) params['cargoTypeId'] = this.cargoTypeId;
    if (this.fromDate) params['fromDate'] = new Date(this.fromDate).toISOString();

    this.api.getMarketplaceOrders(params).subscribe({
      next: res => {
        this.orders = res.items;
        this.page = res.page;
        this.totalCount = res.totalCount;
        this.totalPages = res.totalPages;
        this.loading = false;
        if (scrollToList) {
          document.querySelector('.marketplace .panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
      error: () => {
        this.error = this.language.instant('ERRORS.GENERIC');
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.regionId = '';
    this.districtId = '';
    this.districts = [];
    this.vehicleTypeId = '';
    this.cargoTypeId = '';
    this.fromDate = '';
    this.page = 1;
    this.reload();
  }

  orderLink(order: Order): string {
    const role = this.auth.currentUser()?.role;
    if (role === 'Driver') return `/driver/orders/${order.id}`;
    if (role === 'Customer') return `/orders/${order.id}`;
    if (role === 'Admin') return `/admin/orders`;
    return `/orders/${order.id}`;
  }
}
