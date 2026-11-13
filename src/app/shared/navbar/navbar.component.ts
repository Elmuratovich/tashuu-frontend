import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcherComponent, BrandLogoComponent],
  template: `
    <nav class="navbar">
      <a routerLink="/" class="navbar__brand" [attr.aria-label]="'COMMON.APP_NAME' | translate">
        <app-brand-logo size="sm" tone="onDark" />
      </a>

      @if (auth.currentUser(); as user) {
        <div class="navbar__nav">
          <a routerLink="/" routerLinkActive="navbar__link--active" [routerLinkActiveOptions]="{ exact: true }" class="navbar__link">
            {{ 'NAV.MARKETPLACE' | translate }}
          </a>
          <a routerLink="/taxi" routerLinkActive="navbar__link--active" class="navbar__link">
            {{ 'NAV.TAXI' | translate }}
          </a>
          <a routerLink="/drivers" routerLinkActive="navbar__link--active" class="navbar__link">
            {{ 'NAV.AVAILABLE_DRIVERS' | translate }}
          </a>
          @if (user.role === 'Customer') {
            <a routerLink="/customer/orders" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.MY_ORDERS' | translate }}
            </a>
            <a routerLink="/customer/orders/new" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.NEW_ORDER' | translate }}
            </a>
          }
          @if (user.role === 'Driver') {
            <a routerLink="/driver/orders" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.AVAILABLE_ORDERS' | translate }}
            </a>
            <a routerLink="/customer/orders/new" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.NEW_ORDER' | translate }}
            </a>
            <a routerLink="/driver/vehicles" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.VEHICLES' | translate }}
            </a>
            <a routerLink="/driver/profile" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'COMMON.PROFILE' | translate }}
            </a>
          }
          @if (user.role === 'Admin') {
            <a routerLink="/admin" routerLinkActive="navbar__link--active" [routerLinkActiveOptions]="{ exact: true }" class="navbar__link">
              {{ 'NAV.DASHBOARD' | translate }}
            </a>
            <a routerLink="/admin/users" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.USERS' | translate }}
            </a>
            <a routerLink="/admin/orders" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'COMMON.ORDERS' | translate }}
            </a>
            <a routerLink="/admin/vehicle-types" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.VEHICLE_TYPES' | translate }}
            </a>
            <a routerLink="/admin/cargo-types" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.CARGO_TYPES' | translate }}
            </a>
            <a routerLink="/admin/locations" routerLinkActive="navbar__link--active" class="navbar__link">
              {{ 'NAV.LOCATIONS' | translate }}
            </a>
          }
        </div>

        <div class="navbar__aside">
          <div class="navbar__user">
            <span class="navbar__user-name">{{ user.firstName }}</span>
            <span class="navbar__user-role">{{ ('ROLES.' + user.role) | translate }}</span>
          </div>
          <app-language-switcher />
          <button type="button" class="navbar__logout" (click)="auth.logout()">
            {{ 'COMMON.LOGOUT' | translate }}
          </button>
        </div>
      } @else {
        <div class="navbar__nav">
          <a routerLink="/" routerLinkActive="navbar__link--active" [routerLinkActiveOptions]="{ exact: true }" class="navbar__link">
            {{ 'NAV.MARKETPLACE' | translate }}
          </a>
          <a routerLink="/taxi" routerLinkActive="navbar__link--active" class="navbar__link">
            {{ 'NAV.TAXI' | translate }}
          </a>
          <a routerLink="/drivers" routerLinkActive="navbar__link--active" class="navbar__link">
            {{ 'NAV.AVAILABLE_DRIVERS' | translate }}
          </a>
        </div>
        <div class="navbar__aside">
          <app-language-switcher />
          <a routerLink="/login" class="navbar__login" [attr.aria-label]="'COMMON.LOGIN' | translate">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5"/>
              <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>
            </svg>
            <span>{{ 'COMMON.LOGIN' | translate }}</span>
          </a>
        </div>
      }
    </nav>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
}
