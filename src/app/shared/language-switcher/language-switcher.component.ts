import { UpperCasePipe } from '@angular/common';
import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { AppLanguage } from '../../core/i18n/languages';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslatePipe, UpperCasePipe],
  template: `
    <div class="lang-dd" [class.lang-dd--open]="open">
      <button
        type="button"
        class="lang-dd__trigger"
        (click)="toggle($event)"
        [attr.aria-expanded]="open"
        [attr.aria-label]="'COMMON.SETTINGS' | translate"
      >
        <span class="lang-dd__code">{{ language.current() | uppercase }}</span>
        <span class="lang-dd__name">{{ ('LANG.' + language.current().toUpperCase()) | translate }}</span>
        <svg class="lang-dd__chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      @if (open) {
        <ul class="lang-dd__menu" role="listbox">
          @for (lang of language.languages; track lang) {
            <li>
              <button
                type="button"
                class="lang-dd__option"
                role="option"
                [attr.aria-selected]="language.current() === lang"
                [class.lang-dd__option--active]="language.current() === lang"
                (click)="select(lang, $event)"
              >
                <span class="lang-dd__code">{{ lang | uppercase }}</span>
                <span>{{ ('LANG.' + lang.toUpperCase()) | translate }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }

    .lang-dd { position: relative; }

    .lang-dd__trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0;
      width: auto;
      min-height: 2.35rem;
      padding: 0.4rem 0.7rem 0.4rem 0.65rem;
      border: 1.5px solid #d7deea;
      border-radius: 0.7rem;
      background: #fff;
      color: #0b1f44;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 39, 73, 0.04);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .lang-dd__trigger:hover {
      border-color: #b8c4d8;
    }

    .lang-dd--open .lang-dd__trigger {
      border-color: var(--tashuu-accent, #2f6bff);
      box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.14);
    }

    .lang-dd__code {
      display: inline-grid;
      place-items: center;
      min-width: 1.7rem;
      height: 1.35rem;
      padding: 0 0.3rem;
      border-radius: 0.35rem;
      background: rgba(47, 107, 255, 0.1);
      color: var(--tashuu-accent, #2f6bff);
      font-size: 0.68rem;
      font-weight: 750;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .lang-dd__name {
      max-width: 6.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lang-dd__chevron {
      flex-shrink: 0;
      opacity: 0.65;
      transition: transform 0.15s ease;
    }

    .lang-dd--open .lang-dd__chevron {
      transform: rotate(180deg);
    }

    .lang-dd__menu {
      position: absolute;
      top: calc(100% + 0.35rem);
      right: 0;
      z-index: 40;
      margin: 0;
      padding: 0.35rem;
      min-width: 100%;
      list-style: none;
      background: #fff;
      border: 1px solid #e4eaf3;
      border-radius: 0.75rem;
      box-shadow: 0 12px 28px rgba(15, 39, 73, 0.14);
      animation: lang-pop 0.14s ease-out;
    }

    .lang-dd__option {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      margin: 0;
      padding: 0.55rem 0.65rem;
      border: none;
      border-radius: 0.55rem;
      background: transparent;
      color: #0b1f44;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 550;
      text-align: left;
      cursor: pointer;
    }

    .lang-dd__option:hover {
      background: #f3f6fb;
    }

    .lang-dd__option--active {
      background: rgba(47, 107, 255, 0.1);
      color: var(--tashuu-accent, #2f6bff);
      font-weight: 700;
    }

    :host-context(.navbar) .lang-dd__trigger {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: none;
    }

    :host-context(.navbar) .lang-dd__trigger:hover {
      border-color: rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.14);
    }

    :host-context(.navbar) .lang-dd--open .lang-dd__trigger {
      border-color: rgba(47, 107, 255, 0.55);
      box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.18);
    }

    :host-context(.navbar) .lang-dd__code {
      background: rgba(47, 107, 255, 0.25);
      color: #9db8ff;
    }

    @media (max-width: 720px) {
      .lang-dd__name {
        display: none;
      }

      .lang-dd__trigger {
        min-height: 2.15rem;
        padding: 0.3rem 0.45rem;
        gap: 0.3rem;
      }

      :host-context(.navbar) .lang-dd__trigger {
        min-height: 2.15rem;
      }
    }

    @keyframes lang-pop {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LanguageSwitcherComponent {
  language = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);
  open = false;

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  select(lang: AppLanguage, event: MouseEvent): void {
    event.stopPropagation();
    this.language.use(lang);
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }
}
