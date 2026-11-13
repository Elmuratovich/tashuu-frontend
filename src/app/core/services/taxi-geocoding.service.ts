import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, from as rxFrom, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GeoPoint, GeocodingSearchResult, TaxiLocation } from '../models/taxi.model';

@Injectable({
  providedIn: 'root'
})
export class TaxiGeocodingService {
  private http = inject(HttpClient);

  // Official 2GIS Catalog API endpoints
  private catalogApiBase = 'https://catalog.api.2gis.com/3.0';

  // In-memory cache to prevent redundant network calls and save API quota
  private searchCache = new Map<string, GeocodingSearchResult[]>();
  private reverseCache = new Map<string, TaxiLocation>();

  // Curated prominent Bishkek landmarks with confirmed 2GIS coordinates and complete details
  private popularLocations: GeocodingSearchResult[] = [
    {
      displayName: 'проспект Чуй, 114, Площадь Ала-Тоо, Первомайский район, Бишкек, 720040, Кыргызстан',
      addressShort: 'Площадь Ала-Тоо, проспект Чуй, 114, Бишкек',
      point: { lat: 42.8765, lng: 74.6037 },
      placeId: 'poi-ala-too',
      street: 'проспект Чуй',
      houseNumber: '114',
      district: 'Первомайский район',
      city: 'Бишкек',
      postcode: '720040',
      country: 'Кыргызстан'
    },
    {
      displayName: 'улица Киевская, 148, ТЦ Bishkek Park, Первомайский район, Бишкек, 720001, Кыргызстан',
      addressShort: 'ТЦ Bishkek Park, улица Киевская, 148, Бишкек',
      point: { lat: 42.8752, lng: 74.5904 },
      placeId: 'poi-bishkek-park',
      street: 'улица Киевская',
      houseNumber: '148',
      district: 'Первомайский район',
      city: 'Бишкек',
      postcode: '720001',
      country: 'Кыргызстан'
    },
    {
      displayName: 'проспект Чынгыза Айтматова, 3, ТЦ Asia Mall, Ленинский район, Бишкек, 720052, Кыргызстан',
      addressShort: 'ТЦ Asia Mall, проспект Чынгыза Айтматова, 3, Бишкек',
      point: { lat: 42.8553, lng: 74.5866 },
      placeId: 'poi-asia-mall',
      street: 'проспект Чынгыза Айтматова',
      houseNumber: '3',
      district: 'Ленинский район',
      city: 'Бишкек',
      postcode: '720052',
      country: 'Кыргызстан'
    },
    {
      displayName: 'Международный аэропорт Манас, Сокулукский район, Чуйская область, 722300, Кыргызстан',
      addressShort: 'Аэропорт Манас (FRU), Чуйская область',
      point: { lat: 43.0613, lng: 74.4776 },
      placeId: 'poi-manas-airport',
      street: 'трасса Аэропорт Манас',
      district: 'Сокулукский район',
      city: 'Бишкек',
      postcode: '722300',
      country: 'Кыргызстан'
    },
    {
      displayName: 'улица Кожобергенова, 1, Рынок Дордой, Свердловский район, Бишкек, 720038, Кыргызстан',
      addressShort: 'Рынок Дордой, улица Кожобергенова, Бишкек',
      point: { lat: 42.9264, lng: 74.6315 },
      placeId: 'poi-dordoi',
      street: 'улица Кожобергенова',
      district: 'Свердловский район',
      city: 'Бишкек',
      postcode: '720038',
      country: 'Кыргызстан'
    },
    {
      displayName: 'проспект Чуй, 259, Ошский рынок, Ленинский район, Бишкек, 720040, Кыргызстан',
      addressShort: 'Ошский рынок, проспект Чуй, 259, Бишкек',
      point: { lat: 42.8741, lng: 74.5682 },
      placeId: 'poi-osh-market',
      street: 'проспект Чуй',
      houseNumber: '259',
      district: 'Ленинский район',
      city: 'Бишкек',
      postcode: '720040',
      country: 'Кыргызстан'
    },
    {
      displayName: 'проспект Жибек Жолу, 263, Западный автовокзал, Первомайский район, Бишкек, 720033, Кыргызстан',
      addressShort: 'Западный автовокзал, проспект Жибек Жолу, 263, Бишкек',
      point: { lat: 42.8845, lng: 74.5621 },
      placeId: 'poi-west-bus-station',
      street: 'проспект Жибек Жолу',
      houseNumber: '263',
      district: 'Первомайский район',
      city: 'Бишкек',
      postcode: '720033',
      country: 'Кыргызстан'
    },
    {
      displayName: 'улица Ибраимова, 115, ТЦ Дордой Плаза, Свердловский район, Бишкек, 720021, Кыргызстан',
      addressShort: 'ТЦ Дордой Плаза, улица Ибраимова, 115, Бишкек',
      point: { lat: 42.8753, lng: 74.6186 },
      placeId: 'poi-dordoi-plaza',
      street: 'улица Ибраимова',
      houseNumber: '115',
      district: 'Свердловский район',
      city: 'Бишкек',
      postcode: '720021',
      country: 'Кыргызстан'
    }
  ];

