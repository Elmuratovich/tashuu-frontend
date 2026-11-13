import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'tashuu_token';
  private readonly userKey = 'tashuu_user';
  readonly currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => this.persist(res))
    );
  }

  registerCustomer(payload: Record<string, unknown>) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register/customer`, payload).pipe(
      tap(res => this.persist(res))
    );
  }

  registerDriver(payload: Record<string, unknown>) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register/driver`, payload).pipe(
      tap(res => this.persist(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) as User : null;
  }
}
