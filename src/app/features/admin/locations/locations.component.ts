import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { District, Region } from '../../../core/models/models';

@Component({
  selector: 'app-admin-locations',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'NAV.LOCATIONS' | translate }}</p>
          <h1 class="page-title">{{ 'ADMIN.LOCATIONS' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.LOCATIONS_SUBTITLE' | translate }}</p>
        </div>
      </header>

      <div class="split-layout split-layout--equal">
        <div class="panel">
          <div class="panel-stack">
            <h2 class="panel__title">{{ 'LOCATION.REGION' | translate }}</h2>
            <div class="panel-stack__list">
              @for (r of regions; track r.id) {
                <div class="list-item">
                  <div class="list-item__main">
                    <p class="list-item__title">{{ r.name }}</p>
                    <p class="list-item__sub">
                      {{ r.slug }} · {{ 'ADMIN.SORT_ORDER' | translate }}: {{ r.sortOrder }}
                      @if (r.isRepublicanCity) { · {{ 'ADMIN.REPUBLICAN_CITY' | translate }} }
                    </p>
                  </div>
                  <div class="list-item__actions">
                    <span class="badge" [class]="r.isActive ? 'badge--active' : 'badge--inactive'">
                      {{ (r.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                    </span>
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="editRegion(r)"
                      [attr.title]="'COMMON.EDIT' | translate"
                      [attr.aria-label]="'COMMON.EDIT' | translate"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/>
                        <path d="M13.5 6.5l3 3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
            <div class="panel-stack__form">
              <h2 class="panel__title">{{ (editingRegionId ? 'COMMON.EDIT' : 'ADMIN.ADD') | translate }} — {{ 'LOCATION.REGION' | translate }}</h2>
              <form class="form-grid" [formGroup]="regionForm" (ngSubmit)="submitRegion()">
                <label class="field">
                  <span class="field__label">{{ 'ADMIN.NAME' | translate }}</span>
                  <input formControlName="name" />
                </label>
                <label class="field">
                  <span class="field__label">{{ 'ADMIN.SORT_ORDER' | translate }}</span>
                  <input formControlName="sortOrder" type="number" />
                </label>
                <label class="field field--check">
                  <input type="checkbox" formControlName="isRepublicanCity" />
                  <span class="field__label">{{ 'ADMIN.REPUBLICAN_CITY' | translate }}</span>
                </label>
                <label class="field field--check">
                  <input type="checkbox" formControlName="isActive" />
                  <span class="field__label">{{ 'COMMON.ACTIVE' | translate }}</span>
                </label>
                <div class="form-actions">
                  <button class="btn btn--xs" type="submit" [disabled]="regionForm.invalid">{{ 'COMMON.SAVE' | translate }}</button>
                  @if (editingRegionId) {
                    <button type="button" class="btn btn--ghost btn--xs" (click)="resetRegionForm()">{{ 'COMMON.CANCEL' | translate }}</button>
                  }
                </div>
              </form>
              @if (regionMessage) { <p class="success-msg">{{ regionMessage }}</p> }
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-stack">
            <div class="panel__toolbar" style="display:flex;justify-content:space-between;align-items:center;gap:1rem">
              <h2 class="panel__title" style="margin:0">{{ 'LOCATION.DISTRICT' | translate }}</h2>
              <label class="field" style="margin:0;min-width:10rem">
                <select [value]="districtFilterRegionId" (change)="onDistrictFilterChange($event)">
                  <option value="">{{ 'ADMIN.ALL_REGIONS' | translate }}</option>
                  @for (r of regions; track r.id) {
                    <option [value]="r.id">{{ r.name }}</option>
                  }
                </select>
              </label>
            </div>
            <div class="panel-stack__list">
              @for (d of filteredDistricts; track d.id) {
                <div class="list-item">
                  <div class="list-item__main">
                    <p class="list-item__title">{{ d.name }}</p>
                    <p class="list-item__sub">
                      {{ d.regionName }} · {{ 'ADMIN.SORT_ORDER' | translate }}: {{ d.sortOrder }}
                    </p>
                  </div>
                  <div class="list-item__actions">
                    <span class="badge" [class]="d.isActive ? 'badge--active' : 'badge--inactive'">
                      {{ (d.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                    </span>
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="editDistrict(d)"
                      [attr.title]="'COMMON.EDIT' | translate"
                      [attr.aria-label]="'COMMON.EDIT' | translate"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/>
                        <path d="M13.5 6.5l3 3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
            <div class="panel-stack__form">
              <h2 class="panel__title">{{ (editingDistrictId ? 'COMMON.EDIT' : 'ADMIN.ADD') | translate }} — {{ 'LOCATION.DISTRICT' | translate }}</h2>
              <form class="form-grid" [formGroup]="districtForm" (ngSubmit)="submitDistrict()">
                <label class="field">
                  <span class="field__label">{{ 'LOCATION.REGION' | translate }}</span>
                  <select formControlName="regionId">
                    <option value="">{{ 'LOCATION.REGION_PLACEHOLDER' | translate }}</option>
                    @for (r of regions; track r.id) {
                      <option [value]="r.id">{{ r.name }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span class="field__label">{{ 'ADMIN.NAME' | translate }}</span>
                  <input formControlName="name" />
                </label>
                <label class="field">
                  <span class="field__label">{{ 'ADMIN.SORT_ORDER' | translate }}</span>
                  <input formControlName="sortOrder" type="number" />
                </label>
                <label class="field field--check">
                  <input type="checkbox" formControlName="isActive" />
                  <span class="field__label">{{ 'COMMON.ACTIVE' | translate }}</span>
                </label>
                <div class="form-actions">
                  <button class="btn btn--xs" type="submit" [disabled]="districtForm.invalid">{{ 'COMMON.SAVE' | translate }}</button>
                  @if (editingDistrictId) {
                    <button type="button" class="btn btn--ghost btn--xs" (click)="resetDistrictForm()">{{ 'COMMON.CANCEL' | translate }}</button>
                  }
                </div>
              </form>
              @if (districtMessage) { <p class="success-msg">{{ districtMessage }}</p> }
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class AdminLocationsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private language = inject(LanguageService);

  regions: Region[] = [];
  districts: District[] = [];
  districtFilterRegionId = '';
  editingRegionId: string | null = null;
  editingDistrictId: string | null = null;
  regionMessage = '';
  districtMessage = '';

  regionForm = this.fb.group({
    name: ['', Validators.required],
    sortOrder: [0],
    isRepublicanCity: [false],
    isActive: [true]
  });

  districtForm = this.fb.group({
    regionId: ['', Validators.required],
    name: ['', Validators.required],
    sortOrder: [0],
    isActive: [true]
  });

  get filteredDistricts(): District[] {
    if (!this.districtFilterRegionId) return this.districts;
    return this.districts.filter(d => d.regionId === this.districtFilterRegionId);
  }

  ngOnInit(): void {
    this.reload();
  }

  onDistrictFilterChange(event: Event): void {
    this.districtFilterRegionId = (event.target as HTMLSelectElement).value;
  }

  editRegion(r: Region): void {
    this.editingRegionId = r.id;
    this.regionForm.patchValue({
      name: r.name,
      sortOrder: r.sortOrder,
      isRepublicanCity: r.isRepublicanCity,
      isActive: r.isActive
    });
  }

  resetRegionForm(): void {
    this.editingRegionId = null;
    this.regionForm.reset({ sortOrder: 0, isRepublicanCity: false, isActive: true });
  }

  submitRegion(): void {
    if (this.regionForm.invalid) return;
    const v = this.regionForm.getRawValue();
    this.api.upsertRegion(this.editingRegionId, {
      name: v.name,
      sortOrder: v.sortOrder ?? 0,
      isRepublicanCity: !!v.isRepublicanCity,
      isActive: !!v.isActive,
      countryCode: 'KG'
    }).subscribe({
      next: () => {
        this.regionMessage = this.language.instant('COMMON.SAVE');
        this.resetRegionForm();
        this.reload();
      }
    });
  }

  editDistrict(d: District): void {
    this.editingDistrictId = d.id;
    this.districtForm.patchValue({
      regionId: d.regionId,
      name: d.name,
      sortOrder: d.sortOrder,
      isActive: d.isActive
    });
  }

  resetDistrictForm(): void {
    this.editingDistrictId = null;
    this.districtForm.reset({ regionId: '', sortOrder: 0, isActive: true });
  }

  submitDistrict(): void {
    if (this.districtForm.invalid) return;
    const v = this.districtForm.getRawValue();
    this.api.upsertDistrict(this.editingDistrictId, {
      regionId: v.regionId,
      name: v.name,
      sortOrder: v.sortOrder ?? 0,
      isActive: !!v.isActive
    }).subscribe({
      next: () => {
        this.districtMessage = this.language.instant('COMMON.SAVE');
        this.resetDistrictForm();
        this.reload();
      }
    });
  }

  private reload(): void {
    this.api.getAllRegions().subscribe(r => this.regions = r);
    this.api.getAllDistricts().subscribe(d => this.districts = d);
  }
}
