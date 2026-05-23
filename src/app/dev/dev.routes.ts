import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  {
    path: 'gallery',
    loadComponent: () =>
      import('./design-system-gallery/design-system-gallery.page').then(
        (m) => m.DesignSystemGalleryPage
      )
  },
  { path: '', pathMatch: 'full', redirectTo: 'gallery' }
];
