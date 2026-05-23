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
}
