import { Directive, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Allows only digit characters (0-9) in the host input. */
@Directive({
  selector: 'input[appDigitsOnly]',
  standalone: true
})
export class DigitsOnlyDirective {
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
    ];
    if (allowed.includes(event.key)) return;
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D+/g, '');
    if (input.value === digits) return;

    const control = this.ngControl?.control;
    if (control) {
      control.setValue(digits, { emitEvent: true });
    } else {
      input.value = digits;
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D+/g, '');
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = (input.value.slice(0, start) + digits + input.value.slice(end)).replace(/\D+/g, '');
    const control = this.ngControl?.control;
    if (control) {
      control.setValue(next, { emitEvent: true });
    } else {
      input.value = next;
    }
  }
}
