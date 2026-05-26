import { AuthUser, ClinicalRole } from '../models';

export interface ClinicalRoleBadge {
  label: string;
  className: string;
}

export function resolveClinicalRole(user: AuthUser | null | undefined): ClinicalRole {
  if (!user) {
    return 'receptionist';
  }

  if (user.clinicalRole) {
    return user.clinicalRole;
  }

  switch (user.role) {
    case 'Doctor':
      return 'physician';
    case 'Admin':
      return 'admin';
    case 'Staff':
      return 'receptionist';
    default:
      return 'receptionist';
  }
}

export function getClinicalRoleBadge(role: ClinicalRole): ClinicalRoleBadge {
  switch (role) {
    case 'physician':
      return { label: 'MD', className: 'role-badge--physician' };
    case 'nurse':
      return { label: 'RN', className: 'role-badge--nurse' };
    case 'medical_assistant':
      return { label: 'MA', className: 'role-badge--ma' };
    case 'admin':
      return { label: 'Admin', className: 'role-badge--admin' };
    case 'receptionist':
    default:
      return { label: 'Front Desk', className: 'role-badge--front-desk' };
  }
}

export function canEditPrescriptions(role: ClinicalRole): boolean {
  return role === 'physician';
}

export function canEditLabOrders(role: ClinicalRole): boolean {
  return role === 'physician';
}

export function canEditVaccinations(role: ClinicalRole): boolean {
  return role === 'physician' || role === 'nurse' || role === 'medical_assistant';
}

export function canViewPfDecision(role: ClinicalRole): boolean {
  return role === 'physician' || role === 'admin' || role === 'receptionist';
}

