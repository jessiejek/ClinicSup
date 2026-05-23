import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs/operators';
import { BookingWizardService } from '../../../core/services/booking-wizard.service';
import { PublicService } from '../services/public.service';
import { BookingWizardComponent } from '../components/booking-wizard/booking-wizard.component';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [IonContent, BookingWizardComponent],
  template: `
    <ion-content #scrollContainer>
      <div class="booking-page-container page-enter">
        <app-booking-wizard></app-booking-wizard>
      </div>
    </ion-content>
  `,
  styleUrl: './booking.page.scss'
})
export class BookingPage implements OnInit {
  private readonly wizardService = inject(BookingWizardService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('scrollContainer', { static: true }) private content!: IonContent;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => ({
          doctorId: params.get('doctorId'),
          serviceId: params.get('serviceId')
        })),
        distinctUntilChanged((prev, next) => prev.doctorId === next.doctorId && prev.serviceId === next.serviceId),
        switchMap(({ doctorId, serviceId }) => {
          if (doctorId || !serviceId) {
            return of({ doctorId, serviceId });
          }

          return this.publicService.getServices().pipe(
            map((services) => ({
              doctorId: services.find((item) => item.id === serviceId)?.doctorIds[0] ?? null,
              serviceId
            })),
            catchError(() => of({ doctorId: null, serviceId }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ doctorId, serviceId }) => {
        this.wizardService.reset();

        if (doctorId) {
          this.wizardService.selectDoctor(doctorId);
        }

        if (serviceId) {
          this.wizardService.selectService(serviceId);
        }
      });

    this.wizardService.currentStep$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.content.scrollToTop(300);
      });
  }
}
