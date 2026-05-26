import { AsyncPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostBinding,
  Input,
  OnInit,
  inject
} from '@angular/core';
import { ActivatedRoute, ActivationEnd, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowBackOutline,
  cashOutline,
  calendarNumberOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  closeOutline,
  createOutline,
  documentTextOutline,
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  gridOutline,
  listOutline,
  logOutOutline,
  medicalOutline,
  megaphoneOutline,
  menuOutline,
  notificationsOutline,
  peopleOutline,
  personAddOutline,
  personCircleOutline,
  personRemoveOutline,
  personOutline,
  pricetagOutline,
  refreshOutline,
  searchOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  statsChartOutline,
  timeOutline,
  toggleOutline,
  walkOutline,
  warningOutline
} from 'ionicons/icons';
import { NavItem } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../../core/services/clinic-settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RealtimeInitService } from '../../../core/services/realtime-init.service';
import { SidebarComponent } from '../../../portals/admin/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../portals/admin/components/topbar/topbar.component';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="portal-layout" [style.--portal-accent]="portalColor">
      <app-admin-sidebar
          class="portal-layout__sidebar"
          [class.is-open]="sidebarOpen"
          [navItems]="resolvedNavItems"
          [portalLabel]="portalLabel"
          [clinicName]="clinicName"
          [currentUser]="currentUser$ | async"
          [isOpen]="sidebarOpen"
          (navClick)="closeSidebar()"
          (menuToggle)="toggleSidebar()"
          (logout)="logout()"
      ></app-admin-sidebar>

      <div class="portal-layout__main">
        <app-admin-topbar
          [title]="pageTitle"
          [portalLabel]="portalLabel"
          [currentUser]="currentUser$ | async"
          [unreadCount]="(unreadCount$ | async) ?? 0"
          (menuToggle)="toggleSidebar()"
          (logout)="logout()"
        ></app-admin-topbar>

        <main class="main-content">
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
  styleUrl: './portal-layout.component.scss'
})
export class PortalLayoutComponent implements OnInit {
  @Input() navItems: NavItem[] = [];
  @Input() portalTitle = 'Dashboard';
  @Input() portalLabel = 'Admin Portal';
  @Input() portalColor = 'var(--ion-color-primary)';

  @HostBinding('style.display') readonly display = 'block';

  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(NotificationService);

  readonly currentUser$ = this.authState.currentUser$;
  readonly unreadCount$ = this.notificationService.unreadCount$;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtimeInit = inject(RealtimeInitService);

  clinicName = '';
  pageTitle = 'Dashboard';
  resolvedNavItems: NavItem[] = [];
  sidebarOpen = false;

  constructor() {
    addIcons({
      alertCircleOutline,
      arrowBackOutline,
      cashOutline,
      calendarNumberOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      closeOutline,
      createOutline,
      documentTextOutline,
      ellipsisVertical,
      eyeOffOutline,
      eyeOutline,
      gridOutline,
      listOutline,
      logOutOutline,
      medicalOutline,
      megaphoneOutline,
      menuOutline,
      notificationsOutline,
      peopleOutline,
      personAddOutline,
      personCircleOutline,
      personRemoveOutline,
      personOutline,
      pricetagOutline,
      refreshOutline,
      searchOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      statsChartOutline,
      timeOutline,
      toggleOutline,
      walkOutline,
      warningOutline
    });
  }

  ngOnInit(): void {
    this.clinicName = this.clinicSettingsService.load().clinicName;
    this.resolvedNavItems = (this.route.snapshot.data['navItems'] as NavItem[]) ?? this.navItems;
    this.portalLabel = (this.route.snapshot.data['portalLabel'] as string | undefined) ?? this.portalLabel;
    this.updatePageTitle();

    this.router.events
      .pipe(
        filter(
          (event): event is ActivationEnd | NavigationEnd =>
            event instanceof ActivationEnd || event instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updatePageTitle());
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.authState.logout();
  }

  private updatePageTitle(): void {
    const route = this.getDeepestChild(this.route);
    this.pageTitle =
      (route.snapshot.data['title'] as string | undefined) ?? this.portalTitle ?? 'Dashboard';
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
