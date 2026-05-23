import { Role } from '../models';

export interface SeedUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: Role;
  isFirstLogin: boolean;
}

export const MOCK_SEED_USERS: SeedUser[] = [
    {
      id: 'user-admin-1',
      fullName: 'Dr. Grace E. Gavino',
      email: 'admin@gavino.clinic',
      password: 'Admin@123456',
      role: 'Admin',
      isFirstLogin: false
    },
    {
      id: 'user-admin-2',
      fullName: 'Maria Fernandez',
      email: 'admin2@gavino.clinic',
      password: 'Admin@123456',
      role: 'Admin',
      isFirstLogin: false
    },
    {
      id: 'user-staff-1',
      fullName: 'Ana Gomez',
      email: 'staff@gavino.clinic',
      password: 'Staff@123456',
      role: 'Staff',
      isFirstLogin: false
    },
    {
      id: 'user-doctor-1',
      fullName: 'Dr. Santos',
      email: 'dr.santos@gavino.clinic',
      password: 'Doctor@123456',
      role: 'Doctor',
      isFirstLogin: false
    },
    {
      id: 'user-doctor-2',
      fullName: 'Dr. Jose Reyes',
      email: 'dr.reyes@gavino.clinic',
      password: 'Doctor@123456',
      role: 'Doctor',
      isFirstLogin: true
    },
    {
      id: 'user-doctor-3',
      fullName: 'Dr. Ana Cruz',
      email: 'dr.cruz@gavino.clinic',
      password: 'Doctor@123456',
      role: 'Doctor',
      isFirstLogin: false
    },
    {
      id: 'user-patient-1',
      fullName: 'Juan dela Cruz',
      email: 'patient@gavino.clinic',
      password: 'Patient@123456',
      role: 'Patient',
      isFirstLogin: false
    }
  ];
