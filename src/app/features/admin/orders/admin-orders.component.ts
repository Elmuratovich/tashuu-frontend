import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Order } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [AppDatePipe, FormsModule, TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'COMMON.ORDERS' | translate }}</p>
          <h1 class="page-title">{{ 'ADMIN.ALL_ORDERS' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.ORDERS_SUBTITLE' | translate }}</p>
        </div>
      </header>

      <div class="toolbar">
        <label class="field field--inline">
          <span class="field__label">{{ 'CUSTOMER.STATUS' | translate }}</span>
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange($event)">
            <option value="">{{ 'COMMON.ALL' | translate }}</option>
            <option value="Pending">{{ 'STATUS.Pending' | translate }}</option>
            <option value="Accepted">{{ 'STATUS.Accepted' | translate }}</option>
            <option value="InProgress">{{ 'STATUS.InProgress' | translate }}</option>
            <option value="Completed">{{ 'STATUS.Completed' | translate }}</option>
            <option value="Cancelled">{{ 'STATUS.Cancelled' | translate }}</option>
          </select>
        </label>
        @if (statusFilter) {
          <button type="button" class="btn btn--outline btn--sm" (click)="onFilterChange('')">
            {{ 'MARKETPLACE.CLEAR_FILTERS' | translate }}
          </button>
        }
      </div>

      <div class="panel">
        @if (loading) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (!orders.length) {
          <div class="empty">
            <p class="empty__title">{{ 'ADMIN.NO_ORDERS' | translate }}</p>
          </div>
        } @else {
          <div class="stack">
            @for (order of orders; track order.id) {
              <div class="order-row order-row--static">
                <div class="order-row__top">
                  <span class="order-row__id">{{ order.orderNumber }}</span>
                  <span class="badge" [class]="badgeClass(order.status)">{{ ('STATUS.' + order.status) | translate }}</span>
                </div>
                <p class="order-row__route">{{ order.pickupAddress }} → {{ order.destinationAddress }}</p>
                <div class="order-row__meta">
                  <span>{{ order.customerName }}</span>
                  @if (order.driverName) { <span>{{ order.driverName }}</span> }
                  <span>{{ order.scheduledAt | appDate:'medium' }}</span>
                </div>
                @if (canCancel(order)) {
                  <div class="form-actions" style="margin-top:0.75rem">
                    <button type="button" class="btn btn--danger btn--sm" (click)="cancel(order)">
                      {{ 'CUSTOMER.CANCEL_ORDER' | translate }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
        @if (message) { <p class="success-msg">{{ message }}</p> }
      </div>
    </section>
  `
})
export class AdminOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private language = inject(LanguageService);
  private readonly FILTER_STORAGE_KEY = 'admin_orders_status_filter';
  orders: Order[] = [];
  statusFilter = '';
  loading = true;
  message = '';

  ngOnInit(): void {
    const saved = localStorage.getItem(this.FILTER_STORAGE_KEY);
    if (saved) {
      this.statusFilter = saved;
    }
    this.reload();
  }

  onFilterChange(status: string): void {
    this.statusFilter = status;
    if (status) {
      localStorage.setItem(this.FILTER_STORAGE_KEY, status);
    } else {
      localStorage.removeItem(this.FILTER_STORAGE_KEY);
    }
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: 1, pageSize: 100 };
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.api.getOrders(params).subscribe({
      next: r => {
        this.orders = r.items;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  badgeClass(status: string): string {
    return `badge--${status.replace(/\s/g, '').toLowerCase()}`;
  }

  canCancel(order: Order): boolean {
    return order.status === 'Pending' || order.status === 'Accepted' || order.status === 'InProgress';
  }

  cancel(order: Order): void {
    this.api.cancelOrder(order.id, this.language.instant('ADMIN.CANCEL_REASON')).subscribe({
      next: () => {
        this.message = this.language.instant('CUSTOMER.ORDER_CANCELLED');
        this.reload();
      }
    });
  }
}
