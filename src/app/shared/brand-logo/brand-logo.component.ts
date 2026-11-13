import { Component, Input } from '@angular/core';

export type BrandLogoTone = 'onDark' | 'onLight';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  template: `
    <img
      class="brand-logo"
      [class.brand-logo--sm]="size === 'sm'"
      [class.brand-logo--md]="size === 'md'"
      [class.brand-logo--lg]="size === 'lg'"
      [class.brand-logo--hero]="size === 'hero'"
      [class.brand-logo--flush]="flush"
      [class.brand-logo--on-dark]="tone === 'onDark'"
      [class.brand-logo--on-light]="tone === 'onLight'"
      [src]="src"
      alt="Tashuu"
    />
  `,
  styles: [`
    :host {
      display: inline-flex;
      line-height: 0;
    }

    .brand-logo {
      display: block;
      width: auto;
      height: auto;
      object-fit: contain;
      background: transparent;
    }

    .brand-logo--sm {
      height: 3.15rem;
      width: auto;
      max-width: 7rem;
    }

    .brand-logo--md {
      width: 5.75rem;
    }

    .brand-logo--lg {
      width: min(100%, 11.5rem);
    }

    .brand-logo--hero {
      width: min(100%, 14rem);
    }

    .brand-logo--flush {
      border-radius: 0;
      box-shadow: none;
      padding: 0;
    }
  `]
})
export class BrandLogoComponent {
  @Input() size: 'sm' | 'md' | 'lg' | 'hero' = 'md';
  @Input() tone: BrandLogoTone = 'onDark';
  @Input() flush = false;

  get src(): string {
    return this.tone === 'onLight'
      ? 'assets/images/logotip/logotip_tashuu_on_light.svg'
      : 'assets/images/logotip/logotip_tashuu_wb.png';
  }
}
