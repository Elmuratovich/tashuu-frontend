import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TaxiBookingService } from '../../core/services/taxi-booking.service';
import { TaxiGeocodingService } from '../../core/services/taxi-geocoding.service';
import {
  GeocodingSearchResult,
  PaymentMethod,
  TaxiLocation,
  TaxiTariff
} from '../../core/models/taxi.model';
import { environment } from '../../../environments/environment';
import { TaxiMapComponent } from './components/taxi-map.component';
import { TaxiMapPickerModalComponent } from './components/taxi-map-picker-modal.component';

@Component({
  selector: 'app-taxi-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TaxiMapComponent,
    TaxiMapPickerModalComponent
  ],
  template: `
    <div class="taxi-page">
      <!-- Breadcrumb / Kicker header -->
      <header class="taxi-header">
        <div class="taxi-header__title-group">
          <div class="taxi-badge">
            <span class="taxi-badge__dot"></span>
            <span>TASHUU TAXI</span>
          </div>
          <h1 class="taxi-title">{{ 'TAXI.TITLE' | translate }}</h1>
          <p class="taxi-subtitle">{{ 'TAXI.SUBTITLE' | translate }}</p>
        </div>

        <div class="taxi-header__actions" *ngIf="isDevMode">
          <button
            type="button"
            class="debug-toggle-btn"
            [class.debug-toggle-btn--active]="showDebugPanel"
            (click)="toggleDebugPanel()"
            [attr.title]="'TAXI.DEBUG_TITLE' | translate"
          >
            <span class="debug-badge-dot"></span>
            <span class="debug-toggle-label">Debug</span>
            @if (bookingService.routeDebugInfo(); as dbg) {
              <span class="debug-provider-tag">{{ dbg.provider.split(' ')[0] }}</span>
            }
          </button>
        </div>
      </header>

      <!-- Main Layout: Sidebar Panel + Map View -->
      <div class="taxi-workspace">
        <!-- Booking Control Panel -->
        <aside class="booking-panel" [class.booking-panel--searching]="bookingService.bookingState() !== 'draft'">
          <!-- Active Booking / Driver Matching State -->
          @if (bookingService.bookingState() === 'searching') {
            <div class="searching-state">
              <div class="radar-spinner">
                <div class="radar-circle circle-1"></div>
                <div class="radar-circle circle-2"></div>
                <div class="radar-circle circle-3"></div>
                <div class="radar-car-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/>
                    <circle cx="17" cy="17" r="2"/>
                  </svg>
                </div>
              </div>

              <div class="searching-copy">
                <h3 class="searching-title">{{ 'TAXI.SEARCHING_TITLE' | translate }}</h3>
                <p class="searching-desc">{{ 'TAXI.SEARCHING_DESC' | translate }}</p>
              </div>

              <div class="order-quick-summary">
                <div class="summary-row">
                  <span class="summary-label">{{ 'TAXI.FROM' | translate }}:</span>
                  <span class="summary-val">{{ bookingService.fromLocation()?.address }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">{{ 'TAXI.TO' | translate }}:</span>
                  <span class="summary-val">{{ bookingService.toLocation()?.address }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">{{ 'TAXI.TARIFF' | translate }}:</span>
                  <span class="summary-val font-bold">{{ bookingService.selectedTariff()?.nameKey | translate }} • {{ bookingService.selectedTariff()?.estimatedPrice }} {{ 'COMMON.CURRENCY' | translate }}</span>
                </div>
              </div>

              <button type="button" class="btn btn--ghost btn--danger-outline cancel-search-btn" (click)="bookingService.cancelBooking()">
                {{ 'TAXI.CANCEL_SEARCH' | translate }}
              </button>
            </div>
          } @else if (bookingService.bookingState() === 'driver_assigned') {
            <!-- Driver Found Card -->
            <div class="driver-assigned-state">
              <div class="driver-header-badge">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>{{ 'TAXI.DRIVER_ASSIGNED' | translate }}</span>
              </div>

              <div class="driver-card">
                <div class="driver-card__top">
                  <div class="driver-avatar">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div class="driver-identity">
                    <h4 class="driver-name">{{ bookingService.activeBooking()?.driver?.name }}</h4>
                    <div class="driver-rating">
                      <span class="star-icon">★</span>
                      <span class="rating-val">{{ bookingService.activeBooking()?.driver?.rating }}</span>
                      <span class="rides-count">({{ bookingService.activeBooking()?.driver?.ridesCount }} {{ 'TAXI.RIDES' | translate }})</span>
                    </div>
                  </div>
                  <div class="driver-eta">
                    <span class="eta-num">{{ bookingService.activeBooking()?.driver?.etaMinutes }}</span>
                    <span class="eta-unit">{{ 'TAXI.MIN' | translate }}</span>
                  </div>
                </div>

                <div class="driver-car-box">
                  <div class="car-info">
                    <span class="car-model">{{ bookingService.activeBooking()?.driver?.carModel }}</span>
                    <span class="car-color">{{ bookingService.activeBooking()?.driver?.carColor }}</span>
                  </div>
                  <div class="car-plate">{{ bookingService.activeBooking()?.driver?.plateNumber }}</div>
                </div>

                <div class="driver-contacts">
                  <a [href]="'tel:' + bookingService.activeBooking()?.driver?.phone" class="btn btn--block driver-call-btn">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{{ bookingService.activeBooking()?.driver?.phone }}</span>
                  </a>
                </div>
              </div>

              <div class="order-meta-card">
                <div class="meta-row">
                  <span>{{ 'TAXI.ORDER_NUMBER' | translate }}:</span>
                  <span class="meta-val font-mono">{{ bookingService.activeBooking()?.orderNumber }}</span>
                </div>
                <div class="meta-row">
                  <span>{{ 'TAXI.TRIP_COST' | translate }}:</span>
                  <span class="meta-val font-bold text-accent">
                    {{ bookingService.activeBooking()?.tariff?.estimatedPrice }} {{ 'COMMON.CURRENCY' | translate }}
                  </span>
                </div>
              </div>

              <div class="driver-actions">
                <button type="button" class="btn btn--ghost btn--block" (click)="bookingService.resetBooking()">
                  {{ 'TAXI.NEW_RIDE' | translate }}
                </button>
              </div>
            </div>
          } @else {
            <!-- Draft / Regular Booking Form -->
            <div class="booking-form">
              <!-- Address Inputs Group -->
              <div class="address-group">
                <!-- From Field Container -->
                <div class="address-field-wrap">
                  <div class="field-indicator field-indicator--pickup">A</div>
                  <div class="field-content">
                    <label class="field-label-mini">{{ 'TAXI.FROM' | translate }}</label>
                    <div class="field-input-row">
                      <input
                        type="text"
                        class="address-input"
                        [ngModel]="fromInputText"
                        (ngModelChange)="onFromTextChange($event)"
                        [placeholder]="'TAXI.FROM_PLACEHOLDER' | translate"
                        autocomplete="off"
                      />
                      @if (isSearchingFrom) {
                        <div class="field-inline-spinner"></div>
                      }
                      @if (fromInputText) {
                        <button type="button" class="field-action-btn" (click)="clearFromField()" [attr.aria-label]="'COMMON.CLEAR' | translate">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      }
                      <button
                        type="button"
                        class="field-action-btn field-action-btn--gps"
                        (click)="useCurrentLocation()"
                        [attr.title]="'TAXI.USE_MY_LOCATION' | translate"
                        [disabled]="isLocating"
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="7"/>
                          <line x1="12" y1="1" x2="12" y2="5"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="1" y1="12" x2="5" y2="12"/>
                          <line x1="19" y1="12" x2="23" y2="12"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="field-action-btn field-action-btn--map"
                        (click)="openMapPicker('from')"
                        [attr.title]="'TAXI.SELECT_ON_MAP' | translate"
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                          <line x1="8" y1="2" x2="8" y2="18"/>
                          <line x1="16" y1="6" x2="16" y2="22"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- From Autocomplete Dropdown -->
                  @if (fromSuggestions.length > 0) {
                    <ul class="suggestions-dropdown">
                      @for (item of fromSuggestions; track item.placeId) {
                        <li class="suggestion-item" (click)="selectFromSuggestion(item)">
                          <svg class="suggestion-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <div class="suggestion-text">
                            <div class="suggestion-main">{{ item.addressShort }}</div>
                            <div class="suggestion-sub">{{ item.displayName }}</div>
                          </div>
                        </li>
                      }
                    </ul>
                  }
                </div>

                <!-- Swap Button -->
                <div class="swap-row">
                  <div class="connector-line"></div>
                  <button
                    type="button"
                    class="swap-btn"
                    (click)="swapAddresses()"
                    [attr.aria-label]="'TAXI.SWAP_LOCATIONS' | translate"
                    title="{{ 'TAXI.SWAP_LOCATIONS' | translate }}"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="7 10 12 5 17 10"/>
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="17 14 12 19 7 14"/>
                    </svg>
                  </button>
                </div>

                <!-- To Field Container -->
                <div class="address-field-wrap">
                  <div class="field-indicator field-indicator--dest">B</div>
                  <div class="field-content">
                    <label class="field-label-mini">{{ 'TAXI.TO' | translate }}</label>
                    <div class="field-input-row">
                      <input
                        type="text"
                        class="address-input"
                        [ngModel]="toInputText"
                        (ngModelChange)="onToTextChange($event)"
                        [placeholder]="'TAXI.TO_PLACEHOLDER' | translate"
                        autocomplete="off"
                      />
                      @if (isSearchingTo) {
                        <div class="field-inline-spinner"></div>
                      }
                      @if (toInputText) {
                        <button type="button" class="field-action-btn" (click)="clearToField()" [attr.aria-label]="'COMMON.CLEAR' | translate">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      }
                      <button
                        type="button"
                        class="field-action-btn field-action-btn--map"
                        (click)="openMapPicker('to')"
                        [attr.title]="'TAXI.SELECT_ON_MAP' | translate"
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                          <line x1="8" y1="2" x2="8" y2="18"/>
                          <line x1="16" y1="6" x2="16" y2="22"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- To Autocomplete Dropdown -->
                  @if (toSuggestions.length > 0) {
                    <ul class="suggestions-dropdown">
                      @for (item of toSuggestions; track item.placeId) {
                        <li class="suggestion-item" (click)="selectToSuggestion(item)">
                          <svg class="suggestion-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <div class="suggestion-text">
                            <div class="suggestion-main">{{ item.addressShort }}</div>
                            <div class="suggestion-sub">{{ item.displayName }}</div>
                          </div>
                        </li>
                      }
                    </ul>
                  }
                </div>
              </div>

              <!-- Route Calculation Preview & Alternative Routes -->
              @if (bookingService.isCalculatingRoute()) {
                <div class="route-preview-badge calculating">
                  <div class="spinner-sm"></div>
                  <span>{{ 'TAXI.CALCULATING_ROUTE' | translate }}</span>
                </div>
              } @else if (bookingService.routeError()) {
                <div class="route-preview-badge error">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{{ bookingService.routeError()! | translate }}</span>
                </div>
              } @else if (bookingService.availableRoutes().length > 1) {
                <!-- Multiple Alternative Routes -->
                <div class="routes-section">
                  <div class="routes-header">
                    <div class="routes-header__left">
                      <span class="section-title-mini">{{ 'TAXI.AVAILABLE_ROUTES' | translate }}</span>
                      <span class="routes-count-tag">{{ bookingService.availableRoutes().length }}</span>
                    </div>
                    <span class="routes-compare-hint">{{ 'TAXI.CLICK_TO_COMPARE' | translate }}</span>
                  </div>

                  <!-- Objective Filter Chips -->
                  @if (hasMultipleObjectives()) {
                    <div class="objective-chips-bar">
                      <button
                        type="button"
                        class="obj-chip"
                        [class.obj-chip--active]="isObjectiveSelected('recommended')"
                        (click)="filterByObjective('recommended')"
                      >
                        ⭐ {{ 'TAXI.OBJECTIVE_RECOMMENDED' | translate }}
                      </button>
                      <button
                        type="button"
                        class="obj-chip"
                        [class.obj-chip--active]="isObjectiveSelected('fastest')"
                        (click)="filterByObjective('fastest')"
                      >
                        ⚡ {{ 'TAXI.OBJECTIVE_FASTEST' | translate }}
                      </button>
                      <button
                        type="button"
                        class="obj-chip"
                        [class.obj-chip--active]="isObjectiveSelected('shortest')"
                        (click)="filterByObjective('shortest')"
                      >
                        📏 {{ 'TAXI.OBJECTIVE_SHORTEST' | translate }}
                      </button>
                    </div>
                  }

                  <div class="routes-cards-row">
                    @for (r of bookingService.availableRoutes(); track r.id; let i = $index) {
                      <div
                        class="route-select-card"
                        [class.route-select-card--active]="bookingService.selectedRouteIndex() === i"
                        (click)="bookingService.selectRoute(i)"
                        role="button"
                        tabindex="0"
                      >
                        <div class="route-card-top">
                          <div class="route-num-badge">
                            <span
                              class="route-color-pill"
                              [style.background-color]="bookingService.selectedRouteIndex() === i ? '#2f6bff' : (r.color || '#10b981')"
                            ></span>
                            <span class="route-num-label">{{ 'TAXI.ROUTE' | translate }} {{ r.routeNumber || (i + 1) }}</span>
                            <span
                              class="route-badge-tag"
                              [class.route-badge-tag--fastest]="r.badgeType === 'recommended' || r.badgeType === 'fastest'"
                              [class.route-badge-tag--shortest]="r.badgeType === 'shortest'"
                              [class.route-badge-tag--walking]="r.badgeType === 'walking_access'"
                            >
                              {{ r.badgeLabelKey | translate }}
                            </span>
                          </div>
                          <span class="route-time-val">{{ r.totalDurationMinutes || r.durationMinutes }} {{ 'TAXI.MIN' | translate }}</span>
                        </div>

                        <div class="route-card-meta">
                          <span class="route-dist-val">🚗 {{ r.drivingDistanceKm || r.distanceKm }} {{ 'TAXI.KM' | translate }} ({{ r.drivingDurationMinutes || r.durationMinutes }} мин)</span>
                          @if (r.hasWalkingSegments) {
                            <span class="route-walk-chip">🚶 {{ r.totalWalkingDurationMinutes }} мин ({{ r.totalWalkingDistanceMeters }} м)</span>
                          }
                          @if (r.differenceText) {
                            <span
                              class="route-diff-val"
                              [class.route-diff-val--fastest]="r.badgeType === 'recommended' || r.badgeType === 'fastest'"
                              [class.route-diff-val--shortest]="r.badgeType === 'shortest'"
                            >
                              • {{ r.differenceText }}
                            </span>
                          }
                        </div>

                        <!-- Access limitation notice if walking required -->
                        @if (r.accessNotice) {
                          <div class="route-access-notice">
                            <span class="notice-icon">⚠️</span>
                            <span class="notice-text">{{ r.accessNotice }}</span>
                          </div>
                        }

                        <!-- Traversed Streets -->
                        @if (r.traversedStreets && r.traversedStreets.length > 0) {
                          <div class="route-streets-preview" [title]="r.traversedStreets.join(' → ')">
                            <span class="streets-icon">🛣️</span>
                            <span class="streets-text">{{ r.traversedStreets.slice(0, 3).join(' → ') }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Turn-by-Turn Expand Toggle for Active Route -->
                  @if (bookingService.route() && bookingService.route()!.steps.length > 0) {
                    <div class="route-steps-container">
                      <button
                        type="button"
                        class="route-steps-toggle-btn"
                        (click)="toggleRouteDetails()"
                        [attr.aria-expanded]="isRouteDetailsExpanded"
                      >
                        <span class="toggle-text">
                          {{ isRouteDetailsExpanded ? ('TAXI.HIDE_TURN_DETAILS' | translate) : ('TAXI.SHOW_TURN_DETAILS' | translate) }}
                          ({{ bookingService.route()!.steps.length }} {{ 'TAXI.STEPS' | translate }})
                        </span>
                        <svg
                          class="toggle-chevron"
                          [class.is-open]="isRouteDetailsExpanded"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      @if (isRouteDetailsExpanded) {
                        <div class="route-steps-list">
                          @for (step of bookingService.route()!.steps; track $index) {
                            <div class="step-item">
                              <div class="step-icon-wrap">
                                <span class="step-num">{{ $index + 1 }}</span>
                              </div>
                              <div class="step-info">
                                <div class="step-instruction">{{ step.instruction }}</div>
                                @if (step.streetName) {
                                  <div class="step-street">{{ step.streetName }}</div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else if (bookingService.route()) {
                <!-- Single Route Display with Streets & Turn Details -->
                <div class="single-route-box">
                  <div class="single-route-header">
                    <div class="single-route-top">
                      <div class="single-route-badge-group">
                        <span class="route-color-pill" style="background-color: #2f6bff;"></span>
                        <span class="route-badge-tag route-badge-tag--fastest">{{ bookingService.route()!.badgeLabelKey | translate }}</span>
                      </div>
                      <span class="route-time-val">{{ bookingService.route()!.totalDurationMinutes || bookingService.route()!.durationMinutes }} {{ 'TAXI.MIN' | translate }}</span>
                    </div>
                    <div class="route-card-meta">
                      <span class="route-dist-val">🚗 {{ bookingService.route()!.drivingDistanceKm || bookingService.route()!.distanceKm }} {{ 'TAXI.KM' | translate }} ({{ bookingService.route()!.drivingDurationMinutes || bookingService.route()!.durationMinutes }} мин)</span>
                      @if (bookingService.route()!.hasWalkingSegments) {
                        <span class="route-walk-chip">🚶 {{ bookingService.route()!.totalWalkingDurationMinutes }} мин ({{ bookingService.route()!.totalWalkingDistanceMeters }} м)</span>
                      }
                      <span class="single-route-note">• {{ 'TAXI.ONLY_ONE_ROUTE_AVAILABLE' | translate }}</span>
                    </div>
                  </div>

                  @if (bookingService.route()!.accessNotice) {
                    <div class="route-access-notice">
                      <span class="notice-icon">⚠️</span>
                      <span class="notice-text">{{ bookingService.route()!.accessNotice }}</span>
                    </div>
                  }

                  @if (bookingService.route()!.traversedStreets && bookingService.route()!.traversedStreets.length > 0) {
                    <div class="route-streets-preview" [title]="bookingService.route()!.traversedStreets.join(' → ')">
                      <span class="streets-icon">🛣️</span>
                      <span class="streets-text">{{ bookingService.route()!.traversedStreets.slice(0, 4).join(' → ') }}</span>
                    </div>
                  }

                  <!-- Turn-by-Turn Expand Toggle for Single Route -->
                  @if (bookingService.route()!.steps && bookingService.route()!.steps.length > 0) {
                    <div class="route-steps-container">
                      <button
                        type="button"
                        class="route-steps-toggle-btn"
                        (click)="toggleRouteDetails()"
                        [attr.aria-expanded]="isRouteDetailsExpanded"
                      >
                        <span class="toggle-text">
                          {{ isRouteDetailsExpanded ? ('TAXI.HIDE_TURN_DETAILS' | translate) : ('TAXI.SHOW_TURN_DETAILS' | translate) }}
                          ({{ bookingService.route()!.steps.length }} {{ 'TAXI.STEPS' | translate }})
                        </span>
                        <svg
                          class="toggle-chevron"
                          [class.is-open]="isRouteDetailsExpanded"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      @if (isRouteDetailsExpanded) {
                        <div class="route-steps-list">
                          @for (step of bookingService.route()!.steps; track $index) {
                            <div class="step-item">
                              <div class="step-icon-wrap">
                                <span class="step-num">{{ $index + 1 }}</span>
                              </div>
                              <div class="step-info">
                                <div class="step-instruction">{{ step.instruction }}</div>
                                @if (step.streetName) {
                                  <div class="step-street">{{ step.streetName }}</div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              } @else if (bookingService.routeError()) {
                <div class="route-preview-badge error">
                  <span>{{ bookingService.routeError()! | translate }}</span>
                </div>
              }

              <!-- Tariffs Carousel / List -->
              <div class="tariffs-section">
                <span class="section-title-mini">{{ 'TAXI.SELECT_TARIFF' | translate }}</span>
                <div class="tariffs-grid">
                  @for (t of bookingService.tariffs(); track t.id) {
                    <div
                      class="tariff-card"
                      [class.tariff-card--selected]="bookingService.selectedTariff()?.id === t.id"
                      (click)="bookingService.selectTariff(t)"
                    >
                      <div class="tariff-top">
                        <div class="tariff-icon">
                          @if (t.id === 'standard') {
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
                              <circle cx="7" cy="17" r="2"/>
                              <circle cx="17" cy="17" r="2"/>
                            </svg>
                          } @else if (t.id === 'comfort') {
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                              <path d="M14 16H9m10 0h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
                              <circle cx="6" cy="16" r="2"/>
                              <circle cx="17" cy="16" r="2"/>
                            </svg>
                          } @else if (t.id === 'comfort_plus') {
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          } @else if (t.id === 'business') {
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                          } @else {
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                              <rect x="1" y="3" width="15" height="13"/>
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                              <circle cx="5.5" cy="18.5" r="2.5"/>
                              <circle cx="18.5" cy="18.5" r="2.5"/>
                            </svg>
                          }
                        </div>
                        <div class="tariff-names">
                          <span class="tariff-name">{{ t.nameKey | translate }}</span>
                          <span class="tariff-eta">~{{ t.etaMinutes }} {{ 'TAXI.MIN' | translate }}</span>
                        </div>
                      </div>
                      <div class="tariff-bottom">
                        <span class="tariff-price">{{ t.estimatedPrice }} {{ 'COMMON.CURRENCY' | translate }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Payment Method & Comment -->
              <div class="options-row">
                <div class="payment-selector">
                  <button
                    type="button"
                    class="payment-chip"
                    [class.payment-chip--active]="bookingService.paymentMethod() === 'cash'"
                    (click)="bookingService.setPaymentMethod('cash')"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <path d="M6 12h.01M18 12h.01"/>
                    </svg>
                    <span>{{ 'TAXI.CASH' | translate }}</span>
                  </button>
                  <button
                    type="button"
                    class="payment-chip"
                    [class.payment-chip--active]="bookingService.paymentMethod() === 'card'"
                    (click)="bookingService.setPaymentMethod('card')"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <span>{{ 'TAXI.CARD' | translate }}</span>
                  </button>
                  <button
                    type="button"
                    class="payment-chip"
                    [class.payment-chip--active]="bookingService.paymentMethod() === 'wallet'"
                    (click)="bookingService.setPaymentMethod('wallet')"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                      <circle cx="18" cy="14" r="1"/>
                    </svg>
                    <span>Tashuu Pay</span>
                  </button>
                </div>

                <div class="comment-input-wrap">
                  <input
                    type="text"
                    class="comment-input"
                    [(ngModel)]="orderComment"
                    [placeholder]="'TAXI.COMMENT_PLACEHOLDER' | translate"
                  />
                </div>
              </div>

              <!-- Find a Taxi CTA Button -->
              <div class="submit-section">
                <button
                  type="button"
                  class="btn btn--block taxi-submit-btn"
                  [disabled]="!bookingService.isReadyToBook() || bookingService.isCalculatingRoute()"
                  (click)="onFindTaxiClick()"
                >
                  <span class="btn-text">{{ 'TAXI.FIND_TAXI' | translate }}</span>
                  @if (bookingService.selectedTariff(); as sel) {
                    <span class="btn-price">{{ sel.estimatedPrice }} {{ 'COMMON.CURRENCY' | translate }}</span>
                  }
                </button>
                @if (!bookingService.fromLocation()?.point || !bookingService.toLocation()?.point) {
                  <p class="validation-hint">{{ 'TAXI.VALIDATION_HINT' | translate }}</p>
                }
              </div>
            </div>
          }
        </aside>

        <!-- Main Map Area -->
        <main class="map-viewport">
          <app-taxi-map
            [fromPoint]="bookingService.fromLocation()?.point || null"
            [toPoint]="bookingService.toLocation()?.point || null"
            [fromLocation]="bookingService.fromLocation()"
            [toLocation]="bookingService.toLocation()"
            [routes]="bookingService.availableRoutes()"
            [selectedRouteIndex]="bookingService.selectedRouteIndex()"
            (routeSelected)="bookingService.selectRoute($event)"
            [height]="'100%'"
          />
        </main>
      </div>

      <!-- Map Picker Modal -->
      @if (activePickerField) {
        <app-taxi-map-picker-modal
          [targetField]="activePickerField"
          [initialLocation]="activePickerField === 'from' ? bookingService.fromLocation() : bookingService.toLocation()"
          (confirmed)="onMapPickerConfirmed($event)"
          (cancelled)="closeMapPicker()"
        />
      }

      <!-- Routing Diagnostic Debug Panel Modal -->
      @if (showDebugPanel && bookingService.routeDebugInfo(); as debug) {
        <div class="debug-modal-backdrop" (click)="toggleDebugPanel()">
          <div class="debug-modal-content" (click)="$event.stopPropagation()">
            <div class="debug-modal-header">
              <div class="debug-header-title">
                <span class="debug-icon">🛠️</span>
                <h3>{{ 'TAXI.DEBUG_TITLE' | translate }}</h3>
              </div>
              <button type="button" class="debug-close-btn" (click)="toggleDebugPanel()">✕</button>
            </div>

            <div class="debug-modal-body">
              <!-- Engine & Provider Info -->
              <div class="debug-grid">
                <div class="debug-item">
                  <span class="debug-item-label">{{ 'TAXI.DEBUG_PROVIDER' | translate }}</span>
                  <span class="debug-item-val font-bold text-primary">{{ debug.provider }}</span>
                </div>
                <div class="debug-item">
                  <span class="debug-item-label">{{ 'TAXI.DEBUG_PROFILE' | translate }}</span>
                  <span class="debug-item-val font-mono">{{ debug.profile }}</span>
                </div>
                <div class="debug-item">
                  <span class="debug-item-label">{{ 'TAXI.DEBUG_CALC_TIME' | translate }}</span>
                  <span class="debug-item-val">{{ debug.calculationDurationMs }} ms</span>
                </div>
                <div class="debug-item">
                  <span class="debug-item-label">{{ 'TAXI.DEBUG_ROUTES_COUNT' | translate }}</span>
                  <span class="debug-item-val">{{ debug.routesCount }}</span>
                </div>
              </div>

              <!-- Requested vs Snapped Coordinates -->
              <div class="debug-section">
                <h4 class="debug-subheading">{{ 'TAXI.DEBUG_COORDINATES' | translate }} & {{ 'TAXI.DEBUG_ROAD_SNAP' | translate }}</h4>
                <div class="debug-coords-card">
                  <div class="coord-row">
                    <span class="coord-tag tag--pickup">A</span>
                    <div class="coord-info">
                      <span class="coord-req font-mono">Запрос: {{ debug.requestedFrom.lat.toFixed(5) }}, {{ debug.requestedFrom.lng.toFixed(5) }}</span>
                      @if (debug.snappedFrom) {
                        <span class="coord-snap font-mono">Дорога: {{ debug.snappedFrom.lat.toFixed(5) }}, {{ debug.snappedFrom.lng.toFixed(5) }} ({{ debug.distanceFromRoadMetersA }} м)</span>
                      }
                    </div>
                  </div>
                  <div class="coord-row">
                    <span class="coord-tag tag--dest">B</span>
                    <div class="coord-info">
                      <span class="coord-req font-mono">Запрос: {{ debug.requestedTo.lat.toFixed(5) }}, {{ debug.requestedTo.lng.toFixed(5) }}</span>
                      @if (debug.snappedTo) {
                        <span class="coord-snap font-mono">Дорога: {{ debug.snappedTo.lat.toFixed(5) }}, {{ debug.snappedTo.lng.toFixed(5) }} ({{ debug.distanceFromRoadMetersB }} м)</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Comparison Fastest vs Shortest -->
              @if (debug.comparison) {
                <div class="debug-section">
                  <h4 class="debug-subheading">Сравнение: Быстрый vs Кратчайший маршрут</h4>
                  <div class="debug-comparison-grid">
                    <div class="comp-box">
                      <span class="comp-title">⚡ Самый быстрый</span>
                      <span class="comp-metric">{{ debug.comparison.fastestDurationMin }} мин • {{ debug.comparison.fastestDistanceKm }} км</span>
                    </div>
                    <div class="comp-box">
                      <span class="comp-title">📏 Кратчайший</span>
                      <span class="comp-metric">{{ debug.comparison.shortestDurationMin }} мин • {{ debug.comparison.shortestDistanceKm }} км</span>
                    </div>
                    <div class="comp-box highlight">
                      <span class="comp-title">Экономия пути</span>
                      <span class="comp-metric">{{ debug.comparison.savedDistanceMeters }} м</span>
                    </div>
                  </div>
                </div>
              }

              <!-- Discovered Routes List -->
              <div class="debug-section">
                <h4 class="debug-subheading">Последовательность улиц по маршрутам</h4>
                <div class="debug-routes-table">
                  @for (r of bookingService.availableRoutes(); track r.id; let idx = $index) {
                    <div class="debug-route-row" [class.is-selected]="bookingService.selectedRouteIndex() === idx">
                      <div class="debug-route-title">
                        <span class="route-pill" [style.background-color]="r.color || '#2f6bff'"></span>
                        <strong>Маршрут {{ idx + 1 }} ({{ r.badgeLabelKey | translate }}):</strong>
                        <span>{{ r.drivingDistanceKm }} км • {{ r.drivingDurationMinutes }} мин</span>
                      </div>
                      <div class="debug-route-streets font-mono">
                        {{ r.traversedStreets.join(' → ') || 'Прямое дорожное соединение' }}
                      </div>
                    </div>
                  }
                </div>
              </div>

              @if (debug.rawApiNotes) {
                <div class="debug-notes">
                  <strong>Заметка API:</strong> {{ debug.rawApiNotes }}
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .taxi-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: page-in 0.3s ease-out;
    }

    .taxi-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .taxi-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: rgba(47, 107, 255, 0.12);
      color: #2f6bff;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin-bottom: 0.35rem;
    }

    .taxi-badge__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2f6bff;
      box-shadow: 0 0 8px #2f6bff;
    }

    .taxi-title {
      margin: 0;
      font-family: var(--font-display, sans-serif);
      font-size: clamp(1.4rem, 4vw, 1.95rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--tashuu-navy, #0b1f44);
      line-height: 1.2;
    }

    .taxi-subtitle {
      margin: 0.25rem 0 0;
      color: var(--tashuu-muted, #5f6f86);
      font-size: 0.875rem;
    }

    /* 2-Column Workspace */
    .taxi-workspace {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 1.25rem;
      min-height: 640px;
      height: calc(100vh - 12rem);
    }

    @media (max-width: 960px) {
      .taxi-workspace {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 0;
      }
    }

    /* Booking Panel */
    .booking-panel {
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1px solid rgba(226, 232, 242, 0.95);
      box-shadow: 0 10px 30px rgba(11, 31, 68, 0.08);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 5;
    }

    .booking-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Address Inputs */
    .address-group {
      position: relative;
      background: #f8fafc;
      border: 1.5px solid #e2e8f2;
      border-radius: 1rem;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
    }

    .address-field-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #ffffff;
      border-radius: 0.75rem;
      padding: 0.45rem 0.65rem;
      box-shadow: 0 1px 3px rgba(11, 31, 68, 0.04);
      border: 1px solid #eef2f8;
    }

    .field-indicator {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }

    .field-indicator--pickup {
      background: #10b981;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
    }

    .field-indicator--dest {
      background: #ef4444;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
    }

    .field-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .field-label-mini {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      line-height: 1;
      margin-bottom: 2px;
    }

    .field-input-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .address-input {
      flex: 1;
      border: none !important;
      outline: none;
      padding: 0 !important;
      font-size: 0.875rem;
      font-weight: 600;
      color: #12233f;
      background: transparent;
      min-height: auto !important;
    }

    .address-input::placeholder {
      color: #94a3b8;
      font-weight: 400;
    }

    .field-action-btn {
      width: 28px;
      height: 28px;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      background: #f1f5f9;
      color: #5f6f86;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.14s, color 0.14s, transform 0.14s;
    }

    .field-action-btn:hover:not(:disabled) {
      background: #e2e8f2;
      color: #2f6bff;
      transform: translateY(-1px);
    }

    .field-action-btn--gps:hover:not(:disabled) {
      background: rgba(47, 107, 255, 0.12);
      color: #2f6bff;
    }

    .field-action-btn--map:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .field-inline-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(47, 107, 255, 0.2);
      border-top-color: #2f6bff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    /* Swap row */
    .swap-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 26px;
      margin: 2px 0;
    }

    .connector-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 17px;
      width: 2px;
      background: #cbd5e1;
    }

    .swap-btn {
      position: relative;
      z-index: 2;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      color: #2f6bff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(11, 31, 68, 0.08);
      transition: transform 0.25s ease, border-color 0.15s, background 0.15s;
    }

    .swap-btn:hover {
      background: #eef2f8;
      border-color: #2f6bff;
      transform: rotate(180deg);
    }

    /* Autocomplete Dropdown */
    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 200;
      margin: 0.35rem 0 0;
      padding: 0.35rem 0;
      list-style: none;
      background: #ffffff;
      border-radius: 0.85rem;
      border: 1px solid #e2e8f2;
      box-shadow: 0 12px 30px rgba(11, 31, 68, 0.16);
      max-height: 210px;
      overflow-y: auto;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.85rem;
      cursor: pointer;
      transition: background 0.12s;
    }

    .suggestion-item:hover {
      background: #f1f5f9;
    }

    .suggestion-icon {
      color: #2f6bff;
      flex-shrink: 0;
    }

    .suggestion-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .suggestion-main {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0b1f44;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-sub {
      font-size: 0.725rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Route preview pill */
    .route-preview-badge {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.85rem;
      border-radius: 0.85rem;
      background: #f0f7ff;
      border: 1px solid rgba(47, 107, 255, 0.2);
      color: #1f4b99;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .route-stat {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .route-stat-val {
      font-weight: 700;
      color: #0b1f44;
    }

    .stat-sep {
      color: #94a3b8;
    }

    .route-traffic-status {
      margin-left: auto;
      font-size: 0.725rem;
      color: #059669;
      background: rgba(16, 185, 129, 0.12);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-weight: 700;
    }

    .route-preview-badge.calculating {
      background: #f8fafc;
      border-color: #e2e8f2;
      color: #5f6f86;
    }

    .route-preview-badge.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    /* Routes Section & Alternative Route Chips */
    .routes-section {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .routes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .routes-count-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: rgba(47, 107, 255, 0.1);
      color: #2f6bff;
    }

    .routes-cards-row {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .route-select-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f2;
      border-radius: 0.75rem;
      padding: 0.65rem 0.85rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      text-align: left;
      font: inherit;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .route-select-card:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
      transform: translateY(-1px);
    }

    .route-select-card--active {
      border-color: #2f6bff !important;
      background: #f4f8ff !important;
      box-shadow: 0 6px 16px rgba(47, 107, 255, 0.16);
    }

    .routes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .routes-header__left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .routes-compare-hint {
      font-size: 0.7rem;
      color: #64748b;
      font-style: italic;
    }

    .route-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .route-num-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .route-num-label {
      font-size: 0.8rem;
      font-weight: 800;
      color: #0b1f44;
    }

    .route-badge-tag {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
    }

    .route-color-pill {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
    }

    .route-badge-tag--fastest {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .route-badge-tag--shortest {
      background: rgba(47, 107, 255, 0.12);
      color: #2f6bff;
    }

    .route-badge-tag--walking {
      background: rgba(14, 165, 233, 0.12);
      color: #0284c7;
    }

    .route-time-val {
      font-size: 0.925rem;
      font-weight: 800;
      color: #0b1f44;
    }

    .route-walk-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .route-access-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      font-size: 0.725rem;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 0.4rem 0.6rem;
      border-radius: 0.5rem;
      line-height: 1.35;
      margin-top: 0.15rem;
    }

    .route-access-notice .notice-icon {
      flex-shrink: 0;
      font-size: 0.8rem;
    }

    .single-route-badge-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .route-card-meta {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.775rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .route-dist-val {
      font-weight: 700;
      color: #1e293b;
    }

    .route-diff-val {
      font-weight: 600;
      color: #64748b;
    }

    .route-diff-val--fastest {
      color: #059669;
      font-weight: 700;
    }

    .route-streets-preview {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding-top: 0.35rem;
      margin-top: 0.15rem;
      border-top: 1px dashed #e2e8f2;
      font-size: 0.725rem;
      color: #475569;
      overflow: hidden;
      white-space: nowrap;
    }

    .streets-icon {
      font-size: 0.8rem;
      flex-shrink: 0;
    }

    .streets-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    /* Single Route Box */
    .single-route-box {
      background: #ffffff;
      border: 1.5px solid #2f6bff;
      border-radius: 0.85rem;
      padding: 0.75rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      box-shadow: 0 4px 14px rgba(47, 107, 255, 0.12);
    }

    .single-route-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .single-route-note {
      font-size: 0.725rem;
      color: #64748b;
      font-style: italic;
    }

    /* Turn-by-Turn Expandable Steps */
    .route-steps-container {
      margin-top: 0.5rem;
    }

    .route-steps-toggle-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f2;
      border-radius: 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #2f6bff;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .route-steps-toggle-btn:hover {
      background: #f1f5f9;
      color: #1d4ed8;
      border-color: #cbd5e1;
    }

    .toggle-chevron {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toggle-chevron.is-open {
      transform: rotate(180deg);
    }

    .route-steps-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 0.4rem;
      padding: 0.4rem;
      background: #ffffff;
      border: 1px solid #e2e8f2;
      border-radius: 0.65rem;
      box-shadow: inset 0 2px 4px rgba(11, 31, 68, 0.04);
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.35rem 0.45rem;
      border-radius: 0.45rem;
      transition: background 0.12s ease;
    }

    .step-item:hover {
      background: #f8fafc;
    }

    .step-icon-wrap {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(47, 107, 255, 0.12);
      color: #2f6bff;
      font-size: 0.6875rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      flex: 1;
      min-width: 0;
    }

    .step-instruction {
      font-size: 0.775rem;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.35;
    }

    .step-street {
      font-size: 0.7rem;
      color: #64748b;
    }

    /* Tariffs Section */
    .tariffs-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-title-mini {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .tariffs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
      gap: 0.5rem;
    }

    .tariff-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f2;
      border-radius: 0.85rem;
      padding: 0.65rem 0.7rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    }

    .tariff-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }

    .tariff-card--selected {
      border-color: #2f6bff !important;
      background: #f4f8ff;
      box-shadow: 0 4px 14px rgba(47, 107, 255, 0.18);
    }

    .tariff-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tariff-icon {
      color: #2f6bff;
      flex-shrink: 0;
    }

    .tariff-names {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tariff-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0b1f44;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tariff-eta {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .tariff-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tariff-price {
      font-size: 0.875rem;
      font-weight: 800;
      color: #0b1f44;
    }

    /* Options / Payment Row */
    .options-row {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .payment-selector {
      display: flex;
      gap: 0.4rem;
    }

    .payment-chip {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.4rem 0.6rem;
      border-radius: 0.65rem;
      border: 1px solid #e2e8f2;
      background: #f8fafc;
      color: #475569;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.14s, border-color 0.14s, color 0.14s;
    }

    .payment-chip:hover {
      background: #eef2f8;
    }

    .payment-chip--active {
      background: #0b1f44;
      color: #ffffff;
      border-color: #0b1f44;
    }

    .comment-input-wrap {
      width: 100%;
    }

    .comment-input {
      width: 100%;
      border: 1.5px solid #e2e8f2 !important;
      border-radius: 0.65rem !important;
      padding: 0.45rem 0.75rem !important;
      font-size: 0.8125rem !important;
      min-height: 2.1rem !important;
      background: #f8fafc;
    }

    .comment-input:focus {
      background: #ffffff;
      border-color: #2f6bff !important;
    }

    /* CTA Button */
    .submit-section {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .taxi-submit-btn {
      min-height: 3.1rem;
      font-size: 1rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1.4rem;
      border-radius: 1rem;
      background: linear-gradient(180deg, #3d7eff 0%, #1f5cf2 100%);
      box-shadow: 0 8px 24px rgba(47, 107, 255, 0.35);
    }

    .btn-price {
      background: rgba(255, 255, 255, 0.22);
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.9rem;
    }

    .validation-hint {
      margin: 0;
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Map Viewport */
    .map-viewport {
      border-radius: 1.25rem;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 242, 0.95);
      box-shadow: 0 10px 30px rgba(11, 31, 68, 0.08);
      position: relative;
      min-height: 480px;
    }

    /* Searching Radar State */
    .searching-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1rem;
      gap: 1.25rem;
      margin: auto 0;
    }

    .radar-spinner {
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-circle {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(47, 107, 255, 0.4);
      animation: radar-pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }

    .circle-1 { width: 45px; height: 45px; animation-delay: 0s; }
    .circle-2 { width: 85px; height: 85px; animation-delay: 0.4s; }
    .circle-3 { width: 130px; height: 130px; animation-delay: 0.8s; }

    @keyframes radar-pulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.3); opacity: 0; }
    }

    .radar-car-icon {
      position: relative;
      z-index: 2;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #2f6bff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(47, 107, 255, 0.4);
    }

    .searching-copy {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .searching-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #0b1f44;
    }

    .searching-desc {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    .order-quick-summary {
      width: 100%;
      background: #f8fafc;
      border-radius: 0.85rem;
      padding: 0.85rem;
      border: 1px solid #e2e8f2;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      text-align: left;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .summary-label {
      color: #64748b;
    }

    .summary-val {
      font-weight: 600;
      color: #0b1f44;
      text-align: right;
    }

    .cancel-search-btn {
      width: 100%;
      color: #dc2626 !important;
      border-color: #fca5a5 !important;
    }

    /* Driver Assigned State */
    .driver-assigned-state {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .driver-header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-size: 0.8125rem;
      font-weight: 800;
      align-self: flex-start;
    }

    .driver-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f2;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 4px 16px rgba(11, 31, 68, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .driver-card__top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .driver-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #eef2f8;
      color: #2f6bff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .driver-identity {
      flex: 1;
      overflow: hidden;
    }

    .driver-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #0b1f44;
    }

    .driver-rating {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      margin-top: 2px;
    }

    .star-icon {
      color: #f59e0b;
    }

    .rating-val {
      font-weight: 700;
      color: #0b1f44;
    }

    .rides-count {
      color: #64748b;
    }

    .driver-eta {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f0f7ff;
      border-radius: 0.65rem;
      padding: 0.35rem 0.65rem;
      border: 1px solid rgba(47, 107, 255, 0.2);
    }

    .eta-num {
      font-size: 1.25rem;
      font-weight: 800;
      color: #2f6bff;
      line-height: 1;
    }

    .eta-unit {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #5f6f86;
    }

    .driver-car-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border-radius: 0.75rem;
      padding: 0.65rem 0.85rem;
      border: 1px solid #e2e8f2;
    }

    .car-info {
      display: flex;
      flex-direction: column;
    }

    .car-model {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0b1f44;
    }

    .car-color {
      font-size: 0.75rem;
      color: #64748b;
    }

    .car-plate {
      background: #ffffff;
      border: 1.5px solid #0b1f44;
      color: #0b1f44;
      padding: 0.25rem 0.65rem;
      border-radius: 0.4rem;
      font-family: monospace;
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .driver-call-btn {
      background: #0f8a5f;
      color: #ffffff;
      min-height: 2.5rem;
      font-size: 0.875rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 14px rgba(15, 138, 95, 0.25);
    }

    .order-meta-card {
      background: #f8fafc;
      border-radius: 0.85rem;
      padding: 0.85rem;
      border: 1px solid #e2e8f2;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.8125rem;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      color: #64748b;
    }

    .meta-val {
      color: #0b1f44;
    }

    .text-accent {
      color: #2f6bff !important;
    }

    .font-mono {
      font-family: monospace;
    }

    .font-bold {
      font-weight: 700;
    }

    /* Debug toggle button */
    .debug-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-size: 0.775rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
      transition: all 0.15s ease;
    }

    .debug-toggle-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .debug-toggle-btn--active {
      background: #1e293b;
      color: #ffffff;
      border-color: #0f172a;
    }

    .debug-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .debug-provider-tag {
      background: #e2e8f0;
      color: #0f172a;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 800;
    }

    .debug-toggle-btn--active .debug-provider-tag {
      background: #334155;
      color: #f8fafc;
    }

    /* Objective filter chips */
    .objective-chips-bar {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.6rem;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .obj-chip {
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .obj-chip:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .obj-chip--active {
      background: #2f6bff;
      color: #ffffff;
      border-color: #2f6bff;
      box-shadow: 0 2px 6px rgba(47, 107, 255, 0.25);
    }

    .route-diff-val--shortest {
      color: #059669 !important;
      font-weight: 700;
    }

    /* Debug Modal */
    .debug-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    .debug-modal-content {
      width: 100%;
      max-width: 680px;
      max-height: 85vh;
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .debug-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .debug-header-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .debug-header-title h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }

    .debug-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: #e2e8f0;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
      transition: background 0.15s;
    }

    .debug-close-btn:hover {
      background: #cbd5e1;
      color: #0f172a;
    }

    .debug-modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .debug-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .debug-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      background: #f8fafc;
      padding: 0.65rem 0.85rem;
      border-radius: 0.65rem;
      border: 1px solid #e2e8f0;
    }

    .debug-item-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.04em;
    }

    .debug-item-val {
      font-size: 0.85rem;
      color: #1e293b;
    }

    .debug-section {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .debug-subheading {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
    }

    .debug-coords-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
    }

    .coord-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .coord-tag {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .coord-tag.tag--pickup { background: #10b981; }
    .coord-tag.tag--dest { background: #ef4444; }

    .coord-info {
      display: flex;
      flex-direction: column;
      font-size: 0.775rem;
      gap: 1px;
    }

    .coord-req { color: #334155; }
    .coord-snap { color: #0284c7; }

    .debug-comparison-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.65rem;
    }

    .comp-box {
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.6rem;
      border-radius: 0.65rem;
      gap: 0.2rem;
    }

    .comp-box.highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .comp-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
    }

    .comp-box.highlight .comp-title { color: #047857; }

    .comp-metric {
      font-size: 0.85rem;
      font-weight: 800;
      color: #0f172a;
    }

    .comp-box.highlight .comp-metric { color: #059669; }

    .debug-routes-table {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .debug-route-row {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .debug-route-row.is-selected {
      border-color: #2f6bff;
      background: #f0f7ff;
    }

    .debug-route-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.825rem;
    }

    .debug-route-streets {
      font-size: 0.75rem;
      color: #475569;
      line-height: 1.4;
      word-break: break-word;
    }

    .debug-notes {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border-left: 3px solid #2f6bff;
    }

    @media (max-width: 960px) {
      .map-viewport {
        min-height: 380px;
        order: -1;
      }
    }
  `]
})
export class TaxiBookingComponent implements OnInit, OnDestroy {
  bookingService = inject(TaxiBookingService);
  private geocoding = inject(TaxiGeocodingService);

