import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GeoPoint, GeocodingSearchResult, TaxiLocation } from '../../../core/models/taxi.model';
import { TaxiGeocodingService } from '../../../core/services/taxi-geocoding.service';
import { DgisMapService } from '../../../core/services/dgis-map.service';

@Component({
  selector: 'app-taxi-map-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="map-picker-overlay" (click)="onBackdropClick($event)">
      <div class="map-picker-dialog" role="dialog" aria-modal="true">
        <!-- Header -->
        <header class="picker-header">
          <div class="picker-header__title-wrap">
            <span class="picker-badge" [class.picker-badge--to]="targetField === 'to'">
              {{ targetField === 'from' ? ('TAXI.PICKUP_POINT' | translate) : ('TAXI.DESTINATION_POINT' | translate) }}
            </span>
            <h2 class="picker-header__title">
              {{ targetField === 'from' ? ('TAXI.SELECT_FROM_MAP' | translate) : ('TAXI.SELECT_TO_MAP' | translate) }}
            </h2>
          </div>
          <button type="button" class="picker-close-btn" (click)="cancel()" [attr.aria-label]="'COMMON.CANCEL' | translate">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <!-- Search Bar within Map -->
        <div class="picker-search-bar">
          <div class="search-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              class="search-input"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput(searchQuery)"
              [placeholder]="'TAXI.SEARCH_MAP_PLACEHOLDER' | translate"
              autocomplete="off"
            />
            @if (searchQuery) {
              <button type="button" class="search-clear-btn" (click)="clearSearch()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            }
          </div>

          <!-- Autocomplete results dropdown -->
          @if (searchResults.length > 0) {
            <ul class="search-results-list">
              @for (item of searchResults; track item.placeId) {
                <li class="search-item" (click)="selectSearchResult(item)">
                  <div class="search-item__icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div class="search-item__info">
                    <span class="search-item__main">{{ item.addressShort }}</span>
                    <span class="search-item__sub">{{ item.displayName }}</span>
                  </div>
                </li>
              }
            </ul>
          }
        </div>

        <!-- Interactive Map Canvas Container -->
        <div class="picker-map-wrap">
          <div #modalMapContainer class="picker-map-canvas"></div>

          <!-- Floating Center Pin Target -->
          <div class="center-pin-container" [class.is-dragging]="isMapMoving">
            <div class="center-pin" [class.center-pin--to]="targetField === 'to'">
              <span class="center-pin-badge">{{ targetField === 'from' ? 'A' : 'B' }}</span>
            </div>
            <div class="center-pin-shadow"></div>
          </div>

          <!-- GPS Current Location FAB -->
          <button
            type="button"
            class="map-fab-gps"
            (click)="locateUser()"
            [attr.title]="'TAXI.USE_MY_LOCATION' | translate"
            [disabled]="isLocating"
          >
            @if (isLocating) {
              <div class="spinner-sm"></div>
            } @else {
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="7"/>
                <line x1="12" y1="1" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="1" y1="12" x2="5" y2="12"/>
                <line x1="19" y1="12" x2="23" y2="12"/>
              </svg>
            }
          </button>
        </div>

        <!-- Footer / Selected Address Preview & Confirm -->
        <footer class="picker-footer">
          <div class="selected-address-preview">
            <div class="address-preview-icon" [class.address-preview-icon--to]="targetField === 'to'">
              @if (isReverseGeocoding) {
                <div class="spinner-sm spinner-accent"></div>
              } @else {
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              }
            </div>
            <div class="address-preview-text">
              <span class="preview-label">
                {{ targetField === 'from' ? ('TAXI.PICKUP_LOCATION' | translate) : ('TAXI.DESTINATION_LOCATION' | translate) }}
              </span>
              <p class="preview-address">
                @if (isReverseGeocoding) {
                  <span class="geocoding-spinner">{{ 'TAXI.IDENTIFYING_ADDRESS' | translate }}</span>
                } @else {
                  {{ currentAddressText || ('TAXI.MOVE_MAP_TO_SELECT' | translate) }}
                }
              </p>
            </div>
          </div>

          <div class="picker-footer-actions">
            <button id="modal-cancel-btn" type="button" class="btn btn--ghost picker-cancel-btn" (click)="cancel()">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              id="modal-confirm-btn"
              type="button"
              class="btn picker-confirm-btn"
              [disabled]="isReverseGeocoding || !currentCenterPoint || !currentAddressText"
              (click)="confirmSelection()"
            >
              {{ 'TAXI.CONFIRM_LOCATION' | translate }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .map-picker-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(11, 31, 68, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: modal-fade 0.2s ease-out;
    }

    @keyframes modal-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .map-picker-dialog {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 920px;
      height: 90vh;
      max-height: 780px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(5, 15, 35, 0.35);
      position: relative;
      animation: modal-zoom 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modal-zoom {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--tashuu-line, #e2e8f2);
      background: #ffffff;
      z-index: 10;
    }

    .picker-header__title-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .picker-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .picker-badge--to {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .picker-header__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--tashuu-navy, #0b1f44);
    }

    .picker-close-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid #e2e8f2;
      background: #f8fafc;
      color: #5f6f86;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s, transform 0.15s;
    }

    .picker-close-btn:hover {
      background: #e2e8f2;
      color: #0b1f44;
      transform: rotate(90deg);
    }

    .picker-search-bar {
      position: absolute;
      top: 4.5rem;
      left: 1.25rem;
      right: 1.25rem;
      z-index: 1000;
      max-width: 480px;
      margin: 0 auto;
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #ffffff;
      border-radius: 0.85rem;
      box-shadow: 0 8px 24px rgba(11, 31, 68, 0.15), 0 0 0 1px rgba(11, 31, 68, 0.08);
      overflow: hidden;
    }

    .search-icon {
      margin-left: 0.85rem;
      color: #5f6f86;
      flex-shrink: 0;
    }

    .search-input {
      width: 100%;
      height: 44px;
      border: none !important;
      outline: none;
      padding: 0 0.75rem;
      font-size: 0.9rem;
      color: #12233f;
    }

    .search-clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.5rem 0.85rem;
      display: flex;
      align-items: center;
    }

    .search-clear-btn:hover {
      color: #0b1f44;
    }

    .search-results-list {
      margin: 0.4rem 0 0;
      padding: 0.4rem 0;
      list-style: none;
      background: #ffffff;
      border-radius: 0.85rem;
      box-shadow: 0 12px 30px rgba(11, 31, 68, 0.2);
      max-height: 220px;
      overflow-y: auto;
    }

    .search-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.85rem;
      cursor: pointer;
      transition: background 0.12s;
    }

    .search-item:hover {
      background: #f1f5f9;
    }

    .search-item__icon {
      color: #2f6bff;
      flex-shrink: 0;
    }

    .search-item__info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .search-item__main {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0b1f44;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .search-item__sub {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .picker-map-wrap {
      flex: 1;
      position: relative;
      width: 100%;
      min-height: 320px;
    }

    .picker-map-canvas {
      width: 100%;
      height: 100%;
    }

    .center-pin-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      z-index: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .center-pin-container.is-dragging {
      transform: translate(-50%, -130%);
    }

    .center-pin {
      width: 38px;
      height: 38px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 8px 22px rgba(5, 150, 105, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .center-pin--to {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 8px 22px rgba(220, 38, 38, 0.45);
    }

    .center-pin-badge {
      transform: rotate(45deg);
      color: #ffffff;
      font-weight: 800;
      font-size: 15px;
    }

    .center-pin-shadow {
      width: 16px;
      height: 6px;
      background: rgba(11, 31, 68, 0.35);
      border-radius: 50%;
      margin-top: -3px;
      filter: blur(1px);
      transition: transform 0.2s, opacity 0.2s;
    }

    .center-pin-container.is-dragging .center-pin-shadow {
      transform: scale(0.65);
      opacity: 0.4;
    }

    .map-fab-gps {
      position: absolute;
      bottom: 1.5rem;
      right: 1.25rem;
      z-index: 500;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #ffffff;
      color: #12233f;
      border: none;
      box-shadow: 0 6px 18px rgba(11, 31, 68, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, background 0.15s;
    }

    .map-fab-gps:hover {
      background: #f8fafc;
      transform: scale(1.05);
      color: #2f6bff;
    }

    /* Footer */
    .picker-footer {
      padding: 1rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid var(--tashuu-line, #e2e8f2);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      z-index: 10;
    }

    .selected-address-preview {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex: 1 1 300px;
      min-width: 0;
    }

    .address-preview-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.75rem;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .address-preview-icon--to {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .address-preview-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .preview-label {
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .preview-address {
      margin: 0.15rem 0 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0b1f44;
      white-space: normal;
      overflow-wrap: break-word;
      line-height: 1.35;
    }

    .geocoding-spinner {
      color: #2f6bff;
      animation: pulse 1.2s infinite ease-in-out;
    }

    .picker-footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .picker-confirm-btn {
      padding: 0.55rem 1.45rem;
      font-size: 0.875rem;
    }

    .spinner-sm {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(47, 107, 255, 0.2);
      border-top-color: #2f6bff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-accent {
      border-top-color: #059669;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 640px) {
      .map-picker-overlay {
        padding: 0;
      }

      .map-picker-dialog {
        height: 100dvh;
        max-height: 100dvh;
        border-radius: 0;
      }

      .picker-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .picker-footer-actions {
        width: 100%;
      }

      .picker-footer-actions .btn {
        flex: 1;
      }
    }
  `]
})
export class TaxiMapPickerModalComponent implements OnInit, OnDestroy {
  @ViewChild('modalMapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  @Input() targetField: 'from' | 'to' = 'from';
  @Input() initialLocation: TaxiLocation | null = null;

  @Output() confirmed = new EventEmitter<TaxiLocation>();
  @Output() cancelled = new EventEmitter<void>();

  private geocoding = inject(TaxiGeocodingService);
  private dgisMap = inject(DgisMapService);

  readonly mapId = 'picker-modal-map-' + Math.random().toString(36).substring(2, 9);

  searchQuery = '';
  searchResults: GeocodingSearchResult[] = [];
  isMapMoving = false;
  isReverseGeocoding = false;
  isLocating = false;
  currentAddressText = '';
  currentCenterPoint: GeoPoint | null = null;
  resolvedLocation: TaxiLocation | null = null;

  private searchSubject = new Subject<string>();
  private moveEndTimeout: any = null;
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    this.setupSearch();
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.moveEndTimeout) clearTimeout(this.moveEndTimeout);
    this.resizeObserver?.disconnect();
    this.dgisMap.destroyMap(this.mapId);
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => this.geocoding.searchAddresses(q))
    ).subscribe(results => {
      this.searchResults = results;
    });
  }

  onSearchInput(val: string): void {
    this.searchSubject.next(val);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  selectSearchResult(item: GeocodingSearchResult): void {
    this.searchQuery = item.addressShort;
    this.searchResults = [];

    this.dgisMap.setCenter(this.mapId, item.point, 16);
    this.currentCenterPoint = item.point;
    this.currentAddressText = item.displayName || item.addressShort;
    this.resolvedLocation = {
      address: this.currentAddressText,
      displayName: item.displayName,
      point: item.point,
      street: item.street,
      houseNumber: item.houseNumber,
      district: item.district,
      city: item.city,
      postcode: item.postcode,
      country: item.country
    };
  }

  private async initMap(): Promise<void> {
    const el = this.mapContainerRef.nativeElement;
    const startPoint: GeoPoint = this.initialLocation?.point || { lat: 42.8765, lng: 74.6037 };
    this.currentCenterPoint = startPoint;

    if (this.initialLocation?.address) {
      this.currentAddressText = this.initialLocation.address;
      this.resolvedLocation = { ...this.initialLocation };
    }

    try {
      const map = await this.dgisMap.createMap(this.mapId, el, {
        center: startPoint,
        zoom: 16,
        interactive: true,
        zoomControl: 'topRight'
      });

      map.on('movestart', () => {
        this.isMapMoving = true;
      });

      map.on('moveend', () => {
        this.isMapMoving = false;
        const center = this.dgisMap.getCenter(this.mapId);
        if (center) {
          this.currentCenterPoint = center;
          this.triggerReverseGeocode(center);
        }
      });

      this.resizeObserver = new ResizeObserver(() => {
        this.dgisMap.invalidateSize(this.mapId);
      });
      this.resizeObserver.observe(el);

      if (!this.currentAddressText) {
        this.triggerReverseGeocode(startPoint);
      }

      setTimeout(() => this.dgisMap.invalidateSize(this.mapId), 200);
    } catch (err) {
      console.error('Failed to initialize 2GIS map in modal picker:', err);
    }
  }

  private triggerReverseGeocode(point: GeoPoint): void {
    if (this.moveEndTimeout) clearTimeout(this.moveEndTimeout);

    this.isReverseGeocoding = true;
    this.moveEndTimeout = setTimeout(() => {
      this.geocoding.reverseGeocode(point).subscribe({
        next: loc => {
          this.currentAddressText = loc.address;
          this.resolvedLocation = {
            ...loc,
            point: { lat: point.lat, lng: point.lng }
          };
          this.isReverseGeocoding = false;
        },
        error: () => {
          this.currentAddressText = 'Бишкек, Кыргызстан';
          this.resolvedLocation = {
            address: 'Бишкек, Кыргызстан',
            point: { lat: point.lat, lng: point.lng },
            city: 'Бишкек',
            country: 'Кыргызстан'
          };
          this.isReverseGeocoding = false;
        }
      });
    }, 280);
  }

  locateUser(): void {
    this.isLocating = true;
    this.geocoding.getCurrentLocation().subscribe({
      next: loc => {
        this.isLocating = false;
        if (loc.point) {
          this.dgisMap.setCenter(this.mapId, loc.point, 16);
          this.currentAddressText = loc.address;
          this.currentCenterPoint = loc.point;
          this.resolvedLocation = loc;
        }
      },
      error: () => {
        this.isLocating = false;
      }
    });
  }

  confirmSelection(): void {
    if (!this.currentCenterPoint) return;

    const location: TaxiLocation = this.resolvedLocation || {
      address: this.currentAddressText || 'Бишкек, Кыргызстан',
      point: this.currentCenterPoint
    };
    this.confirmed.emit(location);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('map-picker-overlay')) {
      this.cancel();
    }
  }
}
