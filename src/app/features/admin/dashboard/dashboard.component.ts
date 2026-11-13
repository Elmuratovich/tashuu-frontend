import { Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AdminStatistics } from '../../../core/models/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'NAV.DASHBOARD' | translate }}</p>
          <h1 class="page-title">{{ 'ADMIN.DASHBOARD' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.DASHBOARD_SUBTITLE' | translate }}</p>
        </div>
      </header>

      @if (stats) {
        <div class="stats-grid">
          <div class="stat-card">
            <p class="stat-card__label">{{ 'ADMIN.STAT_USERS' | translate }}</p>
            <p class="stat-card__value">{{ stats.totalUsers }}</p>
            <p class="stat-card__hint">
              {{ 'ADMIN.USERS_BREAKDOWN' | translate:{ customers: stats.totalCustomers, drivers: stats.totalDrivers } }}
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-card__label">{{ 'ADMIN.STAT_ORDERS' | translate }}</p>
            <p class="stat-card__value">{{ stats.totalOrders }}</p>
            <p class="stat-card__hint">{{ 'ADMIN.STAT_PENDING' | translate }}: {{ stats.pendingOrders }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-card__label">{{ 'ADMIN.STAT_IN_PROGRESS' | translate }}</p>
            <p class="stat-card__value">{{ stats.inProgressOrders }}</p>
            <p class="stat-card__hint">{{ 'ADMIN.STAT_ACCEPTED' | translate }}: {{ stats.acceptedOrders }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-card__label">{{ 'ADMIN.STAT_AVAILABLE_DRIVERS' | translate }}</p>
            <p class="stat-card__value">{{ stats.availableDrivers }}</p>
            <p class="stat-card__hint">
              {{ 'ADMIN.STAT_COMPLETED' | translate }}: {{ stats.completedOrders }} ·
              {{ 'ADMIN.STAT_CANCELLED' | translate }}: {{ stats.cancelledOrders }}
            </p>
          </div>
        </div>
      } @else {
        <p class="loading">{{ 'COMMON.LOADING' | translate }}</p>
      }
    </section>
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  stats?: AdminStatistics;

  ngOnInit(): void {
    this.api.getAdminStatistics().subscribe(s => this.stats = s);
  }
}
