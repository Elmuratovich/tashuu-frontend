import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { UserListItem } from '../../../core/models/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { LocationCascadeComponent } from '../../../shared/location-cascade/location-cascade.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, AppDatePipe, LocationCascadeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'NAV.USERS' | translate }}</p>
          <h1 class="page-title">{{ 'ADMIN.USERS' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.USERS_SUBTITLE' | translate }}</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn--sm admin-create-btn" (click)="openCreate()">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {{ 'ADMIN.CREATE_USER' | translate }}
          </button>
        </div>
      </header>

      <div class="filters-panel">
        <div class="filters-grid filters-grid--3">
          <label class="field">
            <span class="field__label">{{ 'COMMON.SEARCH' | translate }}</span>
            <input
              [(ngModel)]="search"
              (ngModelChange)="onFilterChange()"
              [placeholder]="'ADMIN.SEARCH_PLACEHOLDER' | translate"
            />
          </label>
          <label class="field">
            <span class="field__label">{{ 'ADMIN.ROLE_FILTER' | translate }}</span>
            <select [(ngModel)]="role" (ngModelChange)="onFilterChange()">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="Driver">{{ 'ROLES.Driver' | translate }}</option>
              <option value="Customer">{{ 'ROLES.Customer' | translate }}</option>
              <option value="Admin">{{ 'ROLES.Admin' | translate }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">{{ 'ADMIN.STATUS' | translate }}</span>
            <select [(ngModel)]="accountStatus" (ngModelChange)="onFilterChange()">
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="Active">{{ 'ADMIN.STATUS_ACTIVE' | translate }}</option>
              <option value="Blocked">{{ 'ADMIN.STATUS_BLOCKED' | translate }}</option>
            </select>
          </label>
        </div>
        <button type="button" class="btn btn--sm" (click)="clearFilters()">
          {{ 'MARKETPLACE.CLEAR_FILTERS' | translate }}
        </button>
      </div>

      <div class="panel">
        @if (loading && !users.length) {
          <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
        } @else if (!users.length) {
          <div class="empty">
            <p class="empty__title">{{ 'ADMIN.NO_USERS' | translate }}</p>
          </div>
        } @else {
          @if (totalCount) {
            <p class="results-meta">
              {{ 'COMMON.SHOWING' | translate:{ from: rangeFrom, to: rangeTo, total: totalCount } }}
            </p>
          }

          <div class="user-table" role="table">
            <div class="user-table__head" role="row">
              <span>{{ 'ADMIN.COL_USER' | translate }}</span>
              <span>{{ 'ADMIN.ROLE_FILTER' | translate }}</span>
              <span>{{ 'ADMIN.STATUS' | translate }}</span>
              <span>{{ 'ADMIN.SUBSCRIPTION' | translate }}</span>
              <span>{{ 'ADMIN.COL_ACTIONS' | translate }}</span>
            </div>

            @for (u of users; track u.id) {
              <div
                class="user-row"
                role="row"
                [class.user-row--driver]="u.role === 'Driver'"
                [class.user-row--customer]="u.role === 'Customer'"
                [class.user-row--admin]="u.role === 'Admin'"
              >
                <div class="user-row__user" role="cell">
                  <p class="user-row__name">{{ u.firstName }} {{ u.lastName }}</p>
                  <p class="user-row__meta">{{ u.email }}</p>
                  @if (u.phoneNumber) {
                    <p class="user-row__meta">{{ u.phoneNumber }}</p>
                  }
                </div>

                <div class="user-row__role" role="cell">
                  <span class="badge" [class]="roleBadgeClass(u.role)">
                    {{ ('ROLES.' + u.role) | translate }}
                  </span>
                </div>

                <div class="user-row__status" role="cell">
                  <span class="badge" [class]="u.accountStatus === 'Active' ? 'badge--active' : 'badge--blocked'">
                    {{ u.accountStatus === 'Active' ? ('ADMIN.STATUS_ACTIVE' | translate) : ('ADMIN.STATUS_BLOCKED' | translate) }}
                  </span>
                </div>

                <div class="user-row__sub" role="cell">
                  @if (u.role === 'Driver') {
                    @if (u.hasActiveSubscription) {
                      <span class="sub sub--ok">{{ 'ADMIN.SUB_ACTIVE' | translate }}</span>
                      @if (u.subscriptionEndsAt) {
                        <span class="user-row__meta">{{ u.subscriptionEndsAt | appDate:'medium' }}</span>
                      }
                    } @else {
                      <span class="sub sub--off">{{ 'ADMIN.SUB_INACTIVE' | translate }}</span>
                    }
                  } @else {
                    <span class="user-row__meta">—</span>
                  }
                </div>

                <div class="user-row__actions" role="cell">
                  <a
                    class="icon-btn"
                    [routerLink]="['/admin/users', u.id]"
                    [attr.title]="'ADMIN.VIEW' | translate"
                    [attr.aria-label]="'ADMIN.VIEW' | translate"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>
                      <circle cx="12" cy="12" r="2.4"/>
                    </svg>
                  </a>
                  <button
                    type="button"
                    class="icon-btn"
                    (click)="startEdit(u)"
                    [attr.title]="'ADMIN.EDIT' | translate"
                    [attr.aria-label]="'ADMIN.EDIT' | translate"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/>
                      <path d="M13.5 6.5l3 3"/>
                    </svg>
                  </button>
                  @if (u.role === 'Driver') {
                    @if (u.hasActiveSubscription) {
                      <button
                        type="button"
                        class="icon-btn icon-btn--danger"
                        [disabled]="busyId === u.id"
                        (click)="askCancelPaid(u)"
                        [attr.title]="'ADMIN.CANCEL_PAID' | translate"
                        [attr.aria-label]="'ADMIN.CANCEL_PAID' | translate"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <rect x="3" y="6" width="18" height="12" rx="2"/>
                          <path d="M3 10h18"/>
                          <path d="M9 14h6"/>
                        </svg>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="icon-btn icon-btn--accent"
                        [disabled]="busyId === u.id"
                        (click)="askMarkPaid(u)"
                        [attr.title]="'ADMIN.MARK_PAID' | translate"
                        [attr.aria-label]="'ADMIN.MARK_PAID' | translate"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <rect x="3" y="6" width="18" height="12" rx="2"/>
                          <path d="M3 10h18"/>
                          <path d="M8 14h3"/>
                        </svg>
                      </button>
                    }
                  }
                  @if (u.accountStatus === 'Active') {
                    <button
                      type="button"
                      class="icon-btn icon-btn--danger"
                      (click)="block(u.id)"
                      [attr.title]="'ADMIN.BLOCK' | translate"
                      [attr.aria-label]="'ADMIN.BLOCK' | translate"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="8"/>
                        <path d="M7 7l10 10"/>
                      </svg>
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="icon-btn icon-btn--accent"
                      (click)="unblock(u.id)"
                      [attr.title]="'ADMIN.UNBLOCK' | translate"
                      [attr.aria-label]="'ADMIN.UNBLOCK' | translate"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M7 11V8a5 5 0 0 1 10 0"/>
                        <rect x="5" y="11" width="14" height="9" rx="2"/>
                      </svg>
                    </button>
                  }
                </div>

                @if (editingId === u.id) {
                  <form class="user-row__edit" (ngSubmit)="save()">
                    <div class="form-grid form-grid--2">
                      <label class="field">
                        <span class="field__label">{{ 'REGISTER.FIRST_NAME' | translate }}</span>
                        <input [(ngModel)]="edit.firstName" name="firstName" required />
                      </label>
                      <label class="field">
                        <span class="field__label">{{ 'REGISTER.LAST_NAME' | translate }}</span>
                        <input [(ngModel)]="edit.lastName" name="lastName" required />
                      </label>
                      <label class="field">
                        <span class="field__label">{{ 'REGISTER.PHONE' | translate }}</span>
                        <input [(ngModel)]="edit.phoneNumber" name="phoneNumber" />
                      </label>
                      <label class="field">
                        <span class="field__label">{{ 'ADMIN.STATUS' | translate }}</span>
                        <select [(ngModel)]="edit.accountStatus" name="accountStatus">
                          <option value="Active">{{ 'ADMIN.STATUS_ACTIVE' | translate }}</option>
                          <option value="Blocked">{{ 'ADMIN.STATUS_BLOCKED' | translate }}</option>
                        </select>
                      </label>
                      @if (message) { <p class="success-msg span-2">{{ message }}</p> }
                      @if (error) { <p class="error span-2">{{ error }}</p> }
                      <div class="form-actions span-2">
                        <button class="btn btn--xs" type="submit" [disabled]="busyId === u.id">
                          {{ 'COMMON.SAVE' | translate }}
                        </button>
                        <button class="btn btn--ghost btn--xs" type="button" (click)="cancelEdit()">
                          {{ 'COMMON.CANCEL' | translate }}
                        </button>
                      </div>
                    </div>
                  </form>
                }
              </div>
            }
          </div>

          @if (totalPages > 1) {
            <nav class="pagination" [attr.aria-label]="'COMMON.PAGINATION' | translate">
              <button type="button" class="btn btn--ghost btn--sm" [disabled]="page <= 1 || loading" (click)="goToPage(page - 1)">
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
              <button type="button" class="btn btn--ghost btn--sm" [disabled]="page >= totalPages || loading" (click)="goToPage(page + 1)">
                {{ 'COMMON.NEXT' | translate }}
              </button>
            </nav>
          }
        }
      </div>

      @if (payConfirmUser; as payUser) {
        <div class="confirm-backdrop" (click)="closePayConfirm()">
          <div class="confirm-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <p class="confirm-modal__title">
              {{ (payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID' : 'ADMIN.MARK_PAID') | translate }}
            </p>
            <p class="confirm-modal__text">
              {{ (payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID_CONFIRM' : 'ADMIN.MARK_PAID_CONFIRM')
                | translate:{ name: payUser.firstName + ' ' + payUser.lastName } }}
            </p>
            <div class="confirm-modal__actions">
              <button type="button" class="btn btn--ghost btn--sm" (click)="closePayConfirm()" [disabled]="!!busyId">
                {{ 'COMMON.NO' | translate }}
              </button>
              <button type="button" class="btn btn--sm" (click)="confirmPayAction()" [disabled]="!!busyId">
                {{ busyId === payUser.id ? ('COMMON.WAITING' | translate) : ('COMMON.YES' | translate) }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (createOpen) {
        <div class="confirm-backdrop" (click)="closeCreate()">
          <div class="create-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <p class="confirm-modal__title">{{ 'ADMIN.CREATE_USER' | translate }}</p>
            <form class="form-grid form-grid--2 create-modal__form" (ngSubmit)="submitCreate()">
              <label class="field">
                <span class="field__label">{{ 'ADMIN.ROLE_FILTER' | translate }}</span>
                <select [(ngModel)]="create.role" name="createRole" required>
                  <option value="Customer">{{ 'ROLES.Customer' | translate }}</option>
                  <option value="Driver">{{ 'ROLES.Driver' | translate }}</option>
                  <option value="Admin">{{ 'ROLES.Admin' | translate }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">{{ 'LOGIN.EMAIL' | translate }}</span>
                <input [(ngModel)]="create.email" name="createEmail" type="email" required />
              </label>
              <label class="field">
                <span class="field__label">{{ 'LOGIN.PASSWORD' | translate }}</span>
                <input [(ngModel)]="create.password" name="createPassword" type="password" required minlength="6" />
              </label>
              <label class="field">
                <span class="field__label">{{ 'REGISTER.PHONE' | translate }}</span>
                <input [(ngModel)]="create.phoneNumber" name="createPhone" />
              </label>
              <label class="field">
                <span class="field__label">{{ 'REGISTER.FIRST_NAME' | translate }}</span>
                <input [(ngModel)]="create.firstName" name="createFirst" required />
              </label>
              <label class="field">
                <span class="field__label">{{ 'REGISTER.LAST_NAME' | translate }}</span>
                <input [(ngModel)]="create.lastName" name="createLast" required />
              </label>
              @if (create.role === 'Driver' || create.role === 'Customer') {
                <div class="span-2 location-cascade-grid">
                  <app-location-cascade
                    [districtId]="create.districtId"
                    [required]="create.role === 'Driver'"
                    (districtIdChange)="create.districtId = $event"
                  />
                </div>
              }
              @if (createError) { <p class="error span-2">{{ createError }}</p> }
              <div class="form-actions span-2">
                <button type="button" class="btn btn--ghost btn--xs" (click)="closeCreate()" [disabled]="creating">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
                <button type="submit" class="btn btn--xs" [disabled]="creating || !canSubmitCreate()">
                  {{ creating ? ('COMMON.WAITING' | translate) : ('ADMIN.CREATE_USER' | translate) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .results-meta {
      margin: 0 0 0.85rem;
      font-size: 0.8125rem;
      color: var(--tashuu-muted);
      font-weight: 600;
    }

    .user-table {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .user-table__head {
      display: none;
    }

    .user-row {
      display: grid;
      gap: 0.65rem 0.85rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--tashuu-line);
      border-radius: var(--radius-md);
      background: #fff;
      border-left-width: 3px;
      border-left-style: solid;
      border-left-color: #c5cedd;
    }

    .user-row--driver { border-left-color: #3557c8; }
    .user-row--customer { border-left-color: #0f9f6e; }
    .user-row--admin { border-left-color: #9a6700; }

    .user-row__name {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 700;
      color: var(--tashuu-navy);
      line-height: 1.25;
    }

    .user-row__meta {
      margin: 0.15rem 0 0;
      color: var(--tashuu-muted);
      font-size: 0.8rem;
      line-height: 1.35;
      word-break: break-word;
    }

    .user-row__role,
    .user-row__status,
    .user-row__sub {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.25rem;
    }

    .admin-create-btn {
      gap: 0.4rem;
      min-height: 2.15rem;
      padding: 0.4rem 1.15rem;
      font-size: 0.84rem;
    }

    .user-row__actions {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.28rem;
      align-items: center;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.85rem;
      height: 1.85rem;
      padding: 0;
      border-radius: 0.45rem;
      border: 1px solid transparent;
      background: #f3f6fb;
      color: #3a5fbf;
      cursor: pointer;
      text-decoration: none;
      box-shadow: inset 0 0 0 1px rgba(53, 87, 200, 0.08);
      transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease;
    }

    .icon-btn:hover:not(:disabled) {
      background: #e8eefc;
      color: #2a4db0;
      box-shadow: inset 0 0 0 1px rgba(53, 87, 200, 0.16);
      transform: translateY(-1px);
    }

    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    .icon-btn--accent {
      color: #0d8a60;
      background: #eef8f3;
      box-shadow: inset 0 0 0 1px rgba(15, 159, 110, 0.12);
    }

    .icon-btn--accent:hover:not(:disabled) {
      background: #e1f3ea;
      color: #0a7551;
      box-shadow: inset 0 0 0 1px rgba(15, 159, 110, 0.2);
    }

    .icon-btn--danger {
      color: #b5352a;
      background: #fdf4f3;
      box-shadow: inset 0 0 0 1px rgba(192, 57, 43, 0.12);
    }

    .icon-btn--danger:hover:not(:disabled) {
      background: #fbeae8;
      color: #9b2b22;
      box-shadow: inset 0 0 0 1px rgba(192, 57, 43, 0.2);
    }

    .user-row__edit {
      grid-column: 1 / -1;
      padding-top: 0.75rem;
      border-top: 1px solid var(--tashuu-line);
    }

    .sub {
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .sub--ok { color: #0f9f6e; }
    .sub--off { color: #9a6700; }

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

    .create-modal {
      width: min(100%, 36rem);
      max-height: min(90vh, 44rem);
      overflow: auto;
      padding: 1.15rem 1.2rem 1.1rem;
      border-radius: 0.9rem;
      background: #fff;
      border: 1px solid var(--tashuu-line);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
    }

    .create-modal__form {
      margin-top: 0.85rem;
    }

    @media (min-width: 980px) {
      .user-table__head {
        display: grid;
        gap: 0.85rem;
        padding: 0 1rem 0.45rem;
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: var(--tashuu-muted);
      }

      .user-table__head,
      .user-row {
        grid-template-columns: minmax(12rem, 1.6fr) 7.5rem 7rem minmax(9rem, 1fr) 8.25rem;
        align-items: center;
      }

      .user-row__actions {
        justify-content: flex-end;
      }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);
  private language = inject(LanguageService);
  users: UserListItem[] = [];
  loading = true;
  editingId: string | null = null;
  busyId: string | null = null;
  payConfirmUser: UserListItem | null = null;
  payConfirmMode: 'activate' | 'cancel' = 'activate';
  createOpen = false;
  creating = false;
  createError = '';
  create = {
    role: 'Customer',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    districtId: ''
  };
  message = '';
  error = '';
  edit = { firstName: '', lastName: '', phoneNumber: '', accountStatus: 'Active' };

  search = '';
  role = '';
  accountStatus = '';
  page = 1;
  readonly pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    if (current <= 3) { pages.add(2); pages.add(3); pages.add(4); }
    if (current >= total - 2) { pages.add(total - 1); pages.add(total - 2); pages.add(total - 3); }

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
    this.reload();
  }

  roleBadgeClass(role: string): string {
    if (role === 'Driver') return 'badge--driver';
    if (role === 'Customer') return 'badge--customer';
    if (role === 'Admin') return 'badge--admin';
    return '';
  }

  onFilterChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.cancelEdit();
      this.reload();
    }, 250);
  }

  clearFilters(): void {
    this.search = '';
    this.role = '';
    this.accountStatus = '';
    this.page = 1;
    this.cancelEdit();
    this.reload();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.cancelEdit();
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.api.getAdminUsers({
      page: this.page,
      pageSize: this.pageSize,
      role: this.role || undefined,
      search: this.search.trim() || undefined,
      accountStatus: this.accountStatus || undefined
    }).subscribe({
      next: r => {
        this.users = r.items;
        this.totalCount = r.totalCount;
        this.totalPages = r.totalPages;
        this.page = r.page;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = this.language.instant('ERRORS.GENERIC');
      }
    });
  }

  startEdit(u: UserListItem): void {
    this.editingId = u.id;
    this.message = '';
    this.error = '';
    this.edit = {
      firstName: u.firstName,
      lastName: u.lastName,
      phoneNumber: u.phoneNumber ?? '',
      accountStatus: u.accountStatus
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.message = '';
    this.error = '';
  }

  save(): void {
    if (!this.editingId) return;
    this.busyId = this.editingId;
    this.error = '';
    this.message = '';
    this.api.updateAdminUser(this.editingId, {
      firstName: this.edit.firstName.trim(),
      lastName: this.edit.lastName.trim(),
      phoneNumber: this.edit.phoneNumber.trim() || null,
      accountStatus: this.edit.accountStatus
    }).subscribe({
      next: updated => {
        this.users = this.users.map(u => u.id === updated.id ? { ...u, ...updated } : u);
        this.message = this.language.instant('ADMIN.USER_SAVED');
        this.busyId = null;
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busyId = null;
      }
    });
  }

  openCreate(): void {
    this.createOpen = true;
    this.createError = '';
    this.create = {
      role: 'Customer',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      districtId: ''
    };
  }

  closeCreate(): void {
    if (this.creating) return;
    this.createOpen = false;
    this.createError = '';
  }

  canSubmitCreate(): boolean {
    if (!this.create.email.trim() || !this.create.password || this.create.password.length < 6) return false;
    if (!this.create.firstName.trim() || !this.create.lastName.trim()) return false;
    if (this.create.role === 'Driver' && !this.create.districtId) return false;
    return true;
  }

  submitCreate(): void {
    if (!this.canSubmitCreate() || this.creating) return;
    this.creating = true;
    this.createError = '';
    this.api.createAdminUser({
      email: this.create.email.trim(),
      password: this.create.password,
      firstName: this.create.firstName.trim(),
      lastName: this.create.lastName.trim(),
      phoneNumber: this.create.phoneNumber.trim() || null,
      role: this.create.role,
      districtId: this.create.districtId || null
    }).subscribe({
      next: () => {
        this.creating = false;
        this.createOpen = false;
        this.message = this.language.instant('ADMIN.USER_CREATED');
        this.page = 1;
        this.reload();
      },
      error: err => {
        this.createError = err.error?.errors
          ? Object.values(err.error.errors).flat().join(' ')
          : (err.error?.title ?? this.language.instant('ERRORS.GENERIC'));
        this.creating = false;
      }
    });
  }

  askMarkPaid(u: UserListItem): void {
    if (u.role !== 'Driver' || this.busyId) return;
    this.payConfirmMode = 'activate';
    this.payConfirmUser = u;
    this.error = '';
  }

  askCancelPaid(u: UserListItem): void {
    if (u.role !== 'Driver' || !u.hasActiveSubscription || this.busyId) return;
    this.payConfirmMode = 'cancel';
    this.payConfirmUser = u;
    this.error = '';
  }

  closePayConfirm(): void {
    if (this.busyId) return;
    this.payConfirmUser = null;
  }

  confirmPayAction(): void {
    const u = this.payConfirmUser;
    if (!u || this.busyId) return;
    this.busyId = u.id;
    this.error = '';
    const req$ = this.payConfirmMode === 'cancel'
      ? this.api.cancelUserSubscription(u.id)
      : this.api.markUserSubscriptionPaid(u.id);
    req$.subscribe({
      next: () => {
        this.busyId = null;
        this.payConfirmUser = null;
        this.reload();
        this.message = this.language.instant(
          this.payConfirmMode === 'cancel' ? 'ADMIN.CANCEL_PAID_DONE' : 'ADMIN.MARK_PAID_DONE'
        );
      },
      error: err => {
        this.error = err.error?.title ?? this.language.instant('ERRORS.GENERIC');
        this.busyId = null;
      }
    });
  }

  block(id: string): void {
    this.api.blockUser(id).subscribe(() => this.reload());
  }

  unblock(id: string): void {
    this.api.unblockUser(id).subscribe(() => this.reload());
  }
}
