import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private invoices = new BehaviorSubject<any[]>([]);
  invoices$ = this.invoices.asObservable();

  constructor() {
    const data = localStorage.getItem('invoices');
    if (data) {
      this.invoices.next(JSON.parse(data));
    }
  }

  addInvoice(invoice: any) {
    const currentInvoices = this.invoices.getValue();
    const updatedInvoices = [...currentInvoices, invoice];
    this.invoices.next(updatedInvoices);
    localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
  }

  // replace the current invoices list (used when archiving / resetting day)
  setInvoices(invoices: any[]) {
    this.invoices.next(invoices || []);
    localStorage.setItem('invoices', JSON.stringify(invoices || []));
  }
}
