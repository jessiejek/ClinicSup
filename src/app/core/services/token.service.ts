import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly accessTokenStorageKey = 'clinic.auth.access-token';
  private readonly refreshTokenStorageKey = 'clinic.auth.refresh-token';

  constructor() {
    this.accessToken = this.readToken(this.accessTokenStorageKey);
    this.refreshToken = this.readToken(this.refreshTokenStorageKey);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem(this.accessTokenStorageKey, token);
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
    localStorage.setItem(this.refreshTokenStorageKey, token);
  }

  getAccessToken(): string | null {
    return this.accessToken ?? this.readToken(this.accessTokenStorageKey);
  }

  getRefreshToken(): string | null {
    return this.refreshToken ?? this.readToken(this.refreshTokenStorageKey);
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
  }

  hasAccessToken(): boolean {
    return this.getAccessToken() !== null;
  }

  hasRefreshToken(): boolean {
    return this.getRefreshToken() !== null;
  }

  // Backwards-compatible aliases for existing callers.
  setToken(token: string): void {
    this.setAccessToken(token);
  }

  getToken(): string | null {
    return this.getAccessToken();
  }

  clearToken(): void {
    this.clearTokens();
  }

  hasToken(): boolean {
    return this.hasAccessToken();
  }

  private readToken(storageKey: string): string | null {
    return localStorage.getItem(storageKey);
  }
}
