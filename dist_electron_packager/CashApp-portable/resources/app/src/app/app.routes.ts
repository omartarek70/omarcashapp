import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CashComponent } from './cash/cash.component';
import { AdminComponent } from './admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'cash', component: CashComponent },
  { path: 'admin', component: AdminComponent },
];
