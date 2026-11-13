import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { AdminUserDetail } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CatalogLabelPipe } from '../../../shared/pipes/catalog-label.pipe';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [RouterLink, TranslatePipe, AppDatePipe, CatalogLabelPipe, DecimalPipe],
  template: `
    <section class="page">
      @if (loading) {
        <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error) {
        <div class="empty">
          <p class="empty__title">{{ error }}</p>
          <a routerLink="/admin/users" class="btn btn--sm" style="margin-top:0.85rem">{{ 'ADMIN.USERS' | translate }}</a>
        </div>
      } @else if (user) {
        <header class="page-header">
          <div class="page-header__copy">
            <p class="page-kicker">{{ 'ADMIN.USERS' | translate }}</p>
            <h1 class="page-title">{{ user.firstName }} {{ user.lastName }}</h1>
            <p class="page-subtitle">
              <span class="badge" [class]="roleBadgeClass(user.role)">{{ ('ROLES.' + user.role) | translate }}</span>
              <span class="badge" [class]="user.accountStatus === 'Active' ? 'badge--active' : 'badge--blocked'" style="margin-left:0.4rem">
                {{ user.accountStatus === 'Active' ? ('ADMIN.STATUS_ACTIVE' | translate) : ('ADMIN.STATUS_BLOCKED' | translate) }}
              </span>
            </p>
          </div>
          <div class="page-actions">
            <a routerLink="/admin/users" class="btn btn--ghost">{{ 'COMMON.BACK' | translate }}</a>
            @if (user.role === 'Driver') {
              @if (user.hasActiveSubscription) {
                <button type="button" class="btn btn--danger btn--sm" [disabled]="busy" (click)="askCancelPaid()">
                  {{ 'ADMIN.CANCEL_PAID' | translate }}
                </button>
              } @else {
                <button type="button" class="btn btn--sm" [disabled]="busy" (click)="askMarkPaid()">
                  {{ 'ADMIN.MARK_PAID' | translate }}
                </button>
              }
            }
            @if (user.accountStatus === 'Active') {
              <button type="button" class="btn btn--ghost" [disabled]="busy" (click)="block()">{{ 'ADMIN.BLOCK' | translate }}</button>
            } @else {
              <button type="button" class="btn" [disabled]="busy" (click)="unblock()">{{ 'ADMIN.UNBLOCK' | translate }}</button>
            }
          </div>
        </header>

        @if (message) { <p class="success-msg">{{ message }}</p> }

        <div class="detail-stack">
          <div class="panel">
            <h2 class="panel__title">{{ 'ADMIN.USER_ACCOUNT' | translate }}</h2>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">{{ 'LOGIN.EMAIL' | translate }}</span>
                <span class="detail-item__value">{{ user.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'REGISTER.PHONE' | translate }}</span>
                <span class="detail-item__value">{{ user.phoneNumber || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.EMAIL_CONFIRMED' | translate }}</span>
                <span class="detail-item__value">{{ user.emailConfirmed ? ('COMMON.YES' | translate) : ('COMMON.NO' | translate) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.CREATED_AT' | translate }}</span>
                <span class="detail-item__value">{{ user.createdAt | appDate:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.UPDATED_AT' | translate }}</span>
                <span class="detail-item__value">{{ user.updatedAt | appDate:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.USER_ID' | translate }}</span>
                <span class="detail-item__value detail-item__mono">{{ user.id }}</span>
              </div>
            </div>
          </div>

          @if (user.customer) {
            <div class="panel">
              <h2 class="panel__title">{{ 'ADMIN.CUSTOMER_PROFILE' | translate }}</h2>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
                  <span class="detail-item__value">
                    {{ (user.customer.defaultDistrictName | catalogLabel:'district') || '—' }}
                    @if (user.customer.regionName) {
                      · {{ user.customer.regionName | catalogLabel:'region' }}
                    }
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'ADMIN.PREFERRED_LANGUAGE' | translate }}</span>
                  <span class="detail-item__value">{{ user.customer.preferredLanguage || '—' }}</span>
                </div>
              </div>
            </div>
          }

          @if (user.driver) {
            <div class="panel">
              <h2 class="panel__title">{{ 'ADMIN.DRIVER_PROFILE' | translate }}</h2>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
                  <span class="detail-item__value">
                    {{ user.driver.districtName | catalogLabel:'district' }}
                    · {{ user.driver.regionName | catalogLabel:'region' }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'DRIVER.STATUS' | translate }}</span>
                  <span class="detail-item__value">
                    {{ user.driver.isAvailable ? ('COMMON.ACTIVE' | translate) : ('COMMON.INACTIVE' | translate) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'DRIVER.LICENSE_NUMBER' | translate }}</span>
                  <span class="detail-item__value">{{ user.driver.licenseNumber || '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">{{ 'DRIVER.RATING' | translate }}</span>
                  <span class="detail-item__value">
                    {{ 'DRIVER.RATING_REVIEWS' | translate:{ rating: user.driver.averageRating, count: user.driver.reviewCount } }}
                  </span>
                </div>
                <div class="detail-item detail-item--wide">
                  <span class="detail-item__label">{{ 'DRIVER.AVAILABILITY_NOTE' | translate }}</span>
                  <span class="detail-item__value">{{ user.driver.availabilityNote || '—' }}</span>
                </div>
              </div>

              <h3 class="panel__subtitle">{{ 'NAV.VEHICLES' | translate }}</h3>
              @if (!user.driver.vehicles.length) {
                <p class="list-item__sub">{{ 'DRIVER.NO_VEHICLES' | translate }}</p>
              } @else {
                <div class="stack">
                  @for (v of user.driver.vehicles; track v.id) {
                    <div class="list-item">
                      <div class="list-item__main">
                        <p class="list-item__title">{{ v.plateNumber }}</p>
                        <p class="list-item__sub">
                          {{ v.vehicleTypeName | catalogLabel:'vehicle' }}
                          @if (v.brand || v.model) { · {{ v.brand }} {{ v.model }} }
                          @if (v.capacityKg) { · {{ v.capacityKg }} kg }
                        </p>
                      </div>
                      <span class="badge" [class]="v.isActive ? 'badge--active' : 'badge--inactive'">
                        {{ v.isActive ? ('COMMON.ACTIVE' | translate) : ('COMMON.INACTIVE' | translate) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <div class="panel">
            <h2 class="panel__title">{{ 'ADMIN.SUBSCRIPTION' | translate }}</h2>
            <p class="list-item__sub" style="margin-bottom:0.75rem">
              @if (user.hasActiveSubscription) {
                {{ 'ADMIN.SUB_ACTIVE' | translate }}
                @if (user.subscriptionEndsAt) { · {{ user.subscriptionEndsAt | appDate:'medium' }} }
              } @else {
                {{ 'ADMIN.SUB_INACTIVE' | translate }}
              }
            </p>
            @if (!user.subscriptions.length) {
              <p class="list-item__sub">{{ 'ADMIN.NO_SUBSCRIPTIONS' | translate }}</p>
            } @else {
              <div class="stack">
                @for (s of user.subscriptions; track s.id) {
                  <div class="list-item">
                    <div class="list-item__main">
                      <p class="list-item__title">
                        {{ s.amount | number:'1.0-0' }} {{ s.currency }}
                        · {{ s.status }}
                      </p>
                      <p class="list-item__sub">
                        {{ s.startsAt | appDate:'medium' }} → {{ s.endsAt | appDate:'medium' }}
                        @if (s.provider) { · {{ s.provider }} }
                        @if (s.note) { · {{ s.note }} }
                      </p>
                    </div>
                    @if (s.isActive) {
                      <span class="badge badge--active">{{ 'COMMON.ACTIVE' | translate }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="panel">
            <h2 class="panel__title">{{ 'ADMIN.ORDER_STATS' | translate }}</h2>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.POSTED_ORDERS' | translate }}</span>
                <span class="detail-item__value">
                  {{ user.orderStats.postedTotal }}
                  ({{ 'STATUS.Pending' | translate }}: {{ user.orderStats.postedPending }},
                  {{ 'STATUS.Completed' | translate }}: {{ user.orderStats.postedCompleted }},
                  {{ 'STATUS.Cancelled' | translate }}: {{ user.orderStats.postedCancelled }})
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-item__label">{{ 'ADMIN.ASSIGNED_ORDERS' | translate }}</span>
                <span class="detail-item__value">
                  {{ user.orderStats.assignedTotal }}
                  ({{ 'STATUS.InProgress' | translate }}: {{ user.orderStats.assignedInProgress }},
                  {{ 'STATUS.Completed' | translate }}: {{ user.orderStats.assignedCompleted }})
                </span>
              </div>
            </div>

            <h3 class="panel__subtitle">{{ 'ADMIN.RECENT_ORDERS' | translate }}</h3>
            @if (!user.recentOrders.length) {
              <p class="list-item__sub">{{ 'ADMIN.NO_ORDERS' | translate }}</p>
            } @else {
              <div class="stack">
                @for (o of user.recentOrders; track o.id) {
                  <a class="order-row" [routerLink]="['/admin/orders']" [queryParams]="{}" [attr.title]="o.orderNumber">
                    <div class="order-row__top">
                      <span class="order-row__id">{{ o.orderNumber }}</span>
                      <span class="badge">{{ ('ADMIN.RELATION_' + o.relation.toUpperCase()) | translate }}</span>
                      <span class="badge" [class]="'badge--' + o.status.replace(' ', '').toLowerCase()">
                        {{ ('STATUS.' + o.status) | translate }}
                      </span>
                    </div>
                    <p class="order-row__route">{{ o.pickupAddress }} → {{ o.destinationAddress }}</p>
                    <div class="order-row__meta">
                      <span>{{ o.districtName | catalogLabel:'district' }} · {{ o.vehicleTypeName | catalogLabel:'vehicle' }} · {{ o.cargoTypeName | catalogLabel:'cargo' }}</span>
                      <span>{{ o.scheduledAt | appDate:'medium' }}</span>
                      @if (o.price) { <span>{{ o.price | number:'1.0-0' }}</span> }
                    </div>
                  </a>
                }
              </div>
            }
          </div>
        </div>

        @if (payConfirmOpen) {
          <div class="confirm-backdrop" (click)="closePayConfirm()">
            <div class="confirm-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
              <p class="confirm-modal__title">
                {{ (payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID' : 'ADMIN.MARK_PAID') | translate }}
              </p>
              <p class="confirm-modal__text">
                {{ (payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID_CONFIRM' : 'ADMIN.MARK_PAID_CONFIRM')
                  | translate:{ name: user.firstName + ' ' + user.lastName } }}
              </p>
              <div class="confirm-modal__actions">
                <button type="button" class="btn btn--ghost btn--sm" (click)="closePayConfirm()" [disabled]="busy">
                  {{ 'COMMON.NO' | translate }}
                </button>
                <button type="button" class="btn btn--sm" (click)="confirmPayAction()" [disabled]="busy">
                  {{ busy ? ('COMMON.WAITING' | translate) : ('COMMON.YES' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .detail-stack { display: grid; gap: 0.85rem; }
    .panel__subtitle {
      margin: 1rem 0 0.65rem;
      font-size: 0.9375rem;
      font-weight: 700;
    }
    .detail-item--wide { grid-column: 1 / -1; }
    .detail-item__mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.75rem;
      word-break: break-all;
    }
    .badge--driver { background: #edf2ff; color: #3557c8; }
    .badge--customer { background: #e8f8f1; color: #0f9f6e; }
    .badge--admin { background: #fff6e5; color: #9a6700; }
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow-y: auto;
      padding: 1.5rem 1rem 2rem;
      background: rgba(15, 23, 42, 0.42);
    }
    .confirm-modal {
      width: min(100%, 22rem);
      padding: 1.15rem 1.2rem 1.1rem;
      border-radius: 0.9rem;
      background: #fff;
      border: 1px solid var(--tashuu-line);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
    }
    .confirm-modal__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 750;
      color: var(--tashuu-navy);
    }
    .confirm-modal__text {
      margin: 0.55rem 0 0;
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--tashuu-muted);
    }
    .confirm-modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `]
})
export class AdminUserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private language = inject(LanguageService);

  user?: AdminUserDetail;
  loading = true;
  busy = false;
  payConfirmOpen = false;
  payConfirmMode: 'activate' | 'cancel' = 'activate';
  error = '';
  message = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = this.language.instant('ERRORS.GENERIC');
      this.loading = false;
      return;
    }
    this.load(id);
  }

  roleBadgeClass(role: string): string {
    if (role === 'Driver') return 'badge--driver';
    if (role === 'Customer') return 'badge--customer';
    if (role === 'Admin') return 'badge--admin';
    return '';
  }

  load(id: string): void {
    this.loading = true;
    this.api.getAdminUser(id).subscribe({
      next: u => {
        this.user = u;
        this.loading = false;
      },
      error: () => {
        this.error = this.language.instant('ADMIN.USER_NOT_FOUND');
        this.loading = false;
      }
    });
  }

  askMarkPaid(): void {
    if (!this.user || this.busy) return;
    this.payConfirmMode = 'activate';
    this.payConfirmOpen = true;
  }

  askCancelPaid(): void {
    if (!this.user || !this.user.hasActiveSubscription || this.busy) return;
    this.payConfirmMode = 'cancel';
    this.payConfirmOpen = true;
  }

  closePayConfirm(): void {
    if (this.busy) return;
    this.payConfirmOpen = false;
  }

  confirmPayAction(): void {
    if (!this.user || this.busy) return;
    this.busy = true;
    const req$ = this.payConfirmMode === 'cancel'
      ? this.api.cancelUserSubscription(this.user.id)
      : this.api.markUserSubscriptionPaid(this.user.id);
    req$.subscribe({
      next: () => {
        this.message = this.language.instant(
          this.payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID_DONE' : 'ADMIN.MARK_PAID_DONE'
        );
        this.busy = false;
        this.payConfirmOpen = false;
        this.load(this.user!.id);
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busy = false;
      }
    });
  }

  block(): void {
    if (!this.user || this.busy) return;
    this.busy = true;
    this.api.blockUser(this.user.id).subscribe({
      next: () => {
        this.busy = false;
        this.load(this.user!.id);
      },
      error: () => { this.busy = false; }
    });
  }

  unblock(): void {
    if (!this.user || this.busy) return;
    this.busy = true;
    this.api.unblockUser(this.user.id).subscribe({
      next: () => {
        this.busy = false;
        this.load(this.user!.id);
      },
      error: () => { this.busy = false; }
    });
  }
}
