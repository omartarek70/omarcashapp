import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router) {}

  getUser(): any | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getUser();
  }

  isInRole(role: string): boolean {
    const user = this.getUser();
    return !!user && user.role === role;
  }

  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}
