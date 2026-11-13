export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TaxiLocation {
  address: string;
  point?: GeoPoint;
  displayName?: string;
  country?: string;
  city?: string;
  district?: string;
  street?: string;
  houseNumber?: string;
  postcode?: string;
  settlement?: string;
  placeId?: string | number;
}

export interface RouteStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  maneuverModifier?: string;
}

export interface WalkingSegment {
  geometry: [number, number][]; // [lat, lng] array
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  steps?: RouteStep[];
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  instructionLabel?: string;
}

export type RouteBadgeType = 'recommended' | 'fastest' | 'shortest' | 'alternative' | 'walking_access';

export interface RouteInfo {
  id: string;
  routeNumber: number; // 1, 2, 3...
  color: string; // assigned palette color (e.g. '#2f6bff', '#10b981', '#f59e0b', '#8b5cf6')

  // Driving metrics
  drivingDistanceMeters: number;
  drivingDistanceKm: number;
  drivingDurationSeconds: number;
  drivingDurationMinutes: number;

  // General distance/duration (primary driving)
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;

  // Walking segments & combined metrics
  pickupWalking?: WalkingSegment;
  dropoffWalking?: WalkingSegment;
  vehiclePickupPoint?: GeoPoint;
  vehicleDropoffPoint?: GeoPoint;
  totalWalkingDistanceMeters: number;
  totalWalkingDurationMinutes: number;
  totalDurationMinutes: number; // driving + walking
  hasWalkingSegments: boolean;
  accessNotice?: string; // Human-readable notice about walking or access limitations

  geometry: [number, number][]; // [lat, lng] array for Leaflet polyline
  summary?: string;
  viaRoads?: string;
  traversedStreets: string[]; // List of actual streets traversed in order
  isPrimary?: boolean;
  badgeType: RouteBadgeType;
  badgeLabelKey: string;
  differenceText?: string; // e.g. "Самый быстрый" or "+2 мин, -0.4 км"
  steps: RouteStep[];
  provider?: string; // 'Valhalla' | 'OSRM' | '2GIS'
  objective?: 'recommended' | 'fastest' | 'shortest' | 'alternative';
}

export interface RouteDebugInfo {
  provider: string;
  profile: string;
  requestedFrom: GeoPoint;
  requestedTo: GeoPoint;
  snappedFrom?: GeoPoint;
  snappedTo?: GeoPoint;
  distanceFromRoadMetersA?: number;
  distanceFromRoadMetersB?: number;
  routesCount: number;
  calculationDurationMs: number;
  rawApiNotes?: string;
  comparison?: {
    fastestDistanceKm: number;
    fastestDurationMin: number;
    shortestDistanceKm?: number;
    shortestDurationMin?: number;
    savedDistanceMeters?: number;
  };
}

export interface RouteCalculationResult {
  routes: RouteInfo[];
  selectedRouteIndex: number;
  debugInfo?: RouteDebugInfo;
}

export type TariffType = 'standard' | 'comfort' | 'comfort_plus' | 'business' | 'cargo';

export interface TaxiTariff {
  id: TariffType;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMinute: number;
  estimatedPrice: number;
  capacity: string;
  etaMinutes: number;
}

export type PaymentMethod = 'cash' | 'card' | 'wallet';

export type TaxiBookingStatus =
  | 'draft'
  | 'searching'
  | 'driver_assigned'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TaxiDriverInfo {
  id: string;
  name: string;
  phone: string;
  rating: number;
  ridesCount: number;
  carModel: string;
  carColor: string;
  plateNumber: string;
  etaMinutes: number;
  currentPoint: GeoPoint;
}

export interface TaxiBooking {
  id: string;
  orderNumber: string;
  from: TaxiLocation;
  to: TaxiLocation;
  route: RouteInfo;
  tariff: TaxiTariff;
  paymentMethod: PaymentMethod;
  comment?: string;
  status: TaxiBookingStatus;
  createdAt: Date;
  driver?: TaxiDriverInfo;
}

export interface GeocodingSearchResult {
  displayName: string;
  addressShort: string;
  point: GeoPoint;
  placeId: string | number;
  type?: string;
  country?: string;
  city?: string;
  district?: string;
  street?: string;
  houseNumber?: string;
  postcode?: string;
}