  /**
   * Search for address suggestions matching user query using 2GIS Suggest & Geocoder APIs.
   * Supports street names, house/building numbers, organizations, and landmarks in Bishkek.
   */
  searchAddresses(query: string): Observable<GeocodingSearchResult[]> {
    const trimmed = query?.trim().toLowerCase() || '';
    if (!trimmed || trimmed.length < 2) {
      return of([]);
    }

    if (this.searchCache.has(trimmed)) {
      return of(this.searchCache.get(trimmed)!);
    }

    return rxFrom(this.searchAddressesInternal(trimmed)).pipe(
      catchError(err => {
        console.warn('2GIS address search error, returning local landmark matches:', err);
        const local = this.popularLocations.filter(loc =>
          loc.displayName.toLowerCase().includes(trimmed) ||
          loc.addressShort.toLowerCase().includes(trimmed)
        );
        return of(local);
      })
    );
  }

  private async searchAddressesInternal(trimmedQuery: string): Promise<GeocodingSearchResult[]> {
    const key = environment.twoGisApiKey;

    // Filter popular local landmarks first
    const localMatches = this.popularLocations.filter(loc =>
      loc.displayName.toLowerCase().includes(trimmedQuery) ||
      loc.addressShort.toLowerCase().includes(trimmedQuery)
    );

    // Call 2GIS Suggests API with Bishkek location bias (74.6037, 42.8765)
    const suggestParams = new HttpParams()
      .set('q', trimmedQuery)
      .set('location', '74.6037,42.8765')
      .set('key', key)
      .set('fields', 'items.point,items.address_name,items.full_name,items.type,items.adm_div');

    let suggestItems: any[] = [];
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${this.catalogApiBase}/suggests`, { params: suggestParams })
      );
      if (res && res.result && Array.isArray(res.result.items)) {
        suggestItems = res.result.items;
      }
    } catch (e) {
      console.warn('2GIS Suggests request failed:', e);
    }

    // Call 2GIS Items/Geocode API to find exact building / street / place coordinates
    const geocodeParams = new HttpParams()
      .set('q', trimmedQuery.includes('бишкек') ? trimmedQuery : `Бишкек, ${trimmedQuery}`)
      .set('key', key)
      .set('fields', 'items.point,items.address,items.full_name,items.adm_div');

    let geocodeItems: any[] = [];
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${this.catalogApiBase}/items/geocode`, { params: geocodeParams })
      );
      if (res && res.result && Array.isArray(res.result.items)) {
        geocodeItems = res.result.items;
      }
    } catch (e) {
      // Safe fallback
    }

    // Also query 2GIS Items API for places/organizations (e.g. "Asia Mall", "Bishkek Park")
    let poiItems: any[] = [];
    try {
      const poiParams = new HttpParams()
        .set('q', trimmedQuery)
        .set('location', '74.6037,42.8765')
        .set('key', key)
        .set('fields', 'items.point,items.address_name,items.full_name,items.adm_div');

      const res = await firstValueFrom(
        this.http.get<any>(`${this.catalogApiBase}/items`, { params: poiParams })
      );
      if (res && res.result && Array.isArray(res.result.items)) {
        poiItems = res.result.items;
      }
    } catch (e) {
      // Safe fallback
    }

    const results: GeocodingSearchResult[] = [];

    // 1. Process 2GIS geocoded buildings and streets (highest accuracy for addresses)
    for (const item of geocodeItems) {
      if (!item.point) continue;
      const point: GeoPoint = { lat: item.point.lat, lng: item.point.lon };

      const addressComponents = item.address?.components || [];
      const streetComp = addressComponents.find((c: any) => c.street || c.type === 'street_number');
      const street = streetComp?.street || item.name || item.address_name || '';
      const houseNumber = streetComp?.number || item.address?.building_name || '';

      const admDiv = item.adm_div || [];
      const district = admDiv.find((d: any) => d.type === 'district')?.name;
      const city = admDiv.find((d: any) => d.type === 'city')?.name || 'Бишкек';
      const postcode = item.address?.postcode;

      const shortName = item.name || item.address_name || (houseNumber ? `${street}, ${houseNumber}` : street);
      const fullName = item.full_name || `${city}, ${shortName}`;

      results.push({
        displayName: fullName,
        addressShort: shortName,
        point,
        placeId: item.id || `geo-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`,
        type: item.type,
        street,
        houseNumber: houseNumber || undefined,
        district,
        city,
        postcode,
        country: 'Кыргызстан'
      });
    }

    // 2. Process 2GIS POIs/organizations
    for (const item of poiItems) {
      if (!item.point) continue;
      const point: GeoPoint = { lat: item.point.lat, lng: item.point.lon };

      const shortName = item.name || item.address_name || 'Организация';
      const fullName = item.full_name || `${shortName}, Бишкек`;

      results.push({
        displayName: fullName,
        addressShort: shortName,
        point,
        placeId: item.id || `poi-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`,
        type: 'poi',
        city: 'Бишкек',
        country: 'Кыргызстан'
      });
    }

    // 3. Process 2GIS Suggest items that have coordinates
    for (const item of suggestItems) {
      if (!item.point) continue;
      const point: GeoPoint = { lat: item.point.lat, lng: item.point.lon };

      const shortName = item.name || item.address_name || item.full_name;
      const fullName = item.full_name || `${shortName}, Бишкек`;

      results.push({
        displayName: fullName,
        addressShort: shortName,
        point,
        placeId: item.id || `sug-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`,
        type: item.type,
        city: 'Бишкек',
        country: 'Кыргызстан'
      });
    }

    // Deduplicate against local matches and among results
    const combined = [...localMatches];
    for (const res of results) {
      const isDuplicate = combined.some(
        c => Math.abs(c.point.lat - res.point.lat) < 0.0006 &&
             Math.abs(c.point.lng - res.point.lng) < 0.0006
      );
      if (!isDuplicate) {
        combined.push(res);
      }
    }

    const finalResults = combined.slice(0, 8);
    this.searchCache.set(trimmedQuery, finalResults);
    return finalResults;
  }

  /**
   * Reverse geocodes a latitude and longitude into an authentic 2GIS formatted address.
   * Returns street name, building number, district, city, postcode, and country.
   * NEVER invents missing house numbers or street names.
   */
  reverseGeocode(point: GeoPoint): Observable<TaxiLocation> {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    if (this.reverseCache.has(key)) {
      return of(this.reverseCache.get(key)!);
    }

    const params = new HttpParams()
      .set('lat', point.lat.toString())
      .set('lon', point.lng.toString())
      .set('key', environment.twoGisApiKey)
      .set('fields', 'items.point,items.address,items.full_address_name,items.full_name,items.adm_div');

    return this.http.get<any>(`${this.catalogApiBase}/items/geocode`, { params }).pipe(
      map(res => {
        const items: any[] = res?.result?.items || [];
        if (items.length === 0) {
          throw new Error('NO_2GIS_REVERSE_RESULT');
        }

        // Prioritize building results (which contain exact house numbers) over street or district
        const buildingItem = items.find(it => it.type === 'building' && it.address);
        const streetItem = items.find(it => it.type === 'street');
        const bestItem = buildingItem || streetItem || items[0];

        let street: string | undefined = undefined;
        let houseNumber: string | undefined = undefined;
        let district: string | undefined = undefined;
        let city: string | undefined = 'Бишкек';
        let postcode: string | undefined = undefined;
        let country: string | undefined = 'Кыргызстан';

        if (bestItem.address?.components) {
          const comp = bestItem.address.components[0];
          if (comp) {
            street = comp.street;
            houseNumber = comp.number;
          }
        }

        if (!street && bestItem.type === 'street') {
          street = bestItem.name;
        }

        if (bestItem.address?.postcode) {
          postcode = bestItem.address.postcode;
        }

        if (bestItem.adm_div) {
          const distDiv = bestItem.adm_div.find((d: any) => d.type === 'district');
          if (distDiv) district = distDiv.name;

          const cityDiv = bestItem.adm_div.find((d: any) => d.type === 'city');
          if (cityDiv) city = cityDiv.name;

          const countryDiv = bestItem.adm_div.find((d: any) => d.type === 'country');
          if (countryDiv) country = countryDiv.name;
        }

        // Build authentic formatted address without inventing missing data
        let formattedAddress = bestItem.full_name || bestItem.address_name || bestItem.name || '';
        if (!formattedAddress) {
          const parts: string[] = [];
          if (street) {
            parts.push(houseNumber ? `${street}, ${houseNumber}` : street);
          }
          if (district) parts.push(district);
          if (city) parts.push(city);
          parts.push(country || 'Кыргызстан');
          formattedAddress = parts.join(', ');
        }

        const location: TaxiLocation = {
          address: formattedAddress,
          displayName: formattedAddress,
          point: { lat: point.lat, lng: point.lng },
          placeId: bestItem.id || `2gis-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`,
          street,
          houseNumber,
          district,
          city,
          postcode,
          country
        };

        this.reverseCache.set(key, location);
        return location;
      }),
      catchError(err => {
        console.warn('2GIS reverse geocode failed, returning coordinate fallback:', err);
        const fallback: TaxiLocation = {
          address: `Бишкек (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`,
          displayName: `Бишкек (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`,
          point: { lat: point.lat, lng: point.lng },
          city: 'Бишкек',
          country: 'Кыргызстан'
        };
        return of(fallback);
      })
    );
  }

  /**
   * Resolves the user's current GPS location via Geolocation API, reverse geocoding via 2GIS.
   */
  private getFallbackLocation(): TaxiLocation {
    const p = this.popularLocations[0];
    return {
      address: p.displayName,
      displayName: p.displayName,
      point: p.point,
      street: p.street,
      houseNumber: p.houseNumber,
      district: p.district,
      city: p.city,
      postcode: p.postcode,
      country: p.country
    };
  }

  getCurrentLocation(): Observable<TaxiLocation> {
    return new Observable<TaxiLocation>(observer => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        observer.next(this.getFallbackLocation());
        observer.complete();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          const pt: GeoPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          this.reverseGeocode(pt).subscribe({
            next: loc => {
              observer.next(loc);
              observer.complete();
            },
            error: () => {
              observer.next({
                address: `Бишкек (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`,
                point: pt,
                city: 'Бишкек',
                country: 'Кыргызстан'
              });
              observer.complete();
            }
          });
        },
        () => {
          observer.next(this.getFallbackLocation());
          observer.complete();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  }
}
