import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (!isAuthShell()) {
      <app-navbar />
    }
    <main [class]="isAuthShell() ? 'auth-shell' : 'app-shell'">
      <div [class]="isAuthShell() ? '' : 'container'">
        <router-outlet />
      </div>
    </main>
  `
})
export class AppComponent {
  private router = inject(Router);

  isAuthShell = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => this.isAuthPath(e.urlAfterRedirects)),
      startWith(this.isAuthPath(this.router.url))
    ),
    { initialValue: this.isAuthPath(this.router.url) }
  );

  private isAuthPath(url: string): boolean {
    const path = url.split('?')[0];
    return path === '/login'
      || path.startsWith('/register/');
  }
}
