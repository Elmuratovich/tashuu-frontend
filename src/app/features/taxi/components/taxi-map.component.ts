import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { GeoPoint, RouteInfo, TaxiLocation } from '../../../core/models/taxi.model';
import { DgisMapService } from '../../../core/services/dgis-map.service';
import { LanguageService } from '../../../core/i18n/language.service';

export interface TrafficScaleLevel {
  score: string;
  label: string;
  desc: string;
  color: string;
  dotClass: string;
}

export interface TrafficLocalizationData {
  title: string;
  city: string;
  layer: string;
  toggleOn: string;
  toggleOff: string;
  expand: string;
  collapse: string;
  live: string;
  official: string;
  refresh: string;
  levels: TrafficScaleLevel[];
}

@Component({
  selector: 'app-taxi-map',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="taxi-map-container" [style.height]="height">
      <!-- 2GIS Map Canvas Container -->
      <div #mapContainer class="taxi-map-canvas"></div>

      <!-- Floating Route Legend (Top Left) -->
      <div class="map-legend-card" *ngIf="routes && routes.length > 0">
        <div class="legend-title">{{ 'TAXI.LEGEND_TITLE' | translate }}</div>
        <div class="legend-items">
          <div class="legend-row">
            <span class="legend-line legend-line--selected"></span>
            <span class="legend-label">{{ 'TAXI.LEGEND_SELECTED_ROUTE' | translate }}</span>
          </div>

          <div class="legend-row" *ngIf="routes.length > 1">
            <div class="legend-palette-bars">
              <span class="bar bar--green"></span>
              <span class="bar bar--orange"></span>
              <span class="bar bar--purple"></span>
            </div>
            <span class="legend-label">{{ 'TAXI.LEGEND_ALT_ROUTE' | translate }}</span>
          </div>

          <div class="legend-row" *ngIf="hasWalkingSegments()">
            <span class="legend-line legend-line--walking"></span>
            <span class="legend-label">{{ 'TAXI.LEGEND_WALKING' | translate }}</span>
          </div>
        </div>
      </div>

      <!-- Floating Map Action Controls (Bottom Right) -->
      <div class="map-floating-overlay">
        <!-- Traffic Layer Dedicated Toggle Button -->
        <button
          type="button"
          class="map-fab-btn map-fab-traffic"
          [class.map-fab-traffic--active]="isTrafficActive"
          (click)="toggleTrafficLayer()"
          [attr.title]="(isTrafficActive ? 'TAXI.TRAFFIC_HIDE' : 'TAXI.TRAFFIC_SHOW') | translate"
          aria-label="Toggle 2GIS traffic layer"
        >
          <span class="traffic-fab-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="7" y="2" width="10" height="20" rx="3.5" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="6.5" r="1.8" [attr.fill]="isTrafficActive ? '#ef4444' : 'currentColor'"/>
              <circle cx="12" cy="12" r="1.8" [attr.fill]="isTrafficActive ? '#f59e0b' : 'currentColor'"/>
              <circle cx="12" cy="17.5" r="1.8" [attr.fill]="isTrafficActive ? '#10b981' : 'currentColor'"/>
            </svg>
          </span>
          <span class="fab-label">{{ 'TAXI.TRAFFIC_LAYER' | translate }}</span>
          <span
            class="traffic-fab-score-badge"
            *ngIf="isTrafficActive && trafficScore !== null"
            [style.background]="getTrafficScoreColor(trafficScore)"
          >
            {{ trafficScore }}
          </span>
        </button>

        <!-- Recenter / Full Route View Button -->
        <button
          type="button"
          class="map-fab-btn map-fab-recenter"
          *ngIf="hasRouteOrMarkers()"
          (click)="fitRouteBounds()"
          [attr.title]="'TAXI.SHOW_FULL_ROUTE' | translate"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <span class="fab-label">{{ 'TAXI.SHOW_FULL_ROUTE' | translate }}</span>
        </button>
      </div>

      <!-- Floating 2GIS Real-Time Traffic Legend (Bottom Left) -->
      <div class="traffic-legend-card" *ngIf="isTrafficActive">
        <!-- Compact Summary Header / Bar -->
        <div class="traffic-legend-header" (click)="toggleLegendCollapse()">
          <div class="traffic-header-left">
            <span class="traffic-pulse-dot" [style.background]="getTrafficScoreColor(trafficScore)"></span>
            <div class="traffic-header-info">
              <span class="traffic-city-name">{{ currentLoc.city }}:</span>
              <strong class="traffic-score-value" [style.color]="getTrafficScoreColor(trafficScore)">
                {{ getTrafficScoreLabel(trafficScore) }}
              </strong>
            </div>
          </div>

          <div class="traffic-header-actions">
            <!-- Miniature 5-stage Color Bar when collapsed -->
            <div class="traffic-mini-gradient" *ngIf="isLegendCollapsed" [attr.title]="currentLoc.title">
              <span class="mini-bar mini-bar--green"></span>
              <span class="mini-bar mini-bar--yellow"></span>
              <span class="mini-bar mini-bar--orange"></span>
              <span class="mini-bar mini-bar--red"></span>
              <span class="mini-bar mini-bar--darkred"></span>
            </div>

            <!-- Expand / Collapse Chevron Button -->
            <button
              type="button"
              class="traffic-collapse-btn"
              [attr.aria-label]="isLegendCollapsed ? currentLoc.expand : currentLoc.collapse"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" [class.rotated]="!isLegendCollapsed">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Detailed Color Scale Body (Expandable) -->
        <div class="traffic-legend-body" *ngIf="!isLegendCollapsed">
          <!-- Language Selector Bar (Russian, Kyrgyz, Uzbek) -->
          <div class="traffic-lang-bar">
            <span class="traffic-legend-title-text">{{ currentLoc.title }}</span>
            <div class="traffic-lang-chips">
              <button
                type="button"
                class="lang-chip"
                [class.lang-chip--active]="legendLang === 'ru'"
                (click)="setLegendLang('ru', $event)"
              >RU</button>
              <button
                type="button"
                class="lang-chip"
                [class.lang-chip--active]="legendLang === 'kg'"
                (click)="setLegendLang('kg', $event)"
              >KG</button>
              <button
                type="button"
                class="lang-chip"
                [class.lang-chip--active]="legendLang === 'uz'"
                (click)="setLegendLang('uz', $event)"
              >UZ</button>
            </div>
          </div>

          <!-- 5 Color-coded Traffic Condition Rows -->
          <div class="traffic-scale-list">
            <div
              class="traffic-scale-row"
              *ngFor="let item of currentLoc.levels"
              [class.traffic-scale-row--active]="isLevelActive(item.score)"
            >
              <div class="traffic-scale-indicator">
                <span class="scale-color-dot" [style.background]="item.color"></span>
                <span class="scale-score-badge">{{ item.score }}</span>
              </div>
              <div class="traffic-scale-text">
                <span class="scale-name">{{ item.label }}</span>
                <span class="scale-desc">{{ item.desc }}</span>
              </div>
            </div>
          </div>

          <!-- Official 2GIS Data Attribution & Refresh -->
          <div class="traffic-legend-footer">
            <div class="traffic-footer-source">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ currentLoc.official }}</span>
            </div>
            <button
              type="button"
              class="traffic-refresh-link"
              (click)="refreshTrafficData($event)"
              [attr.title]="currentLoc.refresh"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" [class.spinning]="isRefreshing">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>{{ currentLoc.refresh }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Provider Badge (Bottom Left) -->
      <div class="map-provider-watermark">
        <span>2GIS Maps</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .taxi-map-container {
      width: 100%;
      height: 100%;
      min-height: 280px;
      position: relative;
      border-radius: inherit;
      overflow: hidden;
    }

    .taxi-map-canvas {
      width: 100%;
      height: 100%;
      background: #eef2f8;
      z-index: 1;
    }

    /* Floating Route Legend Card */
    .map-legend-card {
      position: absolute;
      top: 1.25rem;
      left: 1.25rem;
      z-index: 50;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(11, 31, 68, 0.09);
      border-radius: 0.875rem;
      padding: 0.65rem 0.95rem;
      box-shadow: 0 8px 24px rgba(11, 31, 68, 0.14);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      pointer-events: auto;
      max-width: 260px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .legend-title {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 0.15rem;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .legend-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .legend-label {
      font-size: 0.775rem;
      font-weight: 600;
      color: #0b1f44;
      line-height: 1.2;
    }

    .legend-line {
      display: inline-block;
      flex-shrink: 0;
      border-radius: 999px;
    }

    .legend-line--selected {
      width: 22px;
      height: 5px;
      background: #2f6bff;
      box-shadow: 0 0 8px rgba(47, 107, 255, 0.5);
    }

    .legend-palette-bars {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .bar {
      width: 7px;
      height: 5px;
      border-radius: 2px;
    }

    .bar--green { background: #10b981; }
    .bar--orange { background: #f59e0b; }
    .bar--purple { background: #8b5cf6; }

    .legend-line--walking {
      width: 22px;
      height: 4px;
      background: repeating-linear-gradient(
        90deg,
        #1e293b 0,
        #1e293b 5px,
        transparent 5px,
        transparent 9px
      );
    }

    /* Floating Action Controls Overlay */
    .map-floating-overlay {
      position: absolute;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.65rem;
      pointer-events: auto;
    }

    .map-fab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.9rem;
      border-radius: 999px;
      background: #ffffff;
      color: #0b1f44;
      border: 1px solid #e2e8f2;
      box-shadow: 0 6px 20px rgba(11, 31, 68, 0.16);
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .map-fab-btn:hover {
      background: #f8fafc;
      color: #2f6bff;
      border-color: #2f6bff;
      box-shadow: 0 8px 24px rgba(47, 107, 255, 0.22);
      transform: translateY(-1px);
    }

    .map-fab-btn svg {
      color: inherit;
    }

    /* Active Traffic Toggle FAB */
    .map-fab-traffic--active {
      background: #0b1f44 !important;
      color: #ffffff !important;
      border-color: #0b1f44 !important;
      box-shadow: 0 8px 24px rgba(11, 31, 68, 0.32) !important;
    }

    .map-fab-traffic--active:hover {
      background: #142a58 !important;
      border-color: #142a58 !important;
      color: #ffffff !important;
    }

    .traffic-fab-icon {
      display: inline-flex;
      align-items: center;
    }

    .traffic-fab-score-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      margin-left: -0.15rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    /* Floating 2GIS Real-time Traffic Legend Card */
    .traffic-legend-card {
      position: absolute;
      bottom: 1.5rem;
      left: 1.25rem;
      z-index: 50;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(11, 31, 68, 0.1);
      border-radius: 0.875rem;
      box-shadow: 0 10px 30px rgba(11, 31, 68, 0.16);
      width: 290px;
      max-width: calc(100vw - 2.5rem);
      pointer-events: auto;
      overflow: hidden;
      animation: fadeIn 0.22s ease-out;
    }

    .traffic-legend-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.8rem;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
    }

    .traffic-legend-header:hover {
      background: rgba(241, 245, 249, 0.7);
    }

    .traffic-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .traffic-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulseGlow 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
    }

    @keyframes pulseGlow {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .traffic-header-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      color: #0b1f44;
    }

    .traffic-city-name {
      font-weight: 600;
      color: #475569;
    }

    .traffic-score-value {
      font-weight: 800;
    }

    .traffic-header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .traffic-mini-gradient {
      display: inline-flex;
      align-items: center;
      gap: 2.5px;
    }

    .mini-bar {
      width: 6px;
      height: 11px;
      border-radius: 2px;
    }

    .mini-bar--green { background: #10b981; }
    .mini-bar--yellow { background: #eab308; }
    .mini-bar--orange { background: #f97316; }
    .mini-bar--red { background: #ef4444; }
    .mini-bar--darkred { background: #991b1b; }

    .traffic-collapse-btn {
      background: none;
      border: none;
      padding: 0.2rem;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: transform 0.2s ease, color 0.15s ease;
    }

    .traffic-collapse-btn svg {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .traffic-collapse-btn svg.rotated {
      transform: rotate(180deg);
    }

    .traffic-legend-body {
      border-top: 1px solid rgba(11, 31, 68, 0.08);
      padding: 0.65rem 0.8rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      background: #ffffff;
    }

    .traffic-lang-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      padding-bottom: 0.2rem;
    }

    .traffic-legend-title-text {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .traffic-lang-chips {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #f1f5f9;
      padding: 2px;
      border-radius: 6px;
    }

    .lang-chip {
      background: none;
      border: none;
      font-size: 0.65rem;
      font-weight: 750;
      color: #64748b;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .lang-chip--active {
      background: #2f6bff;
      color: #ffffff;
      box-shadow: 0 1px 4px rgba(47, 107, 255, 0.35);
    }

    .traffic-scale-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .traffic-scale-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.28rem 0.4rem;
      border-radius: 0.5rem;
      transition: background-color 0.12s ease;
    }

    .traffic-scale-row:hover {
      background: #f8fafc;
    }

    .traffic-scale-row--active {
      background: rgba(47, 107, 255, 0.08);
    }

    .traffic-scale-indicator {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
      width: 46px;
    }

    .scale-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .scale-score-badge {
      font-size: 0.7rem;
      font-weight: 800;
      color: #475569;
      font-family: monospace;
    }

    .traffic-scale-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .scale-name {
      font-size: 0.775rem;
      font-weight: 750;
      color: #0b1f44;
      line-height: 1.2;
    }

    .scale-desc {
      font-size: 0.675rem;
      color: #64748b;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .traffic-legend-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.4rem;
      border-top: 1px dashed #e2e8f2;
      font-size: 0.68rem;
      color: #94a3b8;
    }

    .traffic-footer-source {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 600;
    }

    .traffic-refresh-link {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: none;
      color: #2f6bff;
      font-size: 0.68rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }

    .traffic-refresh-link:hover {
      text-decoration: underline;
    }

    .traffic-refresh-link svg.spinning {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .map-provider-watermark {
      position: absolute;
      bottom: 0.5rem;
      left: 0.75rem;
      z-index: 40;
      font-size: 0.65rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.7);
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
    }

    /* Custom 2GIS HTML Marker Styles */
    ::ng-deep .taxi-precise-marker {
      background: none !important;
      border: none !important;
    }

    ::ng-deep .marker-svg-wrap {
      width: 36px;
      height: 46px;
      position: relative;
      filter: drop-shadow(0 6px 12px rgba(11, 31, 68, 0.3));
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    ::ng-deep .marker-svg-wrap:hover {
      transform: scale(1.08) translateY(-2px);
    }

    ::ng-deep .vehicle-stop-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.65rem 0.3rem 0.5rem;
      border-radius: 999px;
      background: #ffffff;
      border: 2px solid;
      box-shadow: 0 8px 20px rgba(11, 31, 68, 0.28);
      font-size: 0.75rem;
      font-weight: 800;
      color: #0b1f44;
      white-space: nowrap;
      cursor: pointer;
      transform: translate(-50%, -100%);
      transition: transform 0.15s ease;
    }

    ::ng-deep .vehicle-stop-badge:hover {
      transform: translate(-50%, -106%) scale(1.04);
    }

    ::ng-deep .vehicle-stop-badge--pickup {
      border-color: #059669;
    }

    ::ng-deep .vehicle-stop-badge--pickup .stop-icon {
      color: #059669;
    }

    ::ng-deep .vehicle-stop-badge--dropoff {
      border-color: #dc2626;
    }

    ::ng-deep .vehicle-stop-badge--dropoff .stop-icon {
      color: #dc2626;
    }

    /* Popups rendered inside markers */
    ::ng-deep .tashuu-marker-popup {
      position: absolute;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 16px 40px rgba(11, 31, 68, 0.25);
      border: 1px solid rgba(11, 31, 68, 0.08);
      padding: 0.85rem 1rem;
      min-width: 240px;
      max-width: 320px;
      z-index: 2000;
      display: none;
      animation: fadeIn 0.15s ease-out;
    }

    ::ng-deep .marker-svg-wrap:hover .tashuu-marker-popup,
    ::ng-deep .vehicle-stop-badge:hover .tashuu-marker-popup {
      display: block;
    }

    ::ng-deep .tashuu-popup-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    ::ng-deep .tashuu-popup-badge--pickup {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    ::ng-deep .tashuu-popup-badge--dest {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    ::ng-deep .tashuu-popup-badge--car {
      background: rgba(47, 107, 255, 0.12);
      color: #2f6bff;
    }

    ::ng-deep .tashuu-popup-street {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0b1f44;
      margin: 0 0 0.25rem;
      line-height: 1.3;
    }

    ::ng-deep .tashuu-popup-full-address {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0 0 0.5rem;
      line-height: 1.35;
    }

    ::ng-deep .tashuu-popup-coords {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.45rem;
      border-top: 1px dashed #e2e8f2;
      font-size: 0.725rem;
      color: #94a3b8;
      font-family: monospace;
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 640px) {
      .traffic-legend-card {
        bottom: 1rem;
        left: 0.75rem;
        width: 260px;
      }

      .map-floating-overlay {
        bottom: 1rem;
        right: 0.75rem;
      }
    }
  `]
})
export class TaxiMapComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  @Input() fromPoint: GeoPoint | null = null;
  @Input() toPoint: GeoPoint | null = null;
  @Input() fromLocation: TaxiLocation | null = null;
  @Input() toLocation: TaxiLocation | null = null;
  @Input() routes: RouteInfo[] = [];
  @Input() selectedRouteIndex = 0;
  @Input() height = '100%';
  @Input() interactive = true;
  @Input() center: GeoPoint = { lat: 42.8765, lng: 74.6037 };
  @Input() zoom = 13;
  @Input() allowClickToSelect = false;
  @Input() trafficOn = false;

  @Output() pointSelected = new EventEmitter<GeoPoint>();
  @Output() routeSelected = new EventEmitter<number>();
  @Output() trafficToggled = new EventEmitter<boolean>();

  private dgisMap = inject(DgisMapService);
  private languageService = inject(LanguageService);
  readonly mapId = 'taxi-main-map-' + Math.random().toString(36).substring(2, 9);

  private resizeObserver?: ResizeObserver;
  private isMapReady = false;

  // 2GIS Traffic layer state
  isTrafficActive = false;
  trafficScore: number | null = null;
  isLegendCollapsed = false;
  isRefreshing = false;
  legendLang: 'ru' | 'kg' | 'uz' = 'ru';

  private unsubTrafficScore?: () => void;
  private unsubTrafficVis?: () => void;

  // Multi-lingual traffic scale localization definitions (Russian, Kyrgyz, Uzbek)
  readonly TRAFFIC_LOCALIZATION: Record<'ru' | 'kg' | 'uz', TrafficLocalizationData> = {
    ru: {
      title: 'Шкала пробок 2GIS',
      city: 'Бишкек',
      layer: 'Пробки',
      toggleOn: 'Включить пробки',
      toggleOff: 'Отключить пробки',
      expand: 'Развернуть шкалу',
      collapse: 'Свернуть шкалу',
      live: 'В реальном времени',
      official: 'Данные 2GIS онлайн',
      refresh: 'Обновить',
      levels: [
        { score: '1–3', label: 'Свободно', desc: 'Движение без задержек', color: '#10b981', dotClass: 'dot--green' },
        { score: '4–5', label: 'Затруднения', desc: 'Небольшие заторы на перекрёстках', color: '#eab308', dotClass: 'dot--yellow' },
        { score: '6', label: 'Плотное движение', desc: 'Замедление основных потоков', color: '#f97316', dotClass: 'dot--orange' },
        { score: '7–8', label: 'Пробка', desc: 'Серьёзные заторы, время увеличено', color: '#ef4444', dotClass: 'dot--red' },
        { score: '9–10', label: 'Глухая пробка', desc: 'Движение практически остановлено', color: '#991b1b', dotClass: 'dot--darkred' }
      ]
    },
    kg: {
      title: '2GIS тыгындар шкаласы',
      city: 'Бишкек',
      layer: 'Тыгындар',
      toggleOn: 'Тыгындарды көрсөтүү',
      toggleOff: 'Тыгындарды жашыруу',
      expand: 'Шкаланы ачуу',
      collapse: 'Шкаланы жыйноо',
      live: 'Реалдуу убакыт',
      official: '2GIS онлайн маалыматы',
      refresh: 'Жаңыртуу',
      levels: [
        { score: '1–3', label: 'Ачык жол', desc: 'Тоскоолдуксуз эркин кыймыл', color: '#10b981', dotClass: 'dot--green' },
        { score: '4–5', label: 'Жай кыймыл', desc: 'Кесилиштерде анча чоң эмес кечигүү', color: '#eab308', dotClass: 'dot--yellow' },
        { score: '6', label: 'Тыгыз кыймыл', desc: 'Негизги көчөлөрдө жай кыймыл', color: '#f97316', dotClass: 'dot--orange' },
        { score: '7–8', label: 'Тыгын', desc: 'Олуттуу тыгын, сапар убактысы узарат', color: '#ef4444', dotClass: 'dot--red' },
        { score: '9–10', label: 'Катуу тыгын', desc: 'Кыймыл дээрлик токтоп калган', color: '#991b1b', dotClass: 'dot--darkred' }
      ]
    },
    uz: {
      title: "2GIS tirbandlik shkalasi",
      city: 'Bishkek',
      layer: 'Tirbandlik',
      toggleOn: "Tirbandlikni ko'rsatish",
      toggleOff: 'Tirbandlikni yashirish',
      expand: 'Shkalani ochish',
      collapse: "Shkalani yig'ish",
      live: 'Real vaqt rejimida',
      official: "2GIS onlayn ma'lumotlari",
      refresh: 'Yangilash',
      levels: [
        { score: '1–3', label: 'Erkin harakat', desc: "To'siqsiz erkin harakat", color: '#10b981', dotClass: 'dot--green' },
        { score: '4–5', label: 'Sekin harakat', desc: 'Chorrahalarda kichik tirbandliklar', color: '#eab308', dotClass: 'dot--yellow' },
        { score: '6', label: 'Quyuq harakat', desc: "Asosiy yo'llarda sekinlashgan oqim", color: '#f97316', dotClass: 'dot--orange' },
        { score: '7–8', label: 'Tirbandlik', desc: 'Jiddiy tirbandlik, safar vaqti ortadi', color: '#ef4444', dotClass: 'dot--red' },
        { score: '9–10', label: 'Kuchli tirbandlik', desc: "Harakat deyarli to'xtab qolgan", color: '#991b1b', dotClass: 'dot--darkred' }
      ]
    }
  };

  get currentLoc(): TrafficLocalizationData {
    return this.TRAFFIC_LOCALIZATION[this.legendLang] || this.TRAFFIC_LOCALIZATION.ru;
  }

  ngOnInit(): void {
    // Sync traffic legend language with current app language
    const appLang = this.languageService.current();
    if (appLang === 'kg' || appLang === 'uz' || appLang === 'ru') {
      this.legendLang = appLang;
    } else {
      this.legendLang = 'ru';
    }

    this.isTrafficActive = this.trafficOn;
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isMapReady) return;

    if (changes['fromPoint'] || changes['toPoint'] || changes['fromLocation'] || changes['toLocation']) {
      this.updateMarkers();
    }

    if (changes['routes'] || changes['selectedRouteIndex']) {
      this.renderRoutes();
    }

    if (changes['center'] && !this.fromPoint && !this.toPoint) {
      this.dgisMap.setCenter(this.mapId, this.center, this.zoom);
    }

    if (changes['trafficOn'] && changes['trafficOn'].currentValue !== this.isTrafficActive) {
      if (changes['trafficOn'].currentValue) {
        this.dgisMap.showTraffic(this.mapId);
      } else {
        this.dgisMap.hideTraffic(this.mapId);
      }
    }
  }

  ngOnDestroy(): void {
    this.unsubTrafficScore?.();
    this.unsubTrafficVis?.();
    this.resizeObserver?.disconnect();
    this.dgisMap.destroyMap(this.mapId);
    this.isMapReady = false;
  }

  hasRouteOrMarkers(): boolean {
    return !!(this.fromPoint || this.toPoint || (this.routes && this.routes.length > 0));
  }

  hasWalkingSegments(): boolean {
    const activeRoute = this.routes[this.selectedRouteIndex] || this.routes[0];
    return !!(activeRoute && activeRoute.hasWalkingSegments);
  }

  toggleTrafficLayer(): void {
    this.isTrafficActive = this.dgisMap.toggleTraffic(this.mapId);
    this.trafficToggled.emit(this.isTrafficActive);
  }

  toggleLegendCollapse(): void {
    this.isLegendCollapsed = !this.isLegendCollapsed;
  }

  setLegendLang(lang: 'ru' | 'kg' | 'uz', event: MouseEvent): void {
    event.stopPropagation();
    this.legendLang = lang;
  }

  refreshTrafficData(event: MouseEvent): void {
    event.stopPropagation();
    this.isRefreshing = true;
    this.dgisMap.refreshTraffic(this.mapId);
    setTimeout(() => {
      this.isRefreshing = false;
    }, 800);
  }

  getTrafficScoreLabel(score: number | null): string {
    if (score === null || score === undefined) {
      return this.legendLang === 'uz' ? 'Jonli' : (this.legendLang === 'kg' ? 'Түз обо' : 'В эфире');
    }
    const pts = score;
    if (this.legendLang === 'uz') {
      return `${pts} ball`;
    } else if (this.legendLang === 'kg') {
      return `${pts} балл`;
    } else {
      if (pts === 1) return `${pts} балл`;
      if (pts >= 2 && pts <= 4) return `${pts} балла`;
      return `${pts} баллов`;
    }
  }

  getTrafficScoreColor(score: number | null): string {
    if (score === null || score === undefined) return '#10b981';
    if (score <= 3) return '#10b981'; // Green
    if (score <= 5) return '#eab308'; // Yellow
    if (score === 6) return '#f97316'; // Orange
    if (score <= 8) return '#ef4444'; // Red
    return '#991b1b'; // Dark Red
  }

  isLevelActive(scoreRange: string): boolean {
    if (this.trafficScore === null || this.trafficScore === undefined) return false;
    const s = this.trafficScore;
    if (scoreRange === '1–3') return s >= 1 && s <= 3;
    if (scoreRange === '4–5') return s >= 4 && s <= 5;
    if (scoreRange === '6') return s === 6;
    if (scoreRange === '7–8') return s >= 7 && s <= 8;
    if (scoreRange === '9–10') return s >= 9 && s <= 10;
    return false;
  }

  private async initMap(): Promise<void> {
    const el = this.mapContainerRef.nativeElement;

    try {
      const map = await this.dgisMap.createMap(this.mapId, el, {
        center: this.fromPoint || this.center,
        zoom: this.zoom,
        interactive: this.interactive,
        zoomControl: this.interactive ? 'topRight' : false,
        trafficOn: this.trafficOn
      });

      if (this.allowClickToSelect) {
        map.on('click', (e: any) => {
          if (e.lngLat) {
            this.pointSelected.emit({ lat: e.lngLat[1], lng: e.lngLat[0] });
          }
        });
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.dgisMap.invalidateSize(this.mapId);
      });
      this.resizeObserver.observe(el);

      this.isMapReady = true;

      // Subscribe to 2GIS native traffic events
      this.unsubTrafficScore = this.dgisMap.onTrafficScoreChange(this.mapId, score => {
        this.trafficScore = score;
      });

      this.unsubTrafficVis = this.dgisMap.onTrafficVisibilityChange(this.mapId, visible => {
        this.isTrafficActive = visible;
      });

      this.updateMarkers();
      this.renderRoutes();

      setTimeout(() => this.dgisMap.invalidateSize(this.mapId), 200);
    } catch (err) {
      console.error('Failed to initialize 2GIS MapGL:', err);
    }
  }

  /**
   * Fits the map viewport to display the complete route, walking paths, and endpoints.
   */
  fitRouteBounds(): void {
    const allPoints: GeoPoint[] = [];

    const activeRoute = this.routes[this.selectedRouteIndex] || this.routes[0];
    if (activeRoute && activeRoute.geometry) {
      for (const pt of activeRoute.geometry) {
        allPoints.push({ lat: pt[0], lng: pt[1] });
      }
      if (activeRoute.pickupWalking?.geometry) {
        for (const pt of activeRoute.pickupWalking.geometry) {
          allPoints.push({ lat: pt[0], lng: pt[1] });
        }
      }
      if (activeRoute.dropoffWalking?.geometry) {
        for (const pt of activeRoute.dropoffWalking.geometry) {
          allPoints.push({ lat: pt[0], lng: pt[1] });
        }
      }
    }

    if (this.fromPoint) allPoints.push(this.fromPoint);
    if (this.toPoint) allPoints.push(this.toPoint);

    if (allPoints.length > 0) {
      this.dgisMap.fitBounds(this.mapId, allPoints, 65);
    }
  }

  /**
   * Updates Pickup (A, Green) and Destination (B, Red) markers on the 2GIS map.
   */
  private updateMarkers(): void {
    if (!this.isMapReady) return;

    // 1. Pickup Marker (Green A)
    if (this.fromPoint) {
      const street = this.fromLocation?.street
        ? (this.fromLocation.houseNumber ? `${this.fromLocation.street}, ${this.fromLocation.houseNumber}` : this.fromLocation.street)
        : (this.fromLocation?.address?.split(',')[0] || 'Точка отправления');
      const fullAddress = this.fromLocation?.address || `${this.fromPoint.lat.toFixed(5)}, ${this.fromPoint.lng.toFixed(5)}`;

      const html = `
        <div class="marker-svg-wrap">
          <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gradPickup" x1="4" y1="2" x2="32" y2="43" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#059669"/>
              </linearGradient>
            </defs>
            <ellipse cx="18" cy="44" rx="6.5" ry="2" fill="rgba(11,31,68,0.28)"/>
            <path d="M18 43C18 43 32 25.8 32 16C32 8.268 25.732 2 18 2C10.268 2 4 8.268 4 16C4 25.8 18 43 18 43Z" fill="url(#gradPickup)" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="18" cy="16" r="9.5" fill="#ffffff"/>
            <text x="18" y="20.5" font-family="system-ui, sans-serif" font-weight="900" font-size="13" text-anchor="middle" fill="#059669">A</text>
          </svg>
          <div class="tashuu-marker-popup">
            <span class="tashuu-popup-badge tashuu-popup-badge--pickup">Точка А • Подача</span>
            <h4 class="tashuu-popup-street">${street}</h4>
            <p class="tashuu-popup-full-address">${fullAddress}</p>
            <div class="tashuu-popup-coords">
              <span>Координаты:</span>
              <span>${this.fromPoint.lat.toFixed(5)}, ${this.fromPoint.lng.toFixed(5)}</span>
            </div>
          </div>
        </div>
      `;

      this.dgisMap.setHtmlMarker(this.mapId, {
        id: 'pickup-marker',
        point: this.fromPoint,
        html,
        anchor: [18, 43],
        zIndex: 1000
      });
    } else {
      this.dgisMap.removeMarker(this.mapId, 'pickup-marker');
    }

    // 2. Destination Marker (Red B)
    if (this.toPoint) {
      const street = this.toLocation?.street
        ? (this.toLocation.houseNumber ? `${this.toLocation.street}, ${this.toLocation.houseNumber}` : this.toLocation.street)
        : (this.toLocation?.address?.split(',')[0] || 'Точка назначения');
      const fullAddress = this.toLocation?.address || `${this.toPoint.lat.toFixed(5)}, ${this.toPoint.lng.toFixed(5)}`;

      const html = `
        <div class="marker-svg-wrap">
          <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gradDest" x1="4" y1="2" x2="32" y2="43" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ef4444"/>
                <stop offset="100%" stop-color="#dc2626"/>
              </linearGradient>
            </defs>
            <ellipse cx="18" cy="44" rx="6.5" ry="2" fill="rgba(11,31,68,0.28)"/>
            <path d="M18 43C18 43 32 25.8 32 16C32 8.268 25.732 2 18 2C10.268 2 4 8.268 4 16C4 25.8 18 43 18 43Z" fill="url(#gradDest)" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="18" cy="16" r="9.5" fill="#ffffff"/>
            <text x="18" y="20.5" font-family="system-ui, sans-serif" font-weight="900" font-size="13" text-anchor="middle" fill="#dc2626">B</text>
          </svg>
          <div class="tashuu-marker-popup">
            <span class="tashuu-popup-badge tashuu-popup-badge--dest">Точка Б • Назначение</span>
            <h4 class="tashuu-popup-street">${street}</h4>
            <p class="tashuu-popup-full-address">${fullAddress}</p>
            <div class="tashuu-popup-coords">
              <span>Координаты:</span>
              <span>${this.toPoint.lat.toFixed(5)}, ${this.toPoint.lng.toFixed(5)}</span>
            </div>
          </div>
        </div>
      `;

      this.dgisMap.setHtmlMarker(this.mapId, {
        id: 'dest-marker',
        point: this.toPoint,
        html,
        anchor: [18, 43],
        zIndex: 1000
      });
    } else {
      this.dgisMap.removeMarker(this.mapId, 'dest-marker');
    }

    // Auto-fit if both points exist without route
    if (this.fromPoint && this.toPoint && (!this.routes || this.routes.length === 0)) {
      this.dgisMap.fitBounds(this.mapId, [this.fromPoint, this.toPoint], 65);
    } else if (this.fromPoint && !this.toPoint) {
      this.dgisMap.setCenter(this.mapId, this.fromPoint, 15);
    }
  }

  /**
   * Renders 2GIS driving routes, alternatives, and walking segments.
   */
  private renderRoutes(): void {
    if (!this.isMapReady) return;

    this.dgisMap.clearPolylines(this.mapId);
    this.dgisMap.removeMarker(this.mapId, 'vehicle-pickup-marker');
    this.dgisMap.removeMarker(this.mapId, 'vehicle-dropoff-marker');

    if (!this.routes || this.routes.length === 0) {
      return;
    }

    const allRoutePoints: GeoPoint[] = [];

    // 1. Render unselected alternative routes (underneath)
    this.routes.forEach((route, index) => {
      if (index === this.selectedRouteIndex || !route.geometry || route.geometry.length < 2) {
        return;
      }

      const pts: GeoPoint[] = route.geometry.map(p => ({ lat: p[0], lng: p[1] }));
      allRoutePoints.push(...pts);

      const altColor = route.color || (index === 1 ? '#10b981' : index === 2 ? '#f59e0b' : '#8b5cf6');

      this.dgisMap.setPolyline(this.mapId, {
        id: `alt-route-${index}`,
        points: pts,
        color: altColor,
        width: 5,
        onClick: () => {
          this.routeSelected.emit(index);
        }
      });
    });

    // 2. Render selected active route with glowing underlay and main thick vibrant line
    const selectedRoute = this.routes[this.selectedRouteIndex] || this.routes[0];
    if (selectedRoute && selectedRoute.geometry && selectedRoute.geometry.length >= 2) {
      const pts: GeoPoint[] = selectedRoute.geometry.map(p => ({ lat: p[0], lng: p[1] }));
      allRoutePoints.push(...pts);

      // Glowing underlay
      this.dgisMap.setPolyline(this.mapId, {
        id: 'selected-route-glow',
        points: pts,
        color: '#2f6bff55',
        width: 14
      });

      // Main thick solid blue line
      this.dgisMap.setPolyline(this.mapId, {
        id: 'selected-route-main',
        points: pts,
        color: '#2f6bff',
        width: 6.5
      });
    }

    // 3. Render walking segments for selected route (dark-gray dashed line)
    if (selectedRoute?.pickupWalking?.geometry && selectedRoute.pickupWalking.geometry.length >= 2) {
      const walkPts: GeoPoint[] = selectedRoute.pickupWalking.geometry.map(p => ({ lat: p[0], lng: p[1] }));
      allRoutePoints.push(...walkPts);

      this.dgisMap.setPolyline(this.mapId, {
        id: 'walk-pickup-line',
        points: walkPts,
        color: '#1e293b',
        width: 4,
        dashed: true,
        dashLength: 8,
        gapLength: 8
      });
    }

    if (selectedRoute?.dropoffWalking?.geometry && selectedRoute.dropoffWalking.geometry.length >= 2) {
      const walkPts: GeoPoint[] = selectedRoute.dropoffWalking.geometry.map(p => ({ lat: p[0], lng: p[1] }));
      allRoutePoints.push(...walkPts);

      this.dgisMap.setPolyline(this.mapId, {
        id: 'walk-dropoff-line',
        points: walkPts,
        color: '#1e293b',
        width: 4,
        dashed: true,
        dashLength: 8,
        gapLength: 8
      });
    }

    // 4. Render vehicle pickup & drop-off stop badges when walking access is required
    if (selectedRoute?.vehiclePickupPoint) {
      const vPt = selectedRoute.vehiclePickupPoint;
      allRoutePoints.push(vPt);

      const html = `
        <div class="vehicle-stop-badge vehicle-stop-badge--pickup">
          <svg class="stop-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          <span>Посадка в авто</span>
          <div class="tashuu-marker-popup">
            <span class="tashuu-popup-badge tashuu-popup-badge--car">🚗 Место посадки</span>
            <h4 class="tashuu-popup-street">Остановка автомобиля</h4>
            <p class="tashuu-popup-full-address">Автомобиль будет ожидать вас здесь у дороги.</p>
          </div>
        </div>
      `;

      this.dgisMap.setHtmlMarker(this.mapId, {
        id: 'vehicle-pickup-marker',
        point: vPt,
        html,
        anchor: [60, 36],
        zIndex: 900
      });
    }

    if (selectedRoute?.vehicleDropoffPoint) {
      const vPt = selectedRoute.vehicleDropoffPoint;
      allRoutePoints.push(vPt);

      const html = `
        <div class="vehicle-stop-badge vehicle-stop-badge--dropoff">
          <svg class="stop-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          <span>Высадка из авто</span>
          <div class="tashuu-marker-popup">
            <span class="tashuu-popup-badge tashuu-popup-badge--car">🚗 Место высадки</span>
            <h4 class="tashuu-popup-street">Остановка автомобиля</h4>
            <p class="tashuu-popup-full-address">Пункт назначения в пешеходной зоне. Автомобиль высадит вас здесь.</p>
          </div>
        </div>
      `;

      this.dgisMap.setHtmlMarker(this.mapId, {
        id: 'vehicle-dropoff-marker',
        point: vPt,
        html,
        anchor: [60, 36],
        zIndex: 900
      });
    }

    // Auto-fit bounds
    if (allRoutePoints.length > 0) {
      if (this.fromPoint) allRoutePoints.push(this.fromPoint);
      if (this.toPoint) allRoutePoints.push(this.toPoint);
      this.dgisMap.fitBounds(this.mapId, allRoutePoints, 65);
    }
  }
}
