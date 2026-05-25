import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavItem } from '../../core/models';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../core/services/clinic-settings.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeInitService } from '../../core/services/realtime-init.service';
import { SidebarComponent } from '../../portals/admin/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../portals/admin/components/topbar/topbar.component';

@Component({
  selector: 'app-staff-layout',
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
  styleUrl: './staff-layout.component.scss',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent]
})
export class StaffLayoutComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtimeInit = inject(RealtimeInitService);

  readonly currentUser = this.authState.currentUser;
  readonly unreadCount = this.notificationService.unreadCount;

  clinicName = '';
  portalLabel = 'Staff Portal';
  portalTitle = 'Dashboard';
  pageTitle = 'Dashboard';
  isSidebarOpen = false;

  readonly navItems: NavItem[] = [
    { section: 'CORE', label: 'Dashboard', route: '/staff/dashboard', icon: 'grid-outline' },
    { section: 'CORE', label: 'Bookings', route: '/staff/bookings', icon: 'calendar-outline' },
    { section: 'CORE', label: 'Payments', route: '/staff/payments', icon: 'cash-outline' },
    { section: 'CORE', label: 'Patients', route: '/staff/patients', icon: 'people-outline' },
    { section: 'TOOLS', label: 'Doctor Status', route: '/staff/doctor-status', icon: 'medical-outline' },
    { section: 'ACCOUNT', label: 'My Profile', route: '/staff/profile', icon: 'person-outline' }
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

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  logout(): void {
    this.authState.logout();
  }

  private updatePageTitle(): void {
    const deepest = this.getDeepestChild(this.route);
    this.pageTitle = (deepest.snapshot.data['title'] as string | undefined) ?? this.portalTitle;
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
