import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { DriverProfile, Order, Vehicle } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

type DriverTab = 'available' | 'mine' | 'posted';

@Component({
  selector: 'app-available-orders',
  standalone: true,
  imports: [RouterLink, AppDatePipe, CatalogLabelPipe, TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.APP_NAME' | translate }}</p>
          <h1 class="page-title">{{ 'DRIVER.ORDERS_HUB' | translate }}</h1>
          <p class="page-subtitle">{{ 'DRIVER.ORDERS_SUBTITLE' | translate }}</p>
        </div>
        <div class="page-actions">
          <a routerLink="/customer/orders/new" class="btn">{{ 'CUSTOMER.CREATE_ORDER' | translate }}</a>
        </div>
      </header>

      @if (profile && readiness.length) {
        <div class="ready-banner">
          <div>
            <p class="ready-banner__title">{{ 'DRIVER.SETUP_TITLE' | translate }}</p>
            <ul class="ready-banner__list">
              @for (item of readiness; track item) {
                <li>{{ item | translate }}</li>
              }
            </ul>
          </div>
          <div class="page-actions">
            @if (!vehicles.length) {
              <a routerLink="/driver/vehicles" class="btn btn--sm">{{ 'DRIVER.ADD_VEHICLE' | translate }}</a>
            }
            @if (!profile.isAvailable) {
              <a routerLink="/driver/profile" class="btn btn--ghost btn--sm">{{ 'COMMON.PROFILE' | translate }}</a>
            }
          </div>
        </div>
      }

      <div class="tabs" role="tablist">
        <button type="button" class="tabs__btn" [class.tabs__btn--active]="tab === 'available'" (click)="tab = 'available'">
          {{ 'DRIVER.AVAILABLE_ORDERS' | translate }}
          <span class="tabs__count">{{ availableOrders.length }}</span>
        </button>
        <button type="button" class="tabs__btn" [class.tabs__btn--active]="tab === 'mine'" (click)="tab = 'mine'">
          {{ 'DRIVER.MY_JOBS' | translate }}
          <span class="tabs__count">{{ myOrders.length }}</span>
        </button>
        <button type="button" class="tabs__btn" [class.tabs__btn--active]="tab === 'posted'" (click)="tab = 'posted'">
          {{ 'DRIVER.MY_POSTED' | translate }}
          <span class="tabs__count">{{ postedOrders.length }}</span>
        </button>
      </div>

      <div class="panel">
        @if (loading) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error) {
          <p class="error">{{ error }}</p>
        } @else if (!visibleOrders.length) {
          <div class="empty">
            <p class="empty__title">{{ emptyTitleKey | translate }}</p>
            <p class="empty__text">{{ emptyHintKey | translate }}</p>
            @if (tab === 'posted') {
              <a routerLink="/customer/orders/new" class="btn btn--sm" style="margin-top:0.85rem">
                {{ 'CUSTOMER.CREATE_ORDER' | translate }}
              </a>
            }
          </div>
        } @else {
          <div class="stack">
            @for (order of visibleOrders; track order.id) {
              <a class="order-row" [routerLink]="['/driver/orders', order.id]">
                <div class="order-row__top">
                  <span class="order-row__id">{{ order.orderNumber }}</span>
                  <span class="badge" [class]="badgeClass(order.status)">{{ ('STATUS.' + order.status) | translate }}</span>
                </div>
                <p class="order-row__route">{{ order.pickupAddress }} → {{ order.destinationAddress }}</p>
                <div class="order-row__meta">
                  <span>{{ order.vehicleTypeName | catalogLabel:'vehicle' }} · {{ order.cargoTypeName | catalogLabel:'cargo' }}</span>
                  <span>{{ order.scheduledAt | appDate:'medium' }}</span>
                  @if (order.price) { <span>{{ order.price }}</span> }
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `
})
export class AvailableOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private language = inject(LanguageService);
  tab: DriverTab = 'available';
  availableOrders: Order[] = [];
  myOrders: Order[] = [];
  postedOrders: Order[] = [];
  vehicles: Vehicle[] = [];
  profile?: DriverProfile;
  loading = true;
  error = '';
  readiness: string[] = [];

  get visibleOrders(): Order[] {
    if (this.tab === 'available') return this.availableOrders;
    if (this.tab === 'posted') return this.postedOrders;
    return this.myOrders;
  }

  get emptyTitleKey(): string {
    if (this.tab === 'available') return 'DRIVER.NO_ORDERS';
    if (this.tab === 'posted') return 'DRIVER.NO_POSTED';
    return 'DRIVER.NO_JOBS';
  }

  get emptyHintKey(): string {
    if (this.tab === 'available') return 'DRIVER.NO_ORDERS_HINT';
    if (this.tab === 'posted') return 'DRIVER.NO_POSTED_HINT';
    return 'DRIVER.NO_JOBS_HINT';
  }

  ngOnInit(): void {
    forkJoin({
      profile: this.api.getDriverProfile().pipe(catchError(() => of(null))),
      vehicles: this.api.getVehicles().pipe(catchError(() => of([] as Vehicle[]))),
      available: this.api.getOrders({ page: 1, pageSize: 50, availableOnly: true }).pipe(catchError(() => of(null))),
      mine: this.api.getOrders({ page: 1, pageSize: 50 }).pipe(catchError(() => of(null))),
      posted: this.api.getOrders({ page: 1, pageSize: 50, postedOnly: true }).pipe(catchError(() => of(null)))
    }).subscribe(({ profile, vehicles, available, mine, posted }) => {
      this.profile = profile ?? undefined;
      this.vehicles = vehicles.filter(v => v.isActive);
      this.availableOrders = available?.items ?? [];
      this.myOrders = mine?.items ?? [];
      this.postedOrders = posted?.items ?? [];
      if (!available || !mine || !posted) this.error = this.language.instant('ERRORS.GENERIC');
      this.refreshReady();
      this.loading = false;
    });
  }

  badgeClass(status: string): string {
    return `badge--${status.replace(/\s/g, '').toLowerCase()}`;
  }

  private refreshReady(): void {
    const items: string[] = [];
    if (!this.vehicles.length) items.push('DRIVER.SETUP_NEED_VEHICLE');
    if (this.profile && !this.profile.isAvailable) items.push('DRIVER.SETUP_NEED_AVAILABLE');
    this.readiness = items;
  }
}
