import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Service, ServiceCategory } from '../../../core/models';

type NullableString = string | null | undefined;

interface ServiceRow {
  id: string;
  name: NullableString;
  description: NullableString;
  estimated_duration_minutes: number | null;
  price: number | null;
  category: ServiceCategory | string | null;
  is_active: boolean | null;
}

interface DoctorServiceRow {
  doctor_id: string;
  service_id: string;
}

interface ServiceDto {
  id: string;
  name?: NullableString;
  description?: NullableString;
  estimatedDurationMinutes?: number | null;
  price?: number | null;
  category?: ServiceCategory | string | null;
  doctorIds?: string[] | null;
  isActive?: boolean | null;
}

export interface ManagedService extends Service {
  isActive: boolean;
}

export interface ServiceWriteDto extends Omit<Service, 'id'> {
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminServicesService {
  private readonly supabase = inject(SupabaseService).client;

  getServices(): Observable<ManagedService[]> {
    return from(this.fetchServices());
  }

  createService(service: ServiceWriteDto): Observable<ManagedService> {
    return from(this.createServiceAsync(service));
  }

  addService(service: ServiceWriteDto): Observable<ManagedService> {
    return this.createService(service);
  }

  updateService(id: string, service: ServiceWriteDto): Observable<ManagedService> {
    return from(this.updateServiceAsync(id, service));
  }

  deleteService(id: string): Observable<void> {
    return from(this.deleteServiceAsync(id));
  }

  toggleServiceStatus(service: ManagedService, isActive: boolean): Observable<ManagedService> {
    return from(this.toggleServiceStatusAsync(service, isActive));
  }

  private async fetchServices(): Promise<ManagedService[]> {
    const [{ data: services, error: servicesError }, { data: doctorServices, error: doctorServicesError }] =
      await Promise.all([
        this.supabase
          .from('services')
          .select('id, name, description, estimated_duration_minutes, price, category, is_active')
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        this.supabase
          .from('doctor_services')
          .select('doctor_id, service_id')
      ]);

    if (servicesError) {
      throw servicesError;
    }

    if (doctorServicesError) {
      throw doctorServicesError;
    }

    const doctorIdsByServiceId = new Map<string, string[]>();

    for (const row of (doctorServices ?? []) as DoctorServiceRow[]) {
      const list = doctorIdsByServiceId.get(row.service_id) ?? [];
      list.push(row.doctor_id);
      doctorIdsByServiceId.set(row.service_id, list);
    }

    return ((services ?? []) as ServiceRow[]).map((service) =>
      mapServiceRow(service, doctorIdsByServiceId.get(service.id) ?? [])
    );
  }

  private async toggleServiceStatusAsync(service: ManagedService, isActive: boolean): Promise<ManagedService> {
    const { data, error } = await this.supabase
      .from('services')
      .update({ is_active: isActive })
      .eq('id', service.id)
      .select('id, name, description, estimated_duration_minutes, price, category, is_active')
      .single();

    if (error) {
      throw error;
    }

    return mapServiceRow(data as ServiceRow, service.doctorIds);
  }

  private async createServiceAsync(service: ServiceWriteDto): Promise<ManagedService> {
    const { data, error } = await this.supabase
      .from('services')
      .insert({
        name: service.name,
        description: service.description ?? null,
        estimated_duration_minutes: service.estimatedDurationMinutes ?? null,
        price: service.price ?? 0,
        category: service.category ?? 'Consultation',
        is_active: service.isActive ?? true,
      })
      .select('id, name, description, estimated_duration_minutes, price, category, is_active')
      .single();

    if (error) throw error;
    return mapServiceRow(data as ServiceRow, []);
  }

  private async updateServiceAsync(id: string, service: ServiceWriteDto): Promise<ManagedService> {
    const { data, error } = await this.supabase
      .from('services')
      .update({
        name: service.name,
        description: service.description ?? null,
        estimated_duration_minutes: service.estimatedDurationMinutes ?? null,
        price: service.price ?? 0,
        category: service.category ?? 'Consultation',
        is_active: service.isActive ?? true,
      })
      .eq('id', id)
      .select('id, name, description, estimated_duration_minutes, price, category, is_active')
      .single();

    if (error) throw error;
    return mapServiceRow(data as ServiceRow, []);
  }

  private async deleteServiceAsync(id: string): Promise<void> {
    const { error } = await this.supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  }
}

function mapServiceRow(row: ServiceRow, doctorIds: string[]): ManagedService {
  return {
    id: row.id,
    name: normalizeString(row.name) || '',
    description: normalizeString(row.description),
    estimatedDurationMinutes: row.estimated_duration_minutes ?? 0,
    price: row.price ?? 0,
    category: normalizeServiceCategory(row.category),
    doctorIds,
    isActive: row.is_active ?? true
  };
}

function mapManagedServiceDto(dto: ServiceDto): ManagedService {
  return {
    id: dto.id,
    name: normalizeString(dto.name) || '',
    description: normalizeString(dto.description),
    estimatedDurationMinutes: dto.estimatedDurationMinutes ?? 0,
    price: dto.price ?? 0,
    category: normalizeServiceCategory(dto.category),
    doctorIds: dto.doctorIds ?? [],
    isActive: dto.isActive ?? true
  };
}

function normalizeString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeServiceCategory(value: unknown): ServiceCategory {
  const allowed: ServiceCategory[] = ['Consultation', 'Procedure', 'Laboratory', 'Diagnostic'];
  if (typeof value !== 'string') {
    return 'Consultation';
  }

  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? 'Consultation';
}