  isDevMode = !environment.production || (environment as any).enableRouteDebug;
  showDebugPanel = false;

  fromInputText = '';
  toInputText = '';
  orderComment = '';

  fromSuggestions: GeocodingSearchResult[] = [];
  toSuggestions: GeocodingSearchResult[] = [];

  isSearchingFrom = false;
  isSearchingTo = false;
  isLocating = false;

  activePickerField: 'from' | 'to' | null = null;
  isRouteDetailsExpanded = false;

  private fromSearchSubject = new Subject<string>();
  private toSearchSubject = new Subject<string>();

  toggleDebugPanel(): void {
    this.showDebugPanel = !this.showDebugPanel;
  }

  hasMultipleObjectives(): boolean {
    const routes = this.bookingService.availableRoutes();
    return routes.some(r => r.badgeType === 'shortest') || routes.some(r => r.badgeType === 'fastest');
  }

  isObjectiveSelected(obj: string): boolean {
    const current = this.bookingService.route();
    if (!current) return false;
    return current.objective === obj || current.badgeType === obj;
  }

  filterByObjective(obj: string): void {
    const routes = this.bookingService.availableRoutes();
    const idx = routes.findIndex(r => r.objective === obj || r.badgeType === obj);
    if (idx !== -1) {
      this.bookingService.selectRoute(idx);
    }
  }

