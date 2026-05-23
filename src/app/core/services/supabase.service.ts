import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const supabaseUrl = environment.supabaseUrl?.trim();
    const supabaseAnonKey = environment.supabaseAnonKey?.trim();

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('PASTE_SUPABASE')) {
      console.warn(
        'Supabase is not configured. Set supabaseUrl and supabaseAnonKey in src/environments/environment.ts.'
      );
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  // ── Storage ──────────────────────────────────────

  async uploadFile(bucket: string, path: string, file: File): Promise<{ path?: string; error?: string }> {
    const { data, error } = await this.client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) return { error: error.message };
    return { path: data?.path };
  }

  getPublicUrl(bucket: string, path: string): string | null {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 60): Promise<string | null> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data) return null;
    return data.signedUrl;
  }

  // ── RPC: Document / Lab Registration ─────────────

  async registerPatientDocument(params: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
    const { data, error } = await this.client.rpc('register_patient_document', params);
    if (error) return { error: error.message };
    return { data };
  }

  async registerLabResult(params: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
    const { data, error } = await this.client.rpc('register_lab_result', params);
    if (error) return { error: error.message };
    return { data };
  }

  // ── View Queries ─────────────────────────────────

  async getPatientDocuments(patientId: string, bookingId?: string): Promise<any[]> {
    let q = this.client.from('patient_documents_view').select('*').eq('patient_id', patientId);
    if (bookingId) q = q.eq('booking_id', bookingId);
    const { data } = await q.order('uploaded_at', { ascending: false });
    return data || [];
  }

  async getPatientLabResults(patientId: string, bookingId?: string): Promise<any[]> {
    let q = this.client.from('lab_results_view').select('*').eq('patient_id', patientId);
    if (bookingId) q = q.eq('booking_id', bookingId);
    const { data } = await q.order('uploaded_at', { ascending: false });
    return data || [];
  }
}
