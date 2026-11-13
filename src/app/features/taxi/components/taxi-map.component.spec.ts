import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaxiMapComponent } from './taxi-map.component';
import { DgisMapService } from '../../../core/services/dgis-map.service';
import { provideTranslateService } from '@ngx-translate/core';

describe('TaxiMapComponent - 2GIS Traffic Integration', () => {
  let component: TaxiMapComponent;
  let fixture: ComponentFixture<TaxiMapComponent>;
  let fakeDgisMapService: jasmine.SpyObj<DgisMapService>;

  beforeEach(async () => {
    fakeDgisMapService = jasmine.createSpyObj('DgisMapService', [
      'createMap',
      'destroyMap',
      'showTraffic',
      'hideTraffic',
      'toggleTraffic',
      'isTrafficOn',
      'getTrafficScore',
      'refreshTraffic',
      'onTrafficScoreChange',
      'onTrafficVisibilityChange',
      'setCenter',
      'fitBounds',
      'invalidateSize',
      'setHtmlMarker',
      'removeMarker',
      'clearMarkers',
      'setPolyline',
      'removePolyline',
      'clearPolylines'
    ]);

    fakeDgisMapService.createMap.and.returnValue(Promise.resolve({ on: jasmine.createSpy('on') }));
    fakeDgisMapService.onTrafficScoreChange.and.returnValue(() => {});
    fakeDgisMapService.onTrafficVisibilityChange.and.returnValue(() => {});
    fakeDgisMapService.toggleTraffic.and.returnValue(true);
    fakeDgisMapService.isTrafficOn.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [TaxiMapComponent],
      providers: [
        { provide: DgisMapService, useValue: fakeDgisMapService },
        provideTranslateService({ lang: 'ru', fallbackLang: 'ru' })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaxiMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the map component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle traffic layer and emit trafficToggled event', () => {
    spyOn(component.trafficToggled, 'emit');

    expect(component.isTrafficActive).toBeFalse();

    component.toggleTrafficLayer();

    expect(fakeDgisMapService.toggleTraffic).toHaveBeenCalledWith(component.mapId);
    expect(component.isTrafficActive).toBeTrue();
    expect(component.trafficToggled.emit).toHaveBeenCalledWith(true);
  });

  it('should toggle legend collapse state', () => {
    expect(component.isLegendCollapsed).toBeFalse();
    component.toggleLegendCollapse();
    expect(component.isLegendCollapsed).toBeTrue();
    component.toggleLegendCollapse();
    expect(component.isLegendCollapsed).toBeFalse();
  });

  it('should support switching traffic legend language between RU, KG, and UZ', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;

    component.setLegendLang('kg', fakeEvent);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(component.legendLang).toBe('kg');
    expect(component.currentLoc.title).toBe('2GIS тыгындар шкаласы');
    expect(component.currentLoc.levels[0].label).toBe('Ачык жол');

    component.setLegendLang('uz', fakeEvent);
    expect(component.legendLang).toBe('uz');
    expect(component.currentLoc.title).toBe('2GIS tirbandlik shkalasi');
    expect(component.currentLoc.levels[0].label).toBe('Erkin harakat');

    component.setLegendLang('ru', fakeEvent);
    expect(component.legendLang).toBe('ru');
    expect(component.currentLoc.title).toBe('Шкала пробок 2GIS');
    expect(component.currentLoc.levels[0].label).toBe('Свободно');
  });

  it('should format traffic score labels according to active language', () => {
    component.legendLang = 'ru';
    expect(component.getTrafficScoreLabel(1)).toBe('1 балл');
    expect(component.getTrafficScoreLabel(3)).toBe('3 балла');
    expect(component.getTrafficScoreLabel(7)).toBe('7 баллов');

    component.legendLang = 'kg';
    expect(component.getTrafficScoreLabel(5)).toBe('5 балл');

    component.legendLang = 'uz';
    expect(component.getTrafficScoreLabel(5)).toBe('5 ball');
  });

  it('should return appropriate color for traffic condition levels', () => {
    expect(component.getTrafficScoreColor(2)).toBe('#10b981'); // Green
    expect(component.getTrafficScoreColor(4)).toBe('#eab308'); // Yellow
    expect(component.getTrafficScoreColor(6)).toBe('#f97316'); // Orange
    expect(component.getTrafficScoreColor(8)).toBe('#ef4444'); // Red
    expect(component.getTrafficScoreColor(10)).toBe('#991b1b'); // Dark red
  });

  it('should identify which scale level is active based on 2GIS score', () => {
    component.trafficScore = 5;
    expect(component.isLevelActive('1–3')).toBeFalse();
    expect(component.isLevelActive('4–5')).toBeTrue();
    expect(component.isLevelActive('6')).toBeFalse();

    component.trafficScore = 9;
    expect(component.isLevelActive('9–10')).toBeTrue();
  });

  it('should trigger refresh traffic data without breaking', (done) => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;

    component.refreshTrafficData(fakeEvent);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isRefreshing).toBeTrue();
    expect(fakeDgisMapService.refreshTraffic).toHaveBeenCalledWith(component.mapId);

    setTimeout(() => {
      expect(component.isRefreshing).toBeFalse();
      done();
    }, 850);
  });
});
