import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  gridOutline,
  logOutOutline,
  medkitOutline,
  medicalOutline,
  personOutline
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastController } from '@ionic/angular/standalone';
import { NavItem } from '../../../../core/models';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';
import { PatientDocumentsService } from '../../../../core/services/patient-documents.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SidebarComponent } from '../../../admin/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../admin/components/topbar/topbar.component';
import { PATIENT_NAV_ITEMS } from '../../patient.routes';


@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SidebarComponent, TopbarComponent],
  template: `
    <div class="portal-layout">
      <app-admin-sidebar
          class="portal-layout__sidebar"
          [class.is-open]="sidebarOpen"
          [navItems]="navItems"
          [portalLabel]="portalLabel"
          [clinicName]="clinicName"
          [currentUser]="currentUser()"
          [isOpen]="sidebarOpen"
          (navClick)="closeSidebar()"
          (logout)="logout()"
      ></app-admin-sidebar>

      <div class="main-content">
        <app-admin-topbar
          [title]="pageTitle"
          [portalLabel]="portalLabel"
          [currentUser]="currentUser()"
          [unreadCount]="unreadCount()"
          (menuToggle)="openSidebar()"
          (logout)="logout()"
        ></app-admin-topbar>

        <main class="page-content">
          <div class="patient-quick-action">
            <div>
              <div class="patient-quick-action__eyebrow">Patient Documents</div>
              <div class="patient-quick-action__title">Download all clinical records</div>
              <div class="patient-quick-action__subtitle">
                One PDF with completed consultations, prescriptions, and follow-up notes.
              </div>
              <div class="patient-quick-action__links">
                <a routerLink="/patient/documents" class="btn-ghost">My Documents</a>
                <a routerLink="/patient/lab-results" class="btn-ghost">My Lab Results</a>
              </div>
            </div>
            <button
              type="button"
              class="btn-primary patient-quick-action__button"
              [disabled]="downloadingClinicalRecords"
              (click)="downloadAllClinicalRecords()"
            >
              {{ downloadingClinicalRecords ? 'Preparing PDF...' : 'Download All Clinical Records' }}
            </button>
          </div>
          <router-outlet></router-outlet>
        </main>
      </div>

      <div
        class="sidebar-overlay"
        [class.is-visible]="sidebarOpen"
        (click)="closeSidebar()"
        aria-hidden="true"
      ></div>
    </div>
  `,
  styleUrl: './patient-layout.component.scss'
})
export class PatientLayoutComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly patientDocuments = inject(PatientDocumentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastCtrl = inject(ToastController);

  readonly currentUser = this.authState.currentUser;
  readonly unreadCount = this.notificationService.unreadCount;

  clinicName = '';
  portalLabel = 'Patient Portal';
  portalTitle = 'Dashboard';
  pageTitle = 'Dashboard';
  navItems: NavItem[] = PATIENT_NAV_ITEMS;
  sidebarOpen = false;
  downloadingClinicalRecords = false;

  constructor() {
    addIcons({
      gridOutline,
      calendarOutline,
      documentTextOutline,
      medicalOutline,
      medkitOutline,
      personOutline,
      logOutOutline
    });
  }

  ngOnInit(): void {
    this.clinicName = this.clinicSettingsService.load().clinicName;
    this.updatePageTitle();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updatePageTitle());
  }

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authState.logout();
  }

  downloadAllClinicalRecords(): void {
    if (this.downloadingClinicalRecords) {
      return;
    }

    this.downloadingClinicalRecords = true;
    this.patientDocuments.downloadAllClinicalRecordsPdf().subscribe({
      next: (blob) => {
        this.saveBlob(blob, `clinical-records-${new Date().toISOString().slice(0, 10)}.pdf`);
        this.downloadingClinicalRecords = false;
      },
      error: () => {
        this.downloadingClinicalRecords = false;
        void this.showToast('Document not available yet.');
      }
    });
  }

  private updatePageTitle(): void {
    const route = this.getDeepestChild(this.route);
    this.pageTitle = (route.snapshot.data['title'] as string | undefined) ?? this.portalTitle;
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color: 'dark',
      position: 'bottom'
    });
    await toast.present();
  }
}
