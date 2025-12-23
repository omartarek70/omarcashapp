import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const roles: string[] = route.data?.['roles'] || [];
    if (roles.length) {
      const user = this.auth.getUser();
      if (!user || !roles.includes(user.role)) {
        // If user logged in but not authorized for this route, redirect to cash or login
        if (this.auth.isInRole('cashier')) {
          this.router.navigate(['/cash']);
        } else {
          this.router.navigate(['/login']);
        }
        return false;
      }
    }

    return true;
  }
}
