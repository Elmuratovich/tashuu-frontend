import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaxiRoutingService } from './taxi-routing.service';
import { GeoPoint, RouteInfo } from '../models/taxi.model';

describe('TaxiRoutingService (2GIS)', () => {
  let service: TaxiRoutingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaxiRoutingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TaxiRoutingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate tariffs based on distance and duration', () => {
    const mockRoute: RouteInfo = {
      id: 'test-1',
      routeNumber: 1,
      color: '#2f6bff',
      drivingDistanceMeters: 5000,
      drivingDistanceKm: 5.0,
      drivingDurationSeconds: 600,
      drivingDurationMinutes: 10,
      distanceMeters: 5000,
      distanceKm: 5.0,
      durationSeconds: 600,
      durationMinutes: 10,
      totalDurationMinutes: 10,
      totalWalkingDistanceMeters: 0,
      totalWalkingDurationMinutes: 0,
      hasWalkingSegments: false,
      geometry: [[42.87, 74.60], [42.86, 74.59]],
      traversedStreets: ['ул. Киевская'],
      badgeType: 'recommended',
      badgeLabelKey: 'TAXI.ROUTE_RECOMMENDED',
      steps: []
    };

    const tariffs = service.calculateTariffs(mockRoute);
    expect(tariffs.length).toBe(5);

    // Standard: base 70 + 5km * 18 + 10min * 3 = 70 + 90 + 30 = 190 KGS
    const standard = tariffs.find(t => t.id === 'standard');
    expect(standard?.estimatedPrice).toBe(190);

    // Comfort: base 110 + 5km * 24 + 10min * 4 = 110 + 120 + 40 = 270 KGS
    const comfort = tariffs.find(t => t.id === 'comfort');
    expect(comfort?.estimatedPrice).toBe(270);
  });

  it('should calculate routes using 2GIS Car Routing 6.0 and detect native walking segments', fakeAsync(() => {
    const from: GeoPoint = { lat: 42.8765, lng: 74.6037 };
    const to: GeoPoint = { lat: 42.8553, lng: 74.5866 };

    let calculationResult: any = null;
    service.calculateRoutes(from, to).subscribe(result => {
      calculationResult = result;
    });

    tick();

    // 1. Flush fastest car routing request
    const req1 = httpMock.expectOne(r => r.url.includes('carrouting/6.0.0/global') && r.body.route_mode === 'fastest');
    expect(req1.request.method).toBe('POST');
    req1.flush({
      result: [
        {
          id: 'route-2gis-1',
          total_distance: 4129,
          total_duration: 1375,
          begin_pedestrian_path: {
            geometry: {
              selection: 'LINESTRING(74.603700 42.876500, 74.603686 42.875958)'
            }
          },
          end_pedestrian_path: {
            geometry: {
              selection: 'LINESTRING(74.586707 42.855296, 74.586599 42.855299)'
            }
          },
          waypoints: [
            { projected_point: { lat: 42.875958, lon: 74.603686 } },
            { projected_point: { lat: 42.855296, lon: 74.586707 } }
          ],
          maneuvers: [
            {
              type: 'begin',
              comment: 'start',
              outcoming_path: {
                distance: 68,
                duration: 13,
                names: ['проспект Чуй'],
                geometry: [
                  {
                    selection: 'LINESTRING(74.603686 42.875958, 74.602842 42.875969)'
                  }
                ]
              }
            },
            {
              type: 'crossroad',
              comment: 'Right turn',
              turn_direction: 'right',
              outcoming_path: {
                distance: 400,
                duration: 90,
                names: ['улица Боконбаева'],
                geometry: [
                  {
                    selection: 'LINESTRING(74.602842 42.875969, 74.602800 42.872000)'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    tick();

    // 2. Flush shortest car routing request
    const req2 = httpMock.expectOne(r => r.url.includes('carrouting/6.0.0/global') && r.body.route_mode === 'shortest');
    expect(req2.request.method).toBe('POST');
    req2.flush({ result: [] });

    tick();

    expect(calculationResult).toBeTruthy();
    expect(calculationResult.routes.length).toBeGreaterThan(0);
    const primary = calculationResult.routes[0];
    expect(primary.drivingDistanceMeters).toBe(4129);
    expect(primary.traversedStreets).toContain('проспект Чуй');
    expect(primary.steps.length).toBeGreaterThan(0);
    expect(primary.pickupWalking).toBeDefined();
    expect(primary.hasWalkingSegments).toBeTrue();
    expect(primary.vehiclePickupPoint).toBeDefined();
    expect(primary.color).toBe('#2f6bff');
  }));
});
