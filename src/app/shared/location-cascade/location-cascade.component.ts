import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { District, Region } from '../../core/models/models';
import { CatalogLabelPipe } from '../pipes/catalog-label.pipe';

@Component({
  selector: 'app-location-cascade',
  standalone: true,
  imports: [FormsModule, TranslatePipe, CatalogLabelPipe],
  template: `
    <label class="field">
      <span class="field__label">{{ 'LOCATION.REGION' | translate }}</span>
      <select [ngModel]="regionId" (ngModelChange)="onRegionChange($event)" [disabled]="disabled">
        <option value="">{{ 'LOCATION.REGION_PLACEHOLDER' | translate }}</option>
        @for (r of regions; track r.id) {
          <option [value]="r.id">{{ r.name | catalogLabel:'region' }}</option>
        }
      </select>
    </label>

    <label class="field">
      <span class="field__label">{{ 'LOCATION.DISTRICT' | translate }}</span>
      <select
        [ngModel]="districtId"
        (ngModelChange)="onDistrictChange($event)"
        [disabled]="disabled || !regionId"
        [required]="required"
      >
        <option value="">{{ 'LOCATION.DISTRICT_PLACEHOLDER' | translate }}</option>
        @for (d of districts; track d.id) {
          <option [value]="d.id">{{ d.name | catalogLabel:'district' }}</option>
        }
      </select>
    </label>
  `
})
export class LocationCascadeComponent implements OnInit, OnChanges {
  private api = inject(ApiService);

  @Input() districtId = '';
  @Input() required = false;
  @Input() disabled = false;
  @Output() districtIdChange = new EventEmitter<string>();

  regions: Region[] = [];
  districts: District[] = [];
  regionId = '';

  ngOnInit(): void {
    this.api.getRegions().pipe(catchError(() => of([] as Region[]))).subscribe(regions => {
      this.regions = regions;
      if (this.districtId) this.hydrateFromDistrict(this.districtId);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['districtId'] && this.districtId && this.regions.length) {
      this.hydrateFromDistrict(this.districtId);
    }
  }

  onRegionChange(regionId: string): void {
    this.regionId = regionId;
    this.districtId = '';
    this.districtIdChange.emit('');
    this.loadDistricts();
  }

  onDistrictChange(districtId: string): void {
    this.districtId = districtId;
    this.districtIdChange.emit(districtId);
  }

  private hydrateFromDistrict(districtId: string): void {
    this.api.getDistricts().pipe(catchError(() => of([] as District[]))).subscribe(all => {
      const district = all.find(d => d.id === districtId);
      if (!district) return;
      this.regionId = district.regionId;
      this.districtId = district.id;
      this.api.getDistricts(this.regionId).pipe(catchError(() => of([] as District[]))).subscribe(list => {
        this.districts = list;
      });
    });
  }

  private loadDistricts(): void {
    if (!this.regionId) {
      this.districts = [];
      return;
    }
    this.api.getDistricts(this.regionId)
      .pipe(catchError(() => of([] as District[])))
      .subscribe(districts => this.districts = districts);
  }
}
