import { Injectable, inject, signal, computed } from '@angular/core';
import { TaxiGeocodingService } from './taxi-geocoding.service';
import { TaxiRoutingService } from './taxi-routing.service';
import {
  PaymentMethod,
  RouteCalculationResult,
  RouteDebugInfo,
  RouteInfo,
  TaxiBooking,
  TaxiBookingStatus,
  TaxiDriverInfo,
  TaxiLocation,
  TaxiTariff
} from '../models/taxi.model';

@Injectable({
  providedIn: 'root'
})
export class TaxiBookingService {
  private geocoding = inject(TaxiGeocodingService);
  private routing = inject(TaxiRoutingService);

  // Reactive state signals
  readonly fromLocation = signal<TaxiLocation | null>(null);
  readonly toLocation = signal<TaxiLocation | null>(null);

  // Alternative road routes returned by routing provider
  readonly availableRoutes = signal<RouteInfo[]>([]);
  readonly selectedRouteIndex = signal<number>(0);
  readonly routeDebugInfo = signal<RouteDebugInfo | null>(null);

  // Active selected route
  readonly route = computed(() => {
    const routes = this.availableRoutes();
    const idx = this.selectedRouteIndex();
    return routes[idx] || routes[0] || null;
  });

  readonly tariffs = signal<TaxiTariff[]>([]);
  readonly selectedTariff = signal<TaxiTariff | null>(null);
  readonly paymentMethod = signal<PaymentMethod>('cash');
  readonly bookingState = signal<TaxiBookingStatus>('draft');
  readonly activeBooking = signal<TaxiBooking | null>(null);
  readonly isCalculatingRoute = signal<boolean>(false);
  readonly routeError = signal<string | null>(null);

  // Computed state
  readonly isReadyToBook = computed(() => {
    const from = this.fromLocation();
    const to = this.toLocation();
    const r = this.route();
    return !!(from?.point && to?.point && r && this.selectedTariff());
  });

  private searchTimer: any = null;
  private routeCalculationSub?: any;

  constructor() {
    const initialTariffs = this.routing.defaultTariffs.map(t => ({
      ...t,
      estimatedPrice: t.basePrice
    }));
    this.tariffs.set(initialTariffs);
    this.selectedTariff.set(initialTariffs[0]);

    // Initial default pickup location in Bishkek (Ala-Too square)
    const defaultBishkek: TaxiLocation = {
      address: 'проспект Чуй, 114, Площадь Ала-Тоо, Первомайский район, Бишкек, 720040, Кыргызстан',
      point: { lat: 42.8765, lng: 74.6037 },
      displayName: 'проспект Чуй, 114, Площадь Ала-Тоо, Бишкек',
      street: 'проспект Чуй',
      houseNumber: '114',
      district: 'Первомайский район',
      city: 'Бишкек',
      postcode: '720040',
      country: 'Кыргызстан'
    };
    this.fromLocation.set(defaultBishkek);
  }

  setFrom(location: TaxiLocation): void {
    this.fromLocation.set(location);
    this.onLocationsChanged();
  }

  clearFrom(): void {
    this.fromLocation.set(null);
    this.availableRoutes.set([]);
    this.selectedRouteIndex.set(0);
    this.routeDebugInfo.set(null);
  }

  setTo(location: TaxiLocation): void {
    this.toLocation.set(location);
    this.onLocationsChanged();
  }

  clearTo(): void {
    this.toLocation.set(null);
    this.availableRoutes.set([]);
    this.selectedRouteIndex.set(0);
    this.routeDebugInfo.set(null);
  }

  swapLocations(): void {
    const currentFrom = this.fromLocation();
    const currentTo = this.toLocation();

    this.fromLocation.set(currentTo);
    this.toLocation.set(currentFrom);
    this.onLocationsChanged();
  }

  selectRoute(index: number): void {
    const routes = this.availableRoutes();
    if (index >= 0 && index < routes.length) {
      this.selectedRouteIndex.set(index);
      const activeRoute = routes[index];
      this.updateTariffsForRoute(activeRoute);
    }
  }

  selectTariff(tariff: TaxiTariff): void {
    this.selectedTariff.set(tariff);
  }

  setPaymentMethod(pm: PaymentMethod): void {
    this.paymentMethod.set(pm);
  }

