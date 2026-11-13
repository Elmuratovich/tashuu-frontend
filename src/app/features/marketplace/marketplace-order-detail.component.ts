import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { Order } from '../../core/models/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-marketplace-order-detail',
  standalone: true,
  imports: [AppDatePipe, CatalogLabelPipe, RouterLink, TranslatePipe],
  template: `
    @if (order) {
      <section class="page">
        <header class="page-header">
          <div class="page-header__copy">
            <p class="page-kicker">{{ 'MARKETPLACE.TITLE' | translate }}</p>
            <h1 class="page-title">{{ order.orderNumber }}</h1>
            <p class="page-subtitle">
              <span class="badge badge--pending">{{ 'STATUS.Pending' | translate }}</span>
            </p>
          </div>
          <div class="page-actions">
            <a routerLink="/" class="btn btn--ghost">{{ 'COMMON.HOME' | translate }}</a>
          </div>
        </header>

        <div class="panel">
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
            <div class="detail-item">
              <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
              <span class="detail-item__value">{{ order.districtName | catalogLabel:'district' }}</span>
            </div>
            @if (order.customerPhone) {
              <div class="detail-item">
                <span class="detail-item__label">{{ 'REGISTER.PHONE' | translate }}</span>
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
          </div>

          <div class="cta-banner">
            @if (!auth.currentUser()) {
              <p>{{ 'MARKETPLACE.LOGIN_TO_ACT' | translate }}</p>
              <div class="page-actions">
                <a routerLink="/login" class="btn">{{ 'COMMON.LOGIN' | translate }}</a>
                <a routerLink="/register/driver" class="btn btn--ghost">{{ 'NAV.REGISTER_DRIVER' | translate }}</a>
              </div>
            } @else if (auth.currentUser()?.role === 'Driver') {
              @if (auth.currentUser()?.id === order.customerId) {
                <a [routerLink]="['/driver/orders', order.id]" class="btn">{{ 'DRIVER.VIEW_MY_ORDER' | translate }}</a>
              } @else {
                <a [routerLink]="['/driver/orders', order.id]" class="btn">{{ 'DRIVER.ACCEPT_ORDER' | translate }}</a>
              }
            } @else if (auth.currentUser()?.role === 'Customer') {
              <a routerLink="/customer/orders/new" class="btn">{{ 'CUSTOMER.CREATE_ORDER' | translate }}</a>
            }
          </div>
        </div>
      </section>
    } @else if (error) {
      <div class="empty">
        <p class="empty__title">{{ error }}</p>
        <a routerLink="/" class="btn btn--sm" style="margin-top:0.85rem">{{ 'COMMON.HOME' | translate }}</a>
      </div>
    } @else {
      <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
    }
  `
})
export class MarketplaceOrderDetailComponent implements OnInit {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private language = inject(LanguageService);
  order?: Order;
  error = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getMarketplaceOrder(id).subscribe({
      next: o => this.order = o,
      error: () => this.error = this.language.instant('MARKETPLACE.NOT_FOUND')
    });
  }
}
