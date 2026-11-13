import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from as rxFrom, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GeoPoint,
  RouteCalculationResult,
  RouteDebugInfo,
  RouteInfo,
  RouteStep,
  TaxiTariff,
  WalkingSegment
} from '../models/taxi.model';

@Injectable({
  providedIn: 'root'
})
export class TaxiRoutingService {
  private http = inject(HttpClient);

  // Official 2GIS Car Routing 6.0 API endpoint
  private readonly twoGisRoutingUrl = 'https://routing.api.2gis.com/carrouting/6.0.0/global';

  // Curated distinguishable route palette:
  // Route 1 (Primary / Selected): Royal Blue
  // Route 2: Emerald Green; Route 3: Amber Orange; Route 4: Violet Purple
  readonly routeColors = ['#2f6bff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Distance threshold in meters: if walking distance to road is >= 25m, display walking segment
  private readonly WALKING_THRESHOLD_METERS = 25;

  /**
   * Available vehicle tariffs in Tashuu Taxi
   */
  readonly defaultTariffs: Omit<TaxiTariff, 'estimatedPrice'>[] = [
    {
      id: 'standard',
      nameKey: 'TAXI.TARIFF_STANDARD',
      descriptionKey: 'TAXI.TARIFF_STANDARD_DESC',
      icon: 'car',
      basePrice: 70,
      pricePerKm: 18,
      pricePerMinute: 3,
      capacity: '4 места',
      etaMinutes: 3
    },
    {
      id: 'comfort',
      nameKey: 'TAXI.TARIFF_COMFORT',
      descriptionKey: 'TAXI.TARIFF_COMFORT_DESC',
      icon: 'car-front',
      basePrice: 110,
      pricePerKm: 24,
      pricePerMinute: 4,
      capacity: '4 места, климат-контроль',
      etaMinutes: 5
    },
    {
      id: 'comfort_plus',
      nameKey: 'TAXI.TARIFF_COMFORT_PLUS',
      descriptionKey: 'TAXI.TARIFF_COMFORT_PLUS_DESC',
      icon: 'sparkles',
      basePrice: 160,
      pricePerKm: 32,
      pricePerMinute: 5,
      capacity: 'Просторный салон, вода',
      etaMinutes: 6
    },
    {
      id: 'business',
      nameKey: 'TAXI.TARIFF_BUSINESS',
      descriptionKey: 'TAXI.TARIFF_BUSINESS_DESC',
      icon: 'briefcase',
      basePrice: 280,
      pricePerKm: 48,
      pricePerMinute: 8,
      capacity: 'Премиум седаны, строгий дресс-код',
      etaMinutes: 8
    },
    {
      id: 'cargo',
      nameKey: 'TAXI.TARIFF_CARGO',
      descriptionKey: 'TAXI.TARIFF_CARGO_DESC',
      icon: 'truck',
      basePrice: 380,
      pricePerKm: 42,
      pricePerMinute: 6,
      capacity: 'До 1.5 тонн, помощь с погрузкой',
      etaMinutes: 12
    }
  ];

  /**
   * Calculates actual road network driving routes and authentic alternatives using 2GIS Car Routing 6.0.
   * Handles vehicle accessibility, walking segments in courtyards or pedestrian plazas,
   * street names, turn-by-turn maneuvers, and speed optimization.
   */
  calculateRoutes(from: GeoPoint, to: GeoPoint): Observable<RouteCalculationResult> {
    return rxFrom(this.calculateRoutesInternal(from, to));
  }

  private async calculateRoutesInternal(from: GeoPoint, to: GeoPoint): Promise<RouteCalculationResult> {
    const startTime = performance.now();
    const key = environment.twoGisApiKey;

    if (!key) {
      throw new Error('TAXI.ERR_NO_API_KEY');
    }

    // 1. Query 2GIS Car Routing API with route_mode = fastest and alternatives = 3
    // Passing type: "walking" lets 2GIS calculate real road accessibility and pedestrian paths
    const fastestPayload = {
      points: [
        { type: 'walking', x: from.lng, y: from.lat },
        { type: 'walking', x: to.lng, y: to.lat }
      ],
      type: 'jam',
      output: 'detailed',
      route_mode: 'fastest',
      alternatives: 3
    };

    let rawRoutes: any[] = [];
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${this.twoGisRoutingUrl}?key=${key}`, fastestPayload)
      );
      if (res && res.result && Array.isArray(res.result)) {
        rawRoutes = res.result;
      }
    } catch (err: any) {
      console.error('2GIS Fastest Car Routing API error:', err);
      // If error occurred with walking points, fallback to stop points
      try {
        const fallbackPayload = {
          points: [
            { type: 'stop', x: from.lng, y: from.lat },
            { type: 'stop', x: to.lng, y: to.lat }
          ],
          type: 'jam',
          output: 'detailed',
          route_mode: 'fastest',
          alternatives: 2
        };
        const fallbackRes = await firstValueFrom(
          this.http.post<any>(`${this.twoGisRoutingUrl}?key=${key}`, fallbackPayload)
        );
        if (fallbackRes && fallbackRes.result && Array.isArray(fallbackRes.result)) {
          rawRoutes = fallbackRes.result;
        }
      } catch (fallbackErr) {
        throw new Error('TAXI.ERR_NO_ROAD_ROUTE');
      }
    }

    // 2. Query 2GIS Car Routing API with route_mode = shortest to offer shortest route
    try {
      const shortestPayload = {
        points: [
          { type: 'walking', x: from.lng, y: from.lat },
          { type: 'walking', x: to.lng, y: to.lat }
        ],
        type: 'jam',
        output: 'detailed',
        route_mode: 'shortest',
        alternatives: 1
      };
      const shortestRes = await firstValueFrom(
        this.http.post<any>(`${this.twoGisRoutingUrl}?key=${key}`, shortestPayload)
      );
      if (shortestRes && shortestRes.result && Array.isArray(shortestRes.result)) {
        for (const sRoute of shortestRes.result) {
          const isAlreadyPresent = rawRoutes.some(
            r => Math.abs(r.total_distance - sRoute.total_distance) < 40 &&
                 Math.abs(r.total_duration - sRoute.total_duration) < 40
          );
          if (!isAlreadyPresent) {
            rawRoutes.push(sRoute);
          }
        }
      }
    } catch {
      // Safe ignore if shortest mode doesn't return distinct results
    }

    if (rawRoutes.length === 0) {
      throw new Error('TAXI.ERR_NO_ROAD_ROUTE');
    }

    // 3. Process and convert 2GIS routes into normalized RouteInfo objects
    const minDuration = Math.min(...rawRoutes.map(r => r.total_duration || 0));
    const minDistance = Math.min(...rawRoutes.map(r => r.total_distance || 0));

    const routes: RouteInfo[] = rawRoutes.map((raw, index) => {
      return this.parse2GisRoute(raw, index, from, to, minDuration, minDistance, rawRoutes);
    });

    // Sort: Primary / Recommended route first, followed by shortest, then other alternatives
    routes.sort((a, b) => {
      if (a.isPrimary) return -1;
      if (b.isPrimary) return 1;
      if (a.badgeType === 'fastest') return -1;
      if (b.badgeType === 'fastest') return 1;
      if (a.badgeType === 'shortest') return -1;
      if (b.badgeType === 'shortest') return 1;
      return a.drivingDurationSeconds - b.drivingDurationSeconds;
    });

    // Re-assign distinct colors and route numbers in order
    routes.forEach((r, idx) => {
      r.routeNumber = idx + 1;
      r.id = `route-${idx}`;
      r.color = this.routeColors[idx % this.routeColors.length];
      r.isPrimary = idx === 0;
    });

    const calcTime = Math.round(performance.now() - startTime);

    const primary = routes[0];
    const shortestRoute = routes.find(r => r.badgeType === 'shortest') || routes[0];

    const debugInfo: RouteDebugInfo = {
      provider: '2GIS Maps & Car Routing 6.0',
      profile: 'car_jam_detailed',
      requestedFrom: from,
      requestedTo: to,
      snappedFrom: primary.vehiclePickupPoint || from,
      snappedTo: primary.vehicleDropoffPoint || to,
      distanceFromRoadMetersA: primary.pickupWalking?.distanceMeters || 0,
      distanceFromRoadMetersB: primary.dropoffWalking?.distanceMeters || 0,
      routesCount: routes.length,
      calculationDurationMs: calcTime,
      comparison: {
        fastestDistanceKm: primary.drivingDistanceKm,
        fastestDurationMin: primary.drivingDurationMinutes,
        shortestDistanceKm: shortestRoute.drivingDistanceKm,
        shortestDurationMin: shortestRoute.drivingDurationMinutes,
        savedDistanceMeters: Math.max(0, primary.drivingDistanceMeters - shortestRoute.drivingDistanceMeters)
      }
    };

    return {
      routes,
      selectedRouteIndex: 0,
      debugInfo
    };
  }

  /**
   * Converts a raw 2GIS Car Routing response object into our normalized RouteInfo model.
   */
  private parse2GisRoute(
    rawRoute: any,
    index: number,
    requestFrom: GeoPoint,
    requestTo: GeoPoint,
    minDuration: number,
    minDistance: number,
    allRoutes: any[]
  ): RouteInfo {
    const drivingDistanceMeters = Math.round(rawRoute.total_distance || 0);
    const drivingDistanceKm = Math.round((drivingDistanceMeters / 1000) * 10) / 10;
    const drivingDurationSeconds = Math.round(rawRoute.total_duration || 0);
    const drivingDurationMinutes = Math.max(1, Math.round(drivingDurationSeconds / 60));

    // 1. Parse Turn-by-Turn Steps and Traversed Streets from 2GIS Maneuvers
    const maneuvers: any[] = rawRoute.maneuvers || [];
    const steps: RouteStep[] = [];
    const traversedStreets: string[] = [];
    const drivingGeometry: [number, number][] = [];

    for (const m of maneuvers) {
      const outPath = m.outcoming_path || {};
      const stepDist = Math.round(outPath.distance || 0);
      const stepDur = Math.round(outPath.duration || 0);

      // Collect street names
      const streetNames: string[] = outPath.names || [];
      const streetName = streetNames.length > 0 ? streetNames[0].trim() : '';

      for (const name of streetNames) {
        const clean = name.trim();
        if (clean && !traversedStreets.includes(clean)) {
          traversedStreets.push(clean);
        }
      }

      // Format human-friendly instruction
      const instruction = this.format2GisManeuverInstruction(m, streetName, stepDist);

      steps.push({
        instruction,
        streetName,
        distanceMeters: stepDist,
        durationSeconds: stepDur,
        maneuverType: m.type || 'turn',
        maneuverModifier: m.turn_direction
      });

      // Assemble full driving geometry from outcoming_path geometry segments
      const geomSegments: any[] = outPath.geometry || [];
      for (const seg of geomSegments) {
        if (seg.selection) {
          const pts = this.parseLineString(seg.selection);
          for (const pt of pts) {
            // Avoid duplicate consecutive coordinates
            const last = drivingGeometry[drivingGeometry.length - 1];
            if (!last || Math.abs(last[0] - pt[0]) > 0.00001 || Math.abs(last[1] - pt[1]) > 0.00001) {
              drivingGeometry.push(pt);
            }
          }
        }
      }
    }

    // 2. Parse Walking Segments & Vehicle Stop Points (Native in 2GIS)
    let pickupWalking: WalkingSegment | undefined = undefined;
    let vehiclePickupPoint: GeoPoint | undefined = undefined;

    const beginPedLine = rawRoute.begin_pedestrian_path?.geometry?.selection;
    if (beginPedLine) {
      const walkPts = this.parseLineString(beginPedLine);
      if (walkPts.length >= 2) {
        const walkDist = this.computePolylineDistance(walkPts);
        if (walkDist >= this.WALKING_THRESHOLD_METERS) {
          const walkSec = Math.round(walkDist / 1.25); // 4.5 km/h walking speed
          const walkMin = Math.max(1, Math.round(walkSec / 60));
          const startPt: GeoPoint = { lat: walkPts[0][0], lng: walkPts[0][1] };
          const endPt: GeoPoint = { lat: walkPts[walkPts.length - 1][0], lng: walkPts[walkPts.length - 1][1] };

          pickupWalking = {
            geometry: walkPts,
            distanceMeters: Math.round(walkDist),
            durationSeconds: walkSec,
            durationMinutes: walkMin,
            startPoint: startPt,
            endPoint: endPt,
            instructionLabel: 'Пешком до точки подачи автомобиля'
          };
          vehiclePickupPoint = endPt;
        }
      }
    }

    // If projected point from waypoint is provided
    if (!vehiclePickupPoint && rawRoute.waypoints?.[0]?.projected_point) {
      const wp = rawRoute.waypoints[0].projected_point;
      const distFromStart = this.haversineDistance(requestFrom.lat, requestFrom.lng, wp.lat, wp.lon);
      if (distFromStart >= this.WALKING_THRESHOLD_METERS) {
        vehiclePickupPoint = { lat: wp.lat, lng: wp.lon };
        if (!pickupWalking) {
          const walkSec = Math.round(distFromStart / 1.25);
          pickupWalking = {
            geometry: [[requestFrom.lat, requestFrom.lng], [wp.lat, wp.lon]],
            distanceMeters: Math.round(distFromStart),
            durationSeconds: walkSec,
            durationMinutes: Math.max(1, Math.round(walkSec / 60)),
            startPoint: requestFrom,
            endPoint: vehiclePickupPoint,
            instructionLabel: 'Пешком до автомобиля'
          };
        }
      }
    }

    let dropoffWalking: WalkingSegment | undefined = undefined;
    let vehicleDropoffPoint: GeoPoint | undefined = undefined;

    const endPedLine = rawRoute.end_pedestrian_path?.geometry?.selection;
    if (endPedLine) {
      const walkPts = this.parseLineString(endPedLine);
      if (walkPts.length >= 2) {
        const walkDist = this.computePolylineDistance(walkPts);
        if (walkDist >= this.WALKING_THRESHOLD_METERS) {
          const walkSec = Math.round(walkDist / 1.25);
          const walkMin = Math.max(1, Math.round(walkSec / 60));
          const startPt: GeoPoint = { lat: walkPts[0][0], lng: walkPts[0][1] };
          const endPt: GeoPoint = { lat: walkPts[walkPts.length - 1][0], lng: walkPts[walkPts.length - 1][1] };

          dropoffWalking = {
            geometry: walkPts,
            distanceMeters: Math.round(walkDist),
            durationSeconds: walkSec,
            durationMinutes: walkMin,
            startPoint: startPt,
            endPoint: endPt,
            instructionLabel: 'Пешком от автомобиля к месту назначения'
          };
          vehicleDropoffPoint = startPt;
        }
      }
    }

    if (!vehicleDropoffPoint && rawRoute.waypoints?.[1]?.projected_point) {
      const wp = rawRoute.waypoints[1].projected_point;
      const distFromEnd = this.haversineDistance(requestTo.lat, requestTo.lng, wp.lat, wp.lon);
      if (distFromEnd >= this.WALKING_THRESHOLD_METERS) {
        vehicleDropoffPoint = { lat: wp.lat, lng: wp.lon };
        if (!dropoffWalking) {
          const walkSec = Math.round(distFromEnd / 1.25);
          dropoffWalking = {
            geometry: [[wp.lat, wp.lon], [requestTo.lat, requestTo.lng]],
            distanceMeters: Math.round(distFromEnd),
            durationSeconds: walkSec,
            durationMinutes: Math.max(1, Math.round(walkSec / 60)),
            startPoint: vehicleDropoffPoint,
            endPoint: requestTo,
            instructionLabel: 'Пешком к месту назначения'
          };
        }
      }
    }

    const totalWalkingDistance = (pickupWalking?.distanceMeters || 0) + (dropoffWalking?.distanceMeters || 0);
    const totalWalkingMinutes = (pickupWalking?.durationMinutes || 0) + (dropoffWalking?.durationMinutes || 0);
    const hasWalking = !!(pickupWalking || dropoffWalking);
    const totalDurationMinutes = drivingDurationMinutes + totalWalkingMinutes;

    let accessNotice: string | undefined = undefined;
    if (pickupWalking && dropoffWalking) {
      accessNotice = `Пешком ${pickupWalking.durationMinutes} мин (${pickupWalking.distanceMeters} м) до авто и ${dropoffWalking.durationMinutes} мин (${dropoffWalking.distanceMeters} м) от авто`;
    } else if (pickupWalking) {
      accessNotice = `Посадка у дороги: пешком ${pickupWalking.durationMinutes} мин (${pickupWalking.distanceMeters} м) от точки подачи`;
    } else if (dropoffWalking) {
      accessNotice = `Высадка у дороги: пешком ${dropoffWalking.durationMinutes} мин (${dropoffWalking.distanceMeters} м) к месту назначения`;
    }

    // 3. Determine Route Badges & Comparative Summary
    let badgeType: 'recommended' | 'fastest' | 'shortest' | 'alternative' | 'walking_access' = 'alternative';
    let badgeLabelKey = 'TAXI.ROUTE_ALTERNATIVE';
    let differenceText: string | undefined = undefined;

    const isFastest = drivingDurationSeconds <= minDuration + 20;
    const isShortest = drivingDistanceMeters <= minDistance + 40;

    if (allRoutes.length === 1) {
      badgeType = hasWalking ? 'walking_access' : 'recommended';
      badgeLabelKey = hasWalking ? 'TAXI.ROUTE_WALKING_ACCESS' : 'TAXI.ROUTE_OPTIMAL';
    } else if (index === 0) {
      badgeType = 'recommended';
      badgeLabelKey = 'TAXI.ROUTE_RECOMMENDED';
      differenceText = isFastest ? 'Самый быстрый' : 'Оптимальный маршрут';
    } else if (isShortest && drivingDistanceMeters < allRoutes[0].total_distance - 150) {
      badgeType = 'shortest';
      badgeLabelKey = 'TAXI.ROUTE_SHORTEST';
      const diffKm = Math.round(((drivingDistanceMeters - allRoutes[0].total_distance) / 1000) * 10) / 10;
      const diffMin = drivingDurationMinutes - Math.round(allRoutes[0].total_duration / 60);
      differenceText = `${diffKm} км${diffMin > 0 ? ` • +${diffMin} мин` : ''}`;
    } else if (isFastest) {
      badgeType = 'fastest';
      badgeLabelKey = 'TAXI.FASTEST_ROUTE';
      differenceText = 'Самый быстрый';
    } else {
      badgeType = 'alternative';
      badgeLabelKey = 'TAXI.ROUTE_ALTERNATIVE';
      const diffKm = Math.round(((drivingDistanceMeters - allRoutes[0].total_distance) / 1000) * 10) / 10;
      const diffMin = drivingDurationMinutes - Math.round(allRoutes[0].total_duration / 60);
      const parts: string[] = [];
      if (diffKm !== 0) parts.push(`${diffKm > 0 ? '+' : ''}${diffKm} км`);
      if (diffMin !== 0) parts.push(`${diffMin > 0 ? '+' : ''}${diffMin} мин`);
      differenceText = parts.length > 0 ? parts.join(' • ') : undefined;
    }

    const viaRoads = traversedStreets.length > 0
      ? traversedStreets.slice(0, 3).join(' → ')
      : undefined;

    return {
      id: `route-${index}`,
      routeNumber: index + 1,
      color: this.routeColors[index % this.routeColors.length],

      drivingDistanceMeters,
      drivingDistanceKm,
      drivingDurationSeconds,
      drivingDurationMinutes,

      distanceMeters: drivingDistanceMeters,
      distanceKm: drivingDistanceKm,
      durationSeconds: drivingDurationSeconds,
      durationMinutes: drivingDurationMinutes,

      totalDurationMinutes,
      totalWalkingDistanceMeters: totalWalkingDistance,
      totalWalkingDurationMinutes: totalWalkingMinutes,
      hasWalkingSegments: hasWalking,
      pickupWalking,
      dropoffWalking,
      vehiclePickupPoint,
      vehicleDropoffPoint,
      accessNotice,

      geometry: drivingGeometry.length >= 2 ? drivingGeometry : [[requestFrom.lat, requestFrom.lng], [requestTo.lat, requestTo.lng]],
      summary: `${drivingDistanceKm} км • ${drivingDurationMinutes} мин`,
      viaRoads,
      traversedStreets,
      isPrimary: index === 0,
      badgeType,
      badgeLabelKey,
      differenceText,
      steps,
      provider: '2GIS'
    };
  }

  /**
   * Parses 2GIS WKT-like LINESTRING geometry string into [[lat, lng], [lat, lng], ...]
   */
  private parseLineString(lineString: string): [number, number][] {
    if (!lineString || typeof lineString !== 'string') return [];
    const start = lineString.indexOf('(');
    const end = lineString.lastIndexOf(')');
    if (start === -1 || end === -1) return [];

    const coordsStr = lineString.substring(start + 1, end).trim();
    const pairs = coordsStr.split(',');
    const points: [number, number][] = [];

    for (const p of pairs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const [lonStr, latStr] = trimmed.split(/\s+/);
      const lon = parseFloat(lonStr);
      const lat = parseFloat(latStr);
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push([lat, lon]);
      }
    }

    return points;
  }

  /**
   * Computes total distance of a coordinate sequence in meters
   */
  private computePolylineDistance(pts: [number, number][]): number {
    let dist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      dist += this.haversineDistance(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    }
    return dist;
  }

  /**
   * Formats a 2GIS maneuver into a clear Russian direction instruction
   */
  private format2GisManeuverInstruction(maneuver: any, street: string, distMeters: number): string {
    const distText = distMeters >= 1000
      ? `${(distMeters / 1000).toFixed(1)} км`
      : `${distMeters} м`;

    const streetText = street ? ` на ${street}` : '';
    const dir = maneuver.turn_direction;
    const type = maneuver.type;

    if (type === 'begin' || maneuver.comment?.toLowerCase() === 'start') {
      return street ? `Начните движение по ${street} (${distText})` : `Начните движение (${distText})`;
    }
    if (type === 'end' || maneuver.comment?.toLowerCase() === 'finish') {
      return 'Прибытие в пункт назначения';
    }

    switch (dir) {
      case 'right':
        return `Поверните направо${streetText} (${distText})`;
      case 'left':
        return `Поверните налево${streetText} (${distText})`;
      case 'slight_right':
        return `Держитесь правее${streetText} (${distText})`;
      case 'slight_left':
        return `Держитесь левее${streetText} (${distText})`;
      case 'sharp_right':
        return `Крутой поворот направо${streetText} (${distText})`;
      case 'sharp_left':
        return `Крутой поворот налево${streetText} (${distText})`;
      case 'uturn_left':
      case 'uturn_right':
        return `Развернитесь${streetText} (${distText})`;
      case 'roundabout':
        return `Круговое движение${streetText} (${distText})`;
      default:
        if (maneuver.comment && !maneuver.comment.includes('crossroad')) {
          return `${maneuver.comment} (${distText})`;
        }
        return street ? `Продолжайте движение по ${street} (${distText})` : `Двигайтесь прямо (${distText})`;
    }
  }

  /**
   * Haversine distance in meters between two lat/lng coordinates
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate prices for all tariffs based on route driving distance and duration
   */
  calculateTariffs(route: RouteInfo): TaxiTariff[] {
    return this.defaultTariffs.map(t => {
      const calculated = t.basePrice +
        (route.drivingDistanceKm * t.pricePerKm) +
        (route.drivingDurationMinutes * t.pricePerMinute);

      const rounded = Math.max(t.basePrice, Math.round(calculated / 10) * 10);

      return {
        ...t,
        estimatedPrice: rounded
      };
    });
  }
}