  toggleRouteDetails(): void {
    this.isRouteDetailsExpanded = !this.isRouteDetailsExpanded;
  }

  ngOnInit(): void {
    // Sync initial state from service
    const initialFrom = this.bookingService.fromLocation();
    if (initialFrom) {
      this.fromInputText = initialFrom.address;
    }

    const initialTo = this.bookingService.toLocation();
    if (initialTo) {
      this.toInputText = initialTo.address;
    }

    // Debounced search for From field
    this.fromSearchSubject.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) {
          this.isSearchingFrom = false;
          return of([]);
        }
        this.isSearchingFrom = true;
        return this.geocoding.searchAddresses(q);
      })
    ).subscribe(results => {
      this.isSearchingFrom = false;
      this.fromSuggestions = results;
    });

    // Debounced search for To field
    this.toSearchSubject.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) {
          this.isSearchingTo = false;
          return of([]);
        }
        this.isSearchingTo = true;
        return this.geocoding.searchAddresses(q);
      })
    ).subscribe(results => {
      this.isSearchingTo = false;
      this.toSuggestions = results;
    });
  }

  ngOnDestroy(): void {
    this.fromSearchSubject.complete();
    this.toSearchSubject.complete();
  }

  onFromTextChange(val: string): void {
    this.fromInputText = val;
    this.fromSearchSubject.next(val);
  }

  onToTextChange(val: string): void {
    this.toInputText = val;
    this.toSearchSubject.next(val);
  }

  selectFromSuggestion(item: GeocodingSearchResult): void {
    this.fromInputText = item.addressShort;
    this.fromSuggestions = [];
    const loc: TaxiLocation = {
      address: item.addressShort,
      displayName: item.displayName,
      point: item.point,
      placeId: item.placeId
    };
    this.bookingService.setFrom(loc);
  }

  selectToSuggestion(item: GeocodingSearchResult): void {
    this.toInputText = item.addressShort;
    this.toSuggestions = [];
    const loc: TaxiLocation = {
      address: item.addressShort,
      displayName: item.displayName,
      point: item.point,
      placeId: item.placeId
    };
    this.bookingService.setTo(loc);
  }

  clearFromField(): void {
    this.fromInputText = '';
    this.fromSuggestions = [];
    this.bookingService.clearFrom();
  }

  clearToField(): void {
    this.toInputText = '';
    this.toSuggestions = [];
    this.bookingService.clearTo();
  }

  useCurrentLocation(): void {
    this.isLocating = true;
    this.geocoding.getCurrentLocation().subscribe({
      next: loc => {
        this.isLocating = false;
        this.fromInputText = loc.address;
        this.fromSuggestions = [];
        this.bookingService.setFrom(loc);
      },
      error: err => {
        this.isLocating = false;
        console.warn('Geolocation failed:', err);
      }
    });
  }

  swapAddresses(): void {
    const tempText = this.fromInputText;
    this.fromInputText = this.toInputText;
    this.toInputText = tempText;

    this.fromSuggestions = [];
    this.toSuggestions = [];

    this.bookingService.swapLocations();
  }

  openMapPicker(field: 'from' | 'to'): void {
    this.activePickerField = field;
  }

  closeMapPicker(): void {
    this.activePickerField = null;
  }

  onMapPickerConfirmed(loc: TaxiLocation): void {
    if (this.activePickerField === 'from') {
      this.fromInputText = loc.address;
      this.fromSuggestions = [];
      this.bookingService.setFrom(loc);
    } else if (this.activePickerField === 'to') {
      this.toInputText = loc.address;
      this.toSuggestions = [];
      this.bookingService.setTo(loc);
    }
    this.activePickerField = null;
  }

  onFindTaxiClick(): void {
    this.bookingService.startDriverSearch(this.orderComment);
  }
}
