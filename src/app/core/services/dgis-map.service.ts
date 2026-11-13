import { Injectable, inject } from '@angular/core';
import { load as loadMapgl } from '@2gis/mapgl';
import { environment } from '../../../environments/environment';
import { GeoPoint } from '../models/taxi.model';

export interface DgisMapInstanceOptions {
  center?: GeoPoint;
  zoom?: number;
  interactive?: boolean;
  zoomControl?: boolean | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  trafficOn?: boolean;
  trafficControl?: boolean | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

export interface DgisHtmlMarkerConfig {
  id: string;
  point: GeoPoint;
  html: string;
  anchor: [number, number]; // [x, y] in pixels
  zIndex?: number;
  popupHtml?: string;
  onClick?: () => void;
}

export interface DgisPolylineConfig {
  id: string;
  points: GeoPoint[];
  color: string;
  width: number;
  dashed?: boolean;
  dashLength?: number;
  gapLength?: number;
  gapColor?: string;
  tooltipText?: string;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class DgisMapService {
  private mapglPromise: Promise<any> | null = null;

  // Active instances tracked by ID
  private activeMaps = new Map<string, any>();
  private activeMarkers = new Map<string, Map<string, any>>();
  private activePolylines = new Map<string, Map<string, any>>();

  // Traffic state and listener maps
  private trafficStates = new Map<string, boolean>();
  private activeTrafficScores = new Map<string, number>();
  private trafficScoreListeners = new Map<string, Set<(score: number) => void>>();
  private trafficVisibilityListeners = new Map<string, Set<(visible: boolean) => void>>();

  /**
   * Asynchronously loads the official 2GIS MapGL JS API.
   * Caches the promise to ensure the script is only loaded once.
   */
  loadMapglApi(): Promise<any> {
    if (this.mapglPromise) {
      return this.mapglPromise;
    }

    // Check if mapgl is already available on the window object
    if (typeof window !== 'undefined' && (window as any).mapgl) {
      this.mapglPromise = Promise.resolve((window as any).mapgl);
      return this.mapglPromise;
    }

    this.mapglPromise = new Promise((resolve, reject) => {
      // Primary: load using official @2gis/mapgl npm package loader
      loadMapgl()
        .then(mapgl => {
          resolve(mapgl);
        })
        .catch(err => {
          console.warn('@2gis/mapgl loader failed, attempting direct script injection:', err);
          // Fallback: direct script injection from official 2GIS CDN
          const existingScript = document.querySelector('script[src*="mapgl.2gis.com/api/js/v1"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve((window as any).mapgl));
            existingScript.addEventListener('error', e => reject(e));
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://mapgl.2gis.com/api/js/v1';
          script.async = true;
          script.onload = () => {
            if ((window as any).mapgl) {
              resolve((window as any).mapgl);
            } else {
              reject(new Error('2GIS MapGL script loaded but window.mapgl is not defined.'));
            }
          };
          script.onerror = e => reject(new Error('Failed to load 2GIS MapGL script from CDN'));
          document.head.appendChild(script);
        });
    });

    return this.mapglPromise;
  }

  /**
   * Initializes a 2GIS map instance in the specified HTML container element.
   */
  async createMap(
    mapId: string,
    container: HTMLElement,
    options: DgisMapInstanceOptions = {}
  ): Promise<any> {
    // Destroy previous instance if one exists with the same ID
    this.destroyMap(mapId);

    const mapgl = await this.loadMapglApi();

    const centerPoint = options.center || { lat: 42.8765, lng: 74.6037 }; // Default Bishkek
    const zoomLevel = options.zoom ?? 13;
    const isInteractive = options.interactive ?? true;
    const zoomCtrl = options.zoomControl !== undefined ? options.zoomControl : (isInteractive ? 'topRight' : false);
    const trafficEnabled = options.trafficOn ?? false;

    const map = new mapgl.Map(container, {
      center: [centerPoint.lng, centerPoint.lat], // 2GIS expects [lon, lat]
      zoom: zoomLevel,
      key: environment.twoGisApiKey,
      zoomControl: zoomCtrl,
      trafficControl: options.trafficControl !== undefined ? options.trafficControl : false,
      trafficOn: trafficEnabled,
      lang: 'ru'
    });

    this.activeMaps.set(mapId, map);
    this.activeMarkers.set(mapId, new Map());
    this.activePolylines.set(mapId, new Map());
    this.trafficStates.set(mapId, trafficEnabled);
    this.trafficScoreListeners.set(mapId, new Set());
    this.trafficVisibilityListeners.set(mapId, new Set());

    // Register 2GIS native traffic events
    try {
      if (typeof map.on === 'function') {
        map.on('trafficscore', (e: any) => {
          const score = typeof e?.score === 'number' ? e.score : null;
          if (score !== null) {
            this.activeTrafficScores.set(mapId, score);
            const listeners = this.trafficScoreListeners.get(mapId);
            listeners?.forEach(cb => {
              try { cb(score); } catch (err) { console.warn('trafficscore listener error', err); }
            });
          }
        });

        map.on('trafficshow', () => {
          this.trafficStates.set(mapId, true);
          const listeners = this.trafficVisibilityListeners.get(mapId);
          listeners?.forEach(cb => {
            try { cb(true); } catch (err) { console.warn('trafficshow listener error', err); }
          });
        });

        map.on('traffichide', () => {
          this.trafficStates.set(mapId, false);
          const listeners = this.trafficVisibilityListeners.get(mapId);
          listeners?.forEach(cb => {
            try { cb(false); } catch (err) { console.warn('traffichide listener error', err); }
          });
        });
      }
    } catch (err) {
      console.warn('Could not bind 2GIS traffic events:', err);
    }

    return map;
  }

  getMap(mapId: string): any | undefined {
    return this.activeMaps.get(mapId);
  }

  /**
   * Destroys a map instance, freeing WebGL context and DOM nodes.
   */
  destroyMap(mapId: string): void {
    this.clearMarkers(mapId);
    this.clearPolylines(mapId);

    const map = this.activeMaps.get(mapId);
    if (map) {
      try {
        map.destroy();
      } catch (e) {
        console.warn(`Error destroying mapgl instance '${mapId}':`, e);
      }
      this.activeMaps.delete(mapId);
    }

    this.trafficStates.delete(mapId);
    this.activeTrafficScores.delete(mapId);
    this.trafficScoreListeners.delete(mapId);
    this.trafficVisibilityListeners.delete(mapId);
  }

  /**
   * Sets the center of the map in [lat, lng].
   */
  setCenter(mapId: string, point: GeoPoint, zoom?: number): void {
    const map = this.activeMaps.get(mapId);
    if (!map) return;

    map.setCenter([point.lng, point.lat]);
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  }

  /**
   * Gets the current center of the map as a normalized GeoPoint.
   */
  getCenter(mapId: string): GeoPoint | null {
    const map = this.activeMaps.get(mapId);
    if (!map) return null;

    const coords = map.getCenter(); // [lng, lat]
    return { lat: coords[1], lng: coords[0] };
  }

  /**
   * Fits the map viewport to include all given points.
   */
  fitBounds(mapId: string, points: GeoPoint[], padding = 60): void {
    const map = this.activeMaps.get(mapId);
    if (!map || points.length === 0) return;

    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;

    for (const pt of points) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }

    // Expand small bounding box if points are identical or extremely close
    if (Math.abs(maxLat - minLat) < 0.001 && Math.abs(maxLng - minLng) < 0.001) {
      map.setCenter([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);
      map.setZoom(15);
      return;
    }

    try {
      // 2GIS MapGL fitBounds accepts [[swLng, swLat], [neLng, neLat]] or [ne, sw]
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {
          padding: {
            top: padding,
            right: padding,
            bottom: padding,
            left: padding
          }
        }
      );
    } catch (e) {
      // Fallback: center on bounding midpoint
      map.setCenter([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);
    }
  }

  /**
   * Forces a map resize recalculation.
   */
  invalidateSize(mapId: string): void {
    const map = this.activeMaps.get(mapId);
    if (map) {
      try {
        map.invalidateSize();
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Adds or updates a custom HTML marker on the map.
   */
  async setHtmlMarker(mapId: string, config: DgisHtmlMarkerConfig): Promise<any> {
    const map = this.activeMaps.get(mapId);
    if (!map) return null;

    const mapgl = await this.loadMapglApi();
    const markersMap = this.activeMarkers.get(mapId) || new Map();

    // If marker with same ID exists, update it or remove it
    if (markersMap.has(config.id)) {
      const existing = markersMap.get(config.id);
      try {
        existing.destroy();
      } catch (e) {}
      markersMap.delete(config.id);
    }

    const marker = new mapgl.HtmlMarker(map, {
      coordinates: [config.point.lng, config.point.lat],
      html: config.html,
      anchor: config.anchor,
      zIndex: config.zIndex ?? 1000
    });

    if (config.onClick) {
      const contentEl = marker.getContent();
      if (contentEl) {
        contentEl.style.cursor = 'pointer';
        contentEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          config.onClick!();
        });
      }
    }

    markersMap.set(config.id, marker);
    this.activeMarkers.set(mapId, markersMap);

    return marker;
  }

  removeMarker(mapId: string, markerId: string): void {
    const markersMap = this.activeMarkers.get(mapId);
    if (markersMap && markersMap.has(markerId)) {
      const m = markersMap.get(markerId);
      try {
        m.destroy();
      } catch (e) {}
      markersMap.delete(markerId);
    }
  }

  clearMarkers(mapId: string): void {
    const markersMap = this.activeMarkers.get(mapId);
    if (markersMap) {
      markersMap.forEach(m => {
        try {
          m.destroy();
        } catch (e) {}
      });
      markersMap.clear();
    }
  }

  /**
   * Adds or updates a polyline on the map (solid or dashed).
   */
  async setPolyline(mapId: string, config: DgisPolylineConfig): Promise<any> {
    const map = this.activeMaps.get(mapId);
    if (!map || !config.points || config.points.length < 2) return null;

    const mapgl = await this.loadMapglApi();
    const polylinesMap = this.activePolylines.get(mapId) || new Map();

    if (polylinesMap.has(config.id)) {
      const existing = polylinesMap.get(config.id);
      try {
        existing.destroy();
      } catch (e) {}
      polylinesMap.delete(config.id);
    }

    const coords = config.points.map(pt => [pt.lng, pt.lat]);

    const polylineOptions: any = {
      coordinates: coords,
      color: config.color,
      width: config.width
    };

    if (config.dashed) {
      polylineOptions.dashLength = config.dashLength || 10;
      polylineOptions.gapLength = config.gapLength || 8;
      if (config.gapColor) {
        polylineOptions.gapColor = config.gapColor;
      }
    }

    const polyline = new mapgl.Polyline(map, polylineOptions);

    if (config.onClick) {
      polyline.on('click', () => {
        config.onClick!();
      });
    }

    if (config.onMouseOver) {
      polyline.on('mouseover', () => {
        config.onMouseOver!();
      });
    }

    if (config.onMouseOut) {
      polyline.on('mouseout', () => {
        config.onMouseOut!();
      });
    }

    polylinesMap.set(config.id, polyline);
    this.activePolylines.set(mapId, polylinesMap);

    return polyline;
  }

  removePolyline(mapId: string, polylineId: string): void {
    const polylinesMap = this.activePolylines.get(mapId);
    if (polylinesMap && polylinesMap.has(polylineId)) {
      const p = polylinesMap.get(polylineId);
      try {
        p.destroy();
      } catch (e) {}
      polylinesMap.delete(polylineId);
    }
  }

  clearPolylines(mapId: string): void {
    const polylinesMap = this.activePolylines.get(mapId);
    if (polylinesMap) {
      polylinesMap.forEach(p => {
        try {
          p.destroy();
        } catch (e) {}
      });
      polylinesMap.clear();
    }
  }

  // =========================================================================
  // 2GIS Native Traffic Layer Integration
  // =========================================================================

  /**
   * Enables the 2GIS native real-time traffic layer on the specified map instance.
   * Renders genuine road condition colors directly onto the vector road network.
   */
  showTraffic(mapId: string): boolean {
    const map = this.activeMaps.get(mapId);
    if (!map) return false;

    try {
      if (typeof map.showTraffic === 'function') {
        map.showTraffic();
      } else if (typeof map.setStyleOptions === 'function') {
        map.setStyleOptions({ traffic: true });
      }
      this.trafficStates.set(mapId, true);
      const listeners = this.trafficVisibilityListeners.get(mapId);
      listeners?.forEach(cb => {
        try { cb(true); } catch (e) {}
      });
      return true;
    } catch (err) {
      console.error(`Failed to show 2GIS traffic for map '${mapId}':`, err);
      return false;
    }
  }

  /**
   * Disables the 2GIS native real-time traffic layer on the specified map instance.
   */
  hideTraffic(mapId: string): boolean {
    const map = this.activeMaps.get(mapId);
    if (!map) return false;

    try {
      if (typeof map.hideTraffic === 'function') {
        map.hideTraffic();
      } else if (typeof map.setStyleOptions === 'function') {
        map.setStyleOptions({ traffic: false });
      }
      this.trafficStates.set(mapId, false);
      const listeners = this.trafficVisibilityListeners.get(mapId);
      listeners?.forEach(cb => {
        try { cb(false); } catch (e) {}
      });
      return true;
    } catch (err) {
      console.error(`Failed to hide 2GIS traffic for map '${mapId}':`, err);
      return false;
    }
  }

  /**
   * Toggles the 2GIS native traffic layer visibility.
   * Returns true if traffic is now enabled, false if disabled.
   */
  toggleTraffic(mapId: string): boolean {
    const isOn = this.isTrafficOn(mapId);
    if (isOn) {
      this.hideTraffic(mapId);
      return false;
    } else {
      this.showTraffic(mapId);
      return true;
    }
  }

  /**
   * Returns whether the 2GIS traffic layer is currently active on the map.
   */
  isTrafficOn(mapId: string): boolean {
    const map = this.activeMaps.get(mapId);
    if (!map) return false;

    try {
      if (typeof map.isTrafficOn === 'function') {
        return map.isTrafficOn();
      }
    } catch (e) {}

    return this.trafficStates.get(mapId) ?? false;
  }

  /**
   * Returns the latest real-time traffic score (0-10) reported by 2GIS for the map,
   * or null if not yet received.
   */
  getTrafficScore(mapId: string): number | null {
    return this.activeTrafficScores.get(mapId) ?? null;
  }

  /**
   * Subscribes to real-time traffic score updates emitted by 2GIS MapGL.
   * Returns an unsubscribe function.
   */
  onTrafficScoreChange(mapId: string, callback: (score: number) => void): () => void {
    let listeners = this.trafficScoreListeners.get(mapId);
    if (!listeners) {
      listeners = new Set();
      this.trafficScoreListeners.set(mapId, listeners);
    }
    listeners.add(callback);
    return () => listeners?.delete(callback);
  }

  /**
   * Subscribes to traffic visibility changes (shown or hidden).
   * Returns an unsubscribe function.
   */
  onTrafficVisibilityChange(mapId: string, callback: (visible: boolean) => void): () => void {
    let listeners = this.trafficVisibilityListeners.get(mapId);
    if (!listeners) {
      listeners = new Set();
      this.trafficVisibilityListeners.set(mapId, listeners);
    }
    listeners.add(callback);
    return () => listeners?.delete(callback);
  }

  /**
   * Forces a refresh of the 2GIS traffic layer by requesting updated traffic vector tiles.
   */
  refreshTraffic(mapId: string): void {
    const map = this.activeMaps.get(mapId);
    if (!map) return;

    if (this.isTrafficOn(mapId)) {
      try {
        if (typeof map.setStyleOptions === 'function') {
          map.setStyleOptions({ traffic: true });
        }
        map.invalidateSize();
      } catch (e) {
        console.warn('Could not refresh 2GIS traffic layer:', e);
      }
    }
  }
}
