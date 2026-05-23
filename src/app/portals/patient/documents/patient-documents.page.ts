import { Component } from '@angular/core';
import { PatientMediaPanelComponent } from '../../../shared/components/patient-media-panel/patient-media-panel.component';

@Component({
  standalone: true,
  selector: 'app-patient-documents-page',
  imports: [PatientMediaPanelComponent],
  template: `
    <section class="documents-page">
      <app-patient-media-panel
        kind="document"
        heading="Uploaded Documents"
        subheading="Choose a file, link it to a booking, then preview uploaded images or download files when needed."
      ></app-patient-media-panel>
    </section>
  `,
  styleUrl: './patient-documents.page.scss'
})
export class PatientDocumentsPage {}
