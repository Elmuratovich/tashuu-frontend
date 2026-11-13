import { TestBed } from '@angular/core/testing';
import { DgisMapService } from './dgis-map.service';
import { GeoPoint } from '../models/taxi.model';

describe('DgisMapService', () => {
  let service: DgisMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DgisMapService]
    });
    service = TestBed.inject(DgisMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose loadMapglApi returning a promise', () => {
    const promise = service.loadMapglApi();
    expect(promise).toBeTruthy();
    expect(promise instanceof Promise).toBeTrue();
  });

  it('should track map instances by id and destroy them cleanly', () => {
    const fakeMap = {
      destroy: jasmine.createSpy('destroy'),
      invalidateSize: jasmine.createSpy('invalidateSize'),
      getCenter: () => [74.6037, 42.8765]
    };

    (service as any).activeMaps.set('test-map', fakeMap);
    expect(service.getMap('test-map')).toBe(fakeMap);

    const center = service.getCenter('test-map');
    expect(center).toEqual({ lat: 42.8765, lng: 74.6037 });

    service.invalidateSize('test-map');
    expect(fakeMap.invalidateSize).toHaveBeenCalled();

    service.destroyMap('test-map');
    expect(fakeMap.destroy).toHaveBeenCalled();
    expect(service.getMap('test-map')).toBeUndefined();
  });

  it('should compute fitBounds correctly for given coordinate bounds', () => {
    const fakeMap = {
      fitBounds: jasmine.createSpy('fitBounds'),
      setCenter: jasmine.createSpy('setCenter'),
      setZoom: jasmine.createSpy('setZoom')
    };

    (service as any).activeMaps.set('test-map-bounds', fakeMap);

    const points: GeoPoint[] = [
      { lat: 42.8765, lng: 74.6037 },
      { lat: 42.8553, lng: 74.5866 }
    ];

    service.fitBounds('test-map-bounds', points, 60);

    expect(fakeMap.fitBounds).toHaveBeenCalledWith(
      [
        [74.5866, 42.8553],
        [74.6037, 42.8765]
      ],
      {
        padding: {
          top: 60,
          right: 60,
          bottom: 60,
          left: 60
        }
      }
    );
  });

  it('should toggle and control 2GIS traffic layer correctly', () => {
    const fakeMap = {
      showTraffic: jasmine.createSpy('showTraffic'),
      hideTraffic: jasmine.createSpy('hideTraffic'),
      isTrafficOn: jasmine.createSpy('isTrafficOn').and.returnValue(false),
      setStyleOptions: jasmine.createSpy('setStyleOptions'),
      invalidateSize: jasmine.createSpy('invalidateSize')
    };

    const mapId = 'traffic-map-1';
    (service as any).activeMaps.set(mapId, fakeMap);

    // Initial state
    expect(service.isTrafficOn(mapId)).toBeFalse();

    // Show traffic
    const showResult = service.showTraffic(mapId);
    expect(showResult).toBeTrue();
    expect(fakeMap.showTraffic).toHaveBeenCalled();

    // Toggle traffic (now turning OFF)
    fakeMap.isTrafficOn.and.returnValue(true);
    const toggledOff = service.toggleTraffic(mapId);
    expect(toggledOff).toBeFalse();
    expect(fakeMap.hideTraffic).toHaveBeenCalled();

    // Toggle traffic back ON
    fakeMap.isTrafficOn.and.returnValue(false);
    const toggledOn = service.toggleTraffic(mapId);
    expect(toggledOn).toBeTrue();
  });

  it('should notify subscribers on traffic score and visibility changes', () => {
    const mapId = 'traffic-map-events';
    (service as any).activeMaps.set(mapId, {
      showTraffic: jasmine.createSpy('showTraffic'),
      hideTraffic: jasmine.createSpy('hideTraffic')
    });

    let reportedScore: number | null = null;
    const unsubScore = service.onTrafficScoreChange(mapId, score => {
      reportedScore = score;
    });

    let reportedVisibility: boolean | null = null;
    const unsubVis = service.onTrafficVisibilityChange(mapId, visible => {
      reportedVisibility = visible;
    });

    // Simulate score event from 2GIS
    (service as any).trafficScoreListeners.get(mapId)?.forEach((cb: any) => cb(4));
    expect(reportedScore).toBe(4);

    // Simulate visibility change
    service.showTraffic(mapId);
    expect(reportedVisibility).toBeTrue();

    service.hideTraffic(mapId);
    expect(reportedVisibility).toBeFalse();

    unsubScore();
    unsubVis();
  });
});
