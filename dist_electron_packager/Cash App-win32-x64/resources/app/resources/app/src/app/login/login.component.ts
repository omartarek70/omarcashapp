import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(private router: Router) { }

  login() {
    if (this.username === 'owner' && this.password === 'owner123') {
      localStorage.setItem('user', JSON.stringify({ id: '1', username: 'owner', role: 'owner', name: 'صاحب المحل' }));
      this.router.navigate(['/admin']);
    } else if (this.username === 'cashier1' && this.password === 'cashier123') {
      localStorage.setItem('user', JSON.stringify({ id: '2', username: 'cashier1', role: 'cashier', name: 'كاشير 1' }));
      this.router.navigate(['/cash']);
    } else {
      this.error = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
  }
}
