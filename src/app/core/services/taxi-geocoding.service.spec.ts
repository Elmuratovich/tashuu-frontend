import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaxiGeocodingService } from './taxi-geocoding.service';
import { GeoPoint } from '../models/taxi.model';

describe('TaxiGeocodingService (2GIS)', () => {
  let service: TaxiGeocodingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaxiGeocodingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TaxiGeocodingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty list for queries shorter than 2 characters', (done) => {
    service.searchAddresses('a').subscribe(results => {
      expect(results).toEqual([]);
      done();
    });
  });

  it('should reverse geocode coordinates using 2GIS Geocode API without inventing house numbers', (done) => {
    const point: GeoPoint = { lat: 42.868, lng: 74.6 };

    service.reverseGeocode(point).subscribe(loc => {
      expect(loc.street).toBe('улица Панфилова');
      expect(loc.houseNumber).toBe('146');
      expect(loc.city).toBe('Бишкек');
      expect(loc.district).toBe('Первомайский район');
      expect(loc.point?.lat).toBe(42.868);
      expect(loc.point?.lng).toBe(74.6);
      done();
    });

    const req = httpMock.expectOne(r => r.url.includes('catalog.api.2gis.com/3.0/items/geocode'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('lat')).toBe('42.868');
    expect(req.request.params.get('lon')).toBe('74.6');

    req.flush({
      result: {
        items: [
          {
            type: 'building',
            name: 'улица Панфилова, 146',
            full_name: 'Бишкек, улица Панфилова, 146',
            address: {
              building_id: '15763234351158159',
              components: [
                {
                  number: '146',
                  street: 'улица Панфилова',
                  type: 'street_number'
                }
              ],
              postcode: '720017'
            },
            adm_div: [
              { type: 'district', name: 'Первомайский район' },
              { type: 'city', name: 'Бишкек' },
              { type: 'country', name: 'Кыргызстан' }
            ]
          }
        ]
      }
    });
  });

  it('should cache reverse geocoding results to avoid redundant API calls', (done) => {
    const point: GeoPoint = { lat: 42.875, lng: 74.59 };

    service.reverseGeocode(point).subscribe(() => {
      // Second call for exact same point should return from cache without HTTP request
      service.reverseGeocode(point).subscribe(cachedLoc => {
        expect(cachedLoc.street).toBe('Киевская улица');
        done();
      });
    });

    const req = httpMock.expectOne(r => r.url.includes('catalog.api.2gis.com/3.0/items/geocode'));
    req.flush({
      result: {
        items: [
          {
            type: 'street',
            name: 'Киевская улица',
            full_name: 'Бишкек, Киевская улица',
            adm_div: [{ type: 'city', name: 'Бишкек' }]
          }
        ]
      }
    });
  });
});

