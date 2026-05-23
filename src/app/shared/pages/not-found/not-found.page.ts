import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, IonIcon],
  template: `
    <section class="not-found">
      <div class="not-found__card">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <a class="btn-primary" routerLink="/public">Back to Home</a>
      </div>
    </section>
  `,
  styleUrl: './not-found.page.scss'
})
export class NotFoundPage {}
