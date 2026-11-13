import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { CargoType } from '../../../core/models/models';

@Component({
  selector: 'app-admin-cargo-types',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="page-kicker">{{ 'NAV.CARGO_TYPES' | translate }}</p>
          <h1 class="page-title">{{ 'ADMIN.CARGO_TYPES' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.TYPES_SUBTITLE' | translate }}</p>
        </div>
      </header>

      <div class="split-layout split-layout--equal">
        <div class="panel">
          <div class="panel-stack">
            <h2 class="panel__title">{{ 'ADMIN.CARGO_TYPES' | translate }}</h2>
            <div class="panel-stack__list panel-stack__list--grow">
              @for (t of types; track t.id) {
                <div class="list-item">
                  <div class="list-item__main">
                    <p class="list-item__title">{{ t.name }}</p>
                    <p class="list-item__sub">{{ 'ADMIN.SORT_ORDER' | translate }}: {{ t.sortOrder }}</p>
                  </div>
                  <div class="list-item__actions">
                    <span class="badge" [class]="t.isActive ? 'badge--active' : 'badge--inactive'">
                      {{ (t.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                    </span>
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="edit(t)"
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
          </div>
        </div>

        <div class="panel">
          <div class="panel-stack">
            <h2 class="panel__title">{{ (editingId ? 'COMMON.EDIT' : 'ADMIN.ADD') | translate }}</h2>
            <div class="panel-stack__form panel-stack__form--plain">
              <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
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
                  <button class="btn btn--xs" type="submit" [disabled]="form.invalid">{{ 'COMMON.SAVE' | translate }}</button>
                  @if (editingId) {
                    <button type="button" class="btn btn--ghost btn--xs" (click)="resetForm()">{{ 'COMMON.CANCEL' | translate }}</button>
                  }
                </div>
              </form>
              @if (message) { <p class="success-msg">{{ message }}</p> }
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class AdminCargoTypesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private language = inject(LanguageService);
  types: CargoType[] = [];
  editingId: string | null = null;
  message = '';

  form = this.fb.group({
    name: ['', Validators.required],
    sortOrder: [0],
    isActive: [true]
  });

  ngOnInit(): void {
    this.reload();
  }

  edit(t: CargoType): void {
    this.editingId = t.id;
    this.form.patchValue({ name: t.name, sortOrder: t.sortOrder, isActive: t.isActive });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ sortOrder: 0, isActive: true });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.api.upsertCargoType(this.editingId, this.form.getRawValue()).subscribe({
      next: () => {
        this.message = this.language.instant('COMMON.SAVE');
        this.resetForm();
        this.reload();
      }
    });
  }

  private reload(): void {
    this.api.getAllCargoTypes().subscribe(t => this.types = t);
  }
}
