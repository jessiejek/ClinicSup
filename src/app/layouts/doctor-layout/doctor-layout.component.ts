import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavItem } from '../../core/models';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../core/services/clinic-settings.service';
import { NotificationService } from '../../core/services/notification.service';
import { SidebarComponent } from '../../portals/admin/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../portals/admin/components/topbar/topbar.component';

@Component({
  selector: 'app-doctor-layout',
  template: `
    <div class="portal-layout">
      <app-admin-sidebar
        class="portal-layout__sidebar"
        [class.is-open]="isSidebarOpen"
        [navItems]="navItems"
        [portalLabel]="portalLabel"
        [clinicName]="clinicName"
        [currentUser]="currentUser()"
        [isOpen]="isSidebarOpen"
        (navClick)="closeSidebar()"
        (logout)="logout()"
      ></app-admin-sidebar>

      <div class="main-content">
        <app-admin-topbar
          [title]="pageTitle"
          [portalLabel]="portalLabel"
          [currentUser]="currentUser()"
          [unreadCount]="unreadCount()"
          (menuToggle)="isSidebarOpen = !isSidebarOpen"
          (logout)="logout()"
        ></app-admin-topbar>

        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <div
        class="sidebar-overlay"
        [class.is-visible]="isSidebarOpen"
        (click)="closeSidebar()"
        aria-hidden="true"
      ></div>
    </div>
  `,
  styleUrl: './doctor-layout.component.scss',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent]
})
export class DoctorLayoutComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.authState.currentUser;
  readonly unreadCount = this.notificationService.unreadCount;

  clinicName = '';
  portalLabel = 'Doctor Portal';
  portalTitle = 'Dashboard';
  pageTitle = 'Dashboard';
  isSidebarOpen = false;

  readonly navItems: NavItem[] = [
    { section: 'CORE', label: 'Dashboard', route: '/doctor/dashboard', icon: 'grid-outline' },
    { section: 'CORE', label: 'Appointments', route: '/doctor/appointments', icon: 'calendar-outline' },
    { section: 'RECORDS', label: 'Patients', route: '/doctor/patients', icon: 'people-outline' },
    { section: 'TOOLS', label: 'Schedule', route: '/doctor/schedule', icon: 'time-outline' },
    { section: 'ACCOUNT', label: 'My Profile', route: '/doctor/profile', icon: 'person-outline' }
  ];

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

  logout(): void {
    this.authState.logout();
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
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
}
