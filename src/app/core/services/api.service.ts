import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (environment.apiUrl || environment.apiBaseUrl || '').replace(/\/+$/, '');

  /**
   * Joins the base URL with the endpoint, preventing double slashes.
   * Eg. "https://localhost:5001/api/" + "/Patient/GetPatients" → "https://localhost:5001/api/Patient/GetPatients"
   */
  private url(endpoint: string): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${path}`.replace(/([^:]\/)\/+/g, '$1');
  }

  private toParams(params?: Record<string, unknown>): HttpParams | undefined {
    if (!params) return undefined;
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  // ── Standard JSON methods ─────────────────────────

  get<T>(endpoint: string, params?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(this.url(endpoint), { params: this.toParams(params) }).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  post<T>(endpoint: string, payload?: unknown): Observable<T> {
    return this.http.post<T>(this.url(endpoint), payload).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  put<T>(endpoint: string, payload?: unknown): Observable<T> {
    return this.http.put<T>(this.url(endpoint), payload).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  patch<T>(endpoint: string, payload?: unknown): Observable<T> {
    return this.http.patch<T>(this.url(endpoint), payload).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.url(endpoint)).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  // ── Blob / file download methods ──────────────────

  getBlob(endpoint: string, params?: Record<string, unknown>): Observable<Blob> {
    return this.http.get(this.url(endpoint), {
      params: this.toParams(params),
      responseType: 'blob'
    }).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  postBlob(endpoint: string, payload?: unknown): Observable<Blob> {
    return this.http.post(this.url(endpoint), payload, {
      responseType: 'blob'
    }).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  getBlobResponse(endpoint: string, params?: Record<string, unknown>): Observable<HttpResponse<Blob>> {
    return this.http.get(this.url(endpoint), {
      params: this.toParams(params),
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  postBlobResponse(endpoint: string, payload?: unknown): Observable<HttpResponse<Blob>> {
    return this.http.post(this.url(endpoint), payload, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  // ── FormData / file upload methods ────────────────

  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.url(endpoint), formData).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  putFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.put<T>(this.url(endpoint), formData).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  // ── Error handling ────────────────────────────────

  private handleError(error: unknown): Observable<never> {
    console.error('[ApiService] Request failed:', error);
    return throwError(() => error);
  }
}