  /**
   * Recalculates real driving road routes when both From and To points are specified
   */
  private onLocationsChanged(): void {
    if (this.routeCalculationSub) {
      this.routeCalculationSub.unsubscribe();
      this.routeCalculationSub = undefined;
    }

    const from = this.fromLocation();
    const to = this.toLocation();

    if (!from?.point || !to?.point) {
      this.availableRoutes.set([]);
      this.selectedRouteIndex.set(0);
      this.routeDebugInfo.set(null);
      this.routeError.set(null);
      this.isCalculatingRoute.set(false);
      return;
    }

    this.isCalculatingRoute.set(true);
    this.routeError.set(null);
    this.availableRoutes.set([]);
    this.selectedRouteIndex.set(0);

    this.routeCalculationSub = this.routing.calculateRoutes(from.point, to.point).subscribe({
      next: (result: RouteCalculationResult) => {
        this.availableRoutes.set(result.routes);
        this.selectedRouteIndex.set(result.selectedRouteIndex || 0);
        this.routeDebugInfo.set(result.debugInfo || null);

        if (result.routes.length > 0) {
          this.updateTariffsForRoute(result.routes[0]);
        }
        this.isCalculatingRoute.set(false);
      },
      error: err => {
        console.error('Route calculation error:', err);
        const errKey = err?.message && err.message.startsWith('TAXI.')
          ? err.message
          : 'TAXI.ERR_NO_ROAD_ROUTE';
        this.routeError.set(errKey);
        this.routeDebugInfo.set(null);
        this.isCalculatingRoute.set(false);
      }
    });
  }

  private updateTariffsForRoute(route: RouteInfo): void {
    const updatedTariffs = this.routing.calculateTariffs(route);
    this.tariffs.set(updatedTariffs);

    const currentSelectedId = this.selectedTariff()?.id || 'standard';
    const matching = updatedTariffs.find(t => t.id === currentSelectedId) || updatedTariffs[0];
    this.selectedTariff.set(matching);
  }

  /**
   * Start driver matching workflow
   */
  startDriverSearch(comment?: string): void {
    const from = this.fromLocation();
    const to = this.toLocation();
    const currentRoute = this.route();
    const tariff = this.selectedTariff();

    if (!from || !to || !currentRoute || !tariff) return;

    const orderNum = 'TX-' + Math.floor(100000 + Math.random() * 900000);
    const booking: TaxiBooking = {
      id: 'book-' + Date.now(),
      orderNumber: orderNum,
      from,
      to,
      route: currentRoute,
      tariff,
      paymentMethod: this.paymentMethod(),
      comment,
      status: 'searching',
      createdAt: new Date()
    };

    this.activeBooking.set(booking);
    this.bookingState.set('searching');

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (this.bookingState() === 'searching') {
        const driversList: TaxiDriverInfo[] = [
          {
            id: 'drv-1',
            name: 'Нурбек Асанбеков',
            phone: '+996 (555) 321-456',
            rating: 4.96,
            ridesCount: 1420,
            carModel: 'Toyota Camry XV70',
            carColor: 'Белый перламутр',
            plateNumber: '01KG 789 ABC',
            etaMinutes: 3,
            currentPoint: {
              lat: from.point!.lat + 0.003,
              lng: from.point!.lng - 0.003
            }
          },
          {
            id: 'drv-2',
            name: 'Бакыт Муратов',
            phone: '+996 (700) 412-889',
            rating: 4.92,
            ridesCount: 890,
            carModel: 'Hyundai Sonata',
            carColor: 'Серебристый металлик',
            plateNumber: '01KG 345 BCD',
            etaMinutes: 4,
            currentPoint: {
              lat: from.point!.lat - 0.002,
              lng: from.point!.lng + 0.004
            }
          }
        ];

        const assigned = driversList[Math.floor(Math.random() * driversList.length)];
        const updated = {
          ...booking,
          status: 'driver_assigned' as TaxiBookingStatus,
          driver: assigned
        };
        this.activeBooking.set(updated);
        this.bookingState.set('driver_assigned');
      }
    }, 3800);
  }

  cancelBooking(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    const current = this.activeBooking();
    if (current) {
      this.activeBooking.set({
        ...current,
        status: 'cancelled'
      });
    }
    this.bookingState.set('cancelled');
    setTimeout(() => {
      this.bookingState.set('draft');
      this.activeBooking.set(null);
    }, 600);
  }

  resetBooking(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.bookingState.set('draft');
    this.activeBooking.set(null);
  }
}
