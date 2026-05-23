import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicNavbarComponent } from '../public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../public-footer/public-footer.component';

/**
 * Public site: fixed navbar + one native scroll surface (<main>) + Angular RouterOutlet.
 * Avoids ion-content shadow scroll + ion-router-outlet .ion-page stacking (blank/clipped UI).
 * Root app still uses ion-router-outlet to host this layout.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <div class="public-layout">
      <app-public-navbar [mainScrollTop]="mainScrollTop" />
      <main class="public-main" (scroll)="onMainScroll($event)">
        <router-outlet />
        <app-public-footer />
      </main>
    </div>
  `,
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {
  mainScrollTop = 0;

  onMainScroll(ev: Event): void {
    const el = ev.target;
    this.mainScrollTop = el instanceof HTMLElement ? el.scrollTop : 0;
  }
}
