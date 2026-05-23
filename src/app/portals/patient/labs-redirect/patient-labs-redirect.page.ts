import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-patient-labs-redirect-page',
  template: ''
})
export class PatientLabsRedirectPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    void this.router.navigate(['/patient/lab-results'], {
      queryParams: this.route.snapshot.queryParams,
      replaceUrl: true
    });
  }
}
