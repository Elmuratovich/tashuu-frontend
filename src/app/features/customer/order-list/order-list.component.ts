import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Order } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [RouterLink, AppDatePipe, CatalogLabelPipe, TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.APP_NAME' | translate }}</p>
          <h1 class="page-title">{{ 'CUSTOMER.MY_ORDERS' | translate }}</h1>
          <p class="page-subtitle">{{ 'CUSTOMER.ORDERS_SUBTITLE' | translate }}</p>
        </div>
        <div class="page-actions">
          <a routerLink="/customer/orders/new" class="btn">{{ 'CUSTOMER.CREATE_ORDER' | translate }}</a>
        </div>
      </header>

      <div class="panel">
        @if (loading) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (error) {
          <p class="error">{{ error }}</p>
        } @else if (!orders.length) {
          <div class="empty">
            <p class="empty__title">{{ 'CUSTOMER.NO_ORDERS' | translate }}</p>
            <p class="empty__text">{{ 'CUSTOMER.NO_ORDERS_HINT' | translate }}</p>
            <a routerLink="/customer/orders/new" class="btn btn--sm" style="margin-top:0.9rem">
              {{ 'CUSTOMER.CREATE_ORDER' | translate }}
            </a>
          </div>
        } @else {
          <div class="stack">
            @for (order of orders; track order.id) {
              <a class="order-row" [routerLink]="['/customer/orders', order.id]">
                <div class="order-row__top">
                  <span class="order-row__id">{{ order.orderNumber }}</span>
                  <span class="badge" [class]="badgeClass(order.status)">{{ ('STATUS.' + order.status) | translate }}</span>
                </div>
                <p class="order-row__route">{{ order.pickupAddress }} → {{ order.destinationAddress }}</p>
                <div class="order-row__meta">
                  <span>{{ order.districtName | catalogLabel:'district' }}</span>
                  <span>{{ 'CUSTOMER.SCHEDULED' | translate }}: {{ order.scheduledAt | appDate:'medium' }}</span>
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
export class OrderListComponent implements OnInit {
  private api = inject(ApiService);
  private language = inject(LanguageService);
  orders: Order[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.api.getOrders({ page: 1, pageSize: 50 }).subscribe({
      next: res => {
        this.orders = res.items;
        this.loading = false;
      },
      error: () => {
        this.error = this.language.instant('ERRORS.GENERIC');
        this.loading = false;
      }
    });
  }

  badgeClass(status: string): string {
    return `badge--${status.replace(/\s/g, '').toLowerCase()}`;
  }
}
