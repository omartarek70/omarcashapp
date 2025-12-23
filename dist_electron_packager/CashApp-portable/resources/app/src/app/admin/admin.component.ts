import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InvoiceService } from '../cash/invoice.service';

interface Installment {
  installment_number: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  date_time: string;
  date_time_display?: string;
  cashier_id: string;
  cashier_name: string;
  customer_name: string;
  customer_phone?: string;
  items: any[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  status: string;
  payment_method: string;
  installment_count?: number;
  installments?: Installment[];
}

interface Product {
  id: string;
  hgn: string; // HGN code (was sku/product_code)
  name: string;
  cost_price: number; // factory price (cost)
  wholesale_price: number; // wholesale price
  sale_price: number; // normal sale price
  min_stock?: number;
  stock_quantity: number;
  image?: string;
  discount?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  invoice_ids: string[];
  created_at: string;
  last_purchase_at: string;
  email?: string;
  points?: number;
  points_history?: { date: string; points: number; reason?: string; invoice_id?: string }[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  currentUser: any = null;
  currentPage: string = 'dashboard';
  invoices: Invoice[] = [];
  returns: any[] = [];
  customers: Customer[] = [];
  // monthly_reports removed: compute monthly breakdown dynamically
  products: Product[] = [
    { id: '1', hgn: 'CHR001', name: 'كرسي خشبي', cost_price: 100, wholesale_price: 130, sale_price: 150, min_stock: 5, stock_quantity: 50 },
    { id: '2', hgn: 'TBL001', name: 'طاولة قهوة', cost_price: 180, wholesale_price: 220, sale_price: 250, min_stock: 2, stock_quantity: 20 },
    { id: '3', hgn: 'SHL001', name: 'رف جداري', cost_price: 120, wholesale_price: 160, sale_price: 180, min_stock: 3, stock_quantity: 15 },
    { id: '4', hgn: 'CAB001', name: 'دولاب ملابس', cost_price: 380, wholesale_price: 450, sale_price: 500, min_stock: 1, stock_quantity: 10 },
    { id: '5', hgn: 'BED001', name: 'سرير مفرد', cost_price: 600, wholesale_price: 720, sale_price: 800, min_stock: 2, stock_quantity: 8 },
  ];

  // Statistics
  todaySales: number = 0;
  todayInvoices: number = 0;
  totalReturns: number = 0;
  lowStockCount: number = 0;

  // Alerts
  upcomingInstallments: any[] = [];
  lowStockProducts: Product[] = [];
  showAlertsPanel: boolean = false;

  // archived days (populated from localStorage 'archived_days')
  archivedDays: any[] = [];
  archivedFilterDate: string = '';
  selectedArchivedDay: any | null = null;

  // UI state for daily report
  expandedInvoices: { [key: number]: boolean } = {};

  // Forms
  showAddProductForm: boolean = false;
  newProduct: Product = {
    id: '',
    hgn: '',
    name: '',
    cost_price: 0,
    wholesale_price: 0,
    sale_price: 0,
    min_stock: 0,
    stock_quantity: 0,
  };

  // Edit product
  editingProduct: Product | null = null;
  showEditProductForm: boolean = false;
  // when editing via the add-product form, store the id here
  editingProductId: string | null = null;

  // add customer form fields
  newClientName: string = '';
  newClientPhone: string = '';
  newClientEmail: string = '';

  constructor(private router: Router, private invoiceService: InvoiceService) {}

  ngOnInit() {
    const user = localStorage.getItem('user');
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = JSON.parse(user);
    if (this.currentUser.role !== 'owner') {
      this.router.navigate(['/cash']);
      return;
    }
    this.loadProducts();
    this.loadInvoices();
    this.loadCustomers();
    this.loadArchivedDays();
    this.updateStatistics();
    this.loadReturns();
    this.checkAlerts();
    this.invoiceService.invoices$.subscribe(invoices => {
      this.invoices = invoices;
      this.updateStatistics();
      this.checkAlerts();
    });

    // Listen for localStorage changes (cashier actions from other window/tab)
    window.addEventListener('storage', (e) => {
      // reload data when storage changes
      this.loadProducts();
      this.loadCustomers();
      this.loadReturns();
      this.updateStatistics();
      this.checkAlerts();
    });
  }

  checkAlerts() {
    // Check for upcoming installments
    this.upcomingInstallments = this.getUpcomingInstallments();
    
    // Check for low stock products
    this.lowStockProducts = this.getLowStockProducts();
  }

  getUpcomingInstallments(): any[] {
    const alerts: any[] = [];
    const today = new Date();
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.invoices.forEach(invoice => {
      if (invoice.installments) {
        invoice.installments.forEach(inst => {
          if (!inst.paid) {
            const dueDate = new Date(inst.due_date);
            if (dueDate >= today && dueDate <= sevenDaysLater) {
              alerts.push({
                invoice_number: invoice.invoice_number,
                customer_name: invoice.customer_name,
                installment_number: inst.installment_number,
                amount: inst.amount,
                due_date: inst.due_date,
                days_remaining: Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              });
            }
          }
        });
      }
    });

    return alerts.sort((a, b) => a.days_remaining - b.days_remaining);
  }

  toggleInvoiceDetail(index: number) {
    this.expandedInvoices[index] = !this.expandedInvoices[index];
  }

  loadReturns() {
    const data = localStorage.getItem('returns');
    this.returns = data ? JSON.parse(data) : [];
  }

  loadArchivedDays() {
    try {
      const data = localStorage.getItem('archived_days');
      this.archivedDays = data ? JSON.parse(data) : [];
      // sort descending by date
      this.archivedDays.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      this.archivedDays = [];
    }
  }

  viewArchivedDay(day: any) {
    this.selectedArchivedDay = day;
  }

  clearArchivedSelection() {
    this.selectedArchivedDay = null;
  }

  getFilteredArchivedDays() {
    if (!this.archivedFilterDate) return this.archivedDays;
    const target = new Date(this.archivedFilterDate).toDateString();
    return this.archivedDays.filter((d: any) => new Date(d.date).toDateString() === target);
  }

  // return all invoices in the given month (defaults to current month)
  getInvoicesInMonth(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth();
    return this.invoices.filter(inv => {
      const d = new Date(inv.date_time);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  // UI helpers for monthly invoices panel
  monthlyInvoicesOpen: boolean = false;
  monthlySearchQuery: string = '';

  // report selector for monthly breakdown (year and month; month is 0-based)
  reportYear: number = new Date().getFullYear();
  reportMonth: number = new Date().getMonth();

  getMonthlyBreakdown() {
    return this.getMonthlyReport(this.reportYear, this.reportMonth);
  }

  // search for returns UI
  returnsSearchQuery: string = '';

  getFilteredMonthlyInvoices() {
    const list = this.getInvoicesInMonth();
    if (!this.monthlySearchQuery) return list;
    const q = this.monthlySearchQuery.trim().toLowerCase();
    return list.filter(inv => inv.invoice_number.includes(q) || (inv.customer_name && inv.customer_name.toLowerCase().includes(q)));
  }

  loadProducts() {
    const data = localStorage.getItem('products');
    if (data) {
      this.products = JSON.parse(data);
    } else {
      // seed a set of test products for first-run
      const testProducts: Product[] = [];
      for (let i = 1; i <= 100; i++) {
        const id = Date.now().toString() + '_' + i;
        const price = 10 + i; // simple increasing price
        testProducts.push({
          id,
          hgn: 'TEST' + String(i).padStart(3, '0'),
          name: `منتج تجريبي ${i}`,
          cost_price: Math.max(1, Math.round(price * 0.6)),
          wholesale_price: Math.round(price * 0.9),
          sale_price: price,
          min_stock: 1,
          stock_quantity: 50
        });
      }
      this.products = testProducts;
      localStorage.setItem('products', JSON.stringify(this.products));
    }
  }

  saveProducts() {
    localStorage.setItem('products', JSON.stringify(this.products));
  }

  loadInvoices() {
    const data = localStorage.getItem('invoices');
    const raw = data ? JSON.parse(data) : [];
    // migrate older invoices to include a display timestamp
    this.invoices = (raw || []).map((inv: any) => {
      if (!inv.date_time_display) {
        try {
          // if stored as ISO string, parse; otherwise try Date parsing
          const dt = new Date(inv.date_time);
          if (!isNaN(dt.getTime())) {
            inv.date_time_display = dt.toLocaleString('ar-EG');
          } else {
            inv.date_time_display = String(inv.date_time || '');
          }
        } catch (e) {
          inv.date_time_display = String(inv.date_time || '');
        }
      }
      return inv;
    });
  }

  saveInvoices() {
    localStorage.setItem('invoices', JSON.stringify(this.invoices));
  }

  saveReturns() {
    localStorage.setItem('returns', JSON.stringify(this.returns));
  }

  loadCustomers() {
    const data = localStorage.getItem('customers');
    this.customers = data ? JSON.parse(data) : [];
  }

  saveCustomers() {
    localStorage.setItem('customers', JSON.stringify(this.customers));
  }

  // monthly_reports persistence removed: summaries are generated from archived days and invoices

  updateStatistics() {
    const today = new Date().toLocaleDateString('ar-EG');
    const todayInvoices = this.invoices.filter(inv => {
      const invoiceDate = new Date(inv.date_time).toLocaleDateString('ar-EG');
      return invoiceDate === today;
    });
    // Do NOT include archived entries for the same day; archived days are historical
    this.todayInvoices = todayInvoices.length;
    this.todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
    this.lowStockCount = this.products.filter(p => p.stock_quantity <= 0).length;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  navigateTo(page: string) {
    this.currentPage = page;
    if (page === 'alerts') {
      this.checkAlerts();
    }
  }

  toggleAddForm() {
    if (this.showAddProductForm) {
      // closing the add form: clear editing state and reset newProduct
      this.editingProductId = null;
      this.newProduct = { id: '', hgn: '', name: '', cost_price: 0, wholesale_price: 0, sale_price: 0, min_stock: 0, stock_quantity: 0 };
      this.showAddProductForm = false;
    } else {
      this.showAddProductForm = true;
    }
  }

  getLowStockProducts(): Product[] {
    // since min_stock removed, flag only products with zero stock
    return this.products.filter(p => p.stock_quantity <= 0);
  }

  addProduct() {
    if (!this.newProduct.hgn || !this.newProduct.name || Number(this.newProduct.cost_price) <= 0 || Number(this.newProduct.wholesale_price) <= 0 || Number(this.newProduct.sale_price) <= 0) {
      alert('يرجى ملء جميع الحقول بشكل صحيح');
      return;
    }

    // if editing an existing product via the add form, update it
    if (this.editingProductId) {
      const idx = this.products.findIndex(p => p.id === this.editingProductId);
      if (idx >= 0) {
        this.products[idx] = { ...this.newProduct, id: this.editingProductId } as Product;
        this.saveProducts();
        this.updateStatistics();
        alert('تم تحديث المنتج بنجاح');
      }
      // clear edit state
      this.editingProductId = null;
      this.showAddProductForm = false;
      this.newProduct = { id: '', hgn: '', name: '', cost_price: 0, wholesale_price: 0, sale_price: 0, min_stock: 0, stock_quantity: 0 };
      return;
    }

    const product: Product = {
      ...this.newProduct,
      id: Date.now().toString(),
    };

    this.products.push(product);
    this.saveProducts();
    this.newProduct = {
      id: '',
      hgn: '',
      name: '',
      cost_price: 0,
      wholesale_price: 0,
      sale_price: 0,
      min_stock: 0,
      stock_quantity: 0,
    };
    this.showAddProductForm = false;
    alert('تم إضافة المنتج بنجاح');
  }

  updateProduct(product: Product) {
    // populate the add-product form so user can edit inline
    this.newProduct = { ...product } as Product;
    this.editingProductId = product.id;
    this.showAddProductForm = true;
  }

  saveEditedProduct() {
    if (!this.editingProduct) return;
    const idx = this.products.findIndex(p => p.id === this.editingProduct!.id);
    if (idx >= 0) {
      this.products[idx] = { ...this.editingProduct };
      this.saveProducts();
      this.showEditProductForm = false;
      this.editingProduct = null;
      // also clear add-form edit state in case used
      this.editingProductId = null;
      alert('تم تحديث المنتج وحفظه');
      this.updateStatistics();
    }
  }

  cancelEdit() {
    this.editingProduct = null;
    this.showEditProductForm = false;
    this.editingProductId = null;
    this.showAddProductForm = false;
  }

  addCustomer(name: string, phone: string) {
    const n = (name || '').trim();
    const p = (phone || '').trim();
    const e = (this.newClientEmail || '').trim();
    if (!n) { alert('الرجاء إدخال اسم العميل'); return; }
    const nowIso = new Date().toISOString();
    const customer: any = {
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2),
      name: n,
      phone: p,
      email: e,
      invoice_ids: [],
      created_at: nowIso,
      last_purchase_at: nowIso,
      points: 0,
      points_history: [],
    };
    this.customers.push(customer as any);
    this.saveCustomers();
    this.newClientName = '';
    this.newClientPhone = '';
    this.newClientEmail = '';
    alert('تم إضافة العميل');
  }

  // Archive today's invoices/returns and reset daily totals
  startNewDay() {
    const today = new Date();
    const targetDay = today.toDateString();

    const todaysInvoices = this.invoices.filter(inv => new Date(inv.date_time).toDateString() === targetDay);
    const todaysReturns = this.returns.filter(ret => new Date(ret.date_time).toDateString() === targetDay);

    const totalSales = todaysInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalRefunds = todaysReturns.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0);

    // group today's invoices per cashier for archive
    const perCashierMap = new Map<string, { cashier_id: string; cashier_name: string; invoices: any[]; totalSales: number; returns?: any[]; totalRefunds?: number }>();
    todaysInvoices.forEach(inv => {
      const key = inv.cashier_id || inv.cashier_name || 'unknown';
      const entry = perCashierMap.get(key) || { cashier_id: inv.cashier_id || '', cashier_name: inv.cashier_name || 'غير معروف', invoices: [], totalSales: 0, returns: [], totalRefunds: 0 } as any;
      entry.invoices.push(inv);
      entry.totalSales += Number(inv.total) || 0;
      perCashierMap.set(key, entry);
    });

    // attach returns per cashier if return records include processed_by (cashier name)
    todaysReturns.forEach(r => {
      const key = r.processed_by || 'unknown';
      const entry = perCashierMap.get(key) || { cashier_id: '', cashier_name: r.processed_by || 'غير معروف', invoices: [], totalSales: 0, returns: [], totalRefunds: 0 } as any;
      entry.returns = entry.returns || [];
      entry.returns.push(r);
      entry.totalRefunds = (entry.totalRefunds || 0) + (Number(r.refund_amount) || 0);
      perCashierMap.set(key, entry);
    });

    const perCashier = Array.from(perCashierMap.values());

    const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
    // mark this archived day as cleared so admin can choose whether to include it in today's implicit report
    archived.push({ date: targetDay, perCashier, invoices: todaysInvoices, returns: todaysReturns, totalSales, totalRefunds, cleared: true });
    localStorage.setItem('archived_days', JSON.stringify(archived));

    // remove today's invoices/returns from current lists
    this.invoices = this.invoices.filter(inv => new Date(inv.date_time).toDateString() !== targetDay);
    this.returns = this.returns.filter(ret => new Date(ret.date_time).toDateString() !== targetDay);
    this.saveInvoices();
    this.saveReturns();
    // propagate to invoice service so other subscribers (e.g., UI) update
    try {
      this.invoiceService.setInvoices(this.invoices);
    } catch (e) {}
    // reset invoice counter so next invoice after starting a new day begins at 1
    try {
      localStorage.setItem('invoice_counter', '0');
    } catch (e) {}
    alert('تم بدء يوم جديد: بيانات اليوم مؤرشفة وصفر اليومية');
    this.updateStatistics();
  }

  confirmStartNewDay() {
    if (!confirm('تأكيد: هل تريد بدء يوم جديد؟ سيتم أرشفة معاملات اليوم وسيتم إعادة ترقيم الفواتير بدءًا من 1.')) return;
    this.startNewDay();
  }

  // Restore an archived day back into live invoices/returns and remove the archive entry
  restoreArchivedDay(day: any) {
    try {
      const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
      const idx = archived.findIndex((d: any) => d.date === day.date);
      if (idx === -1) { alert('لم يتم العثور على اليوم للأرشيف'); return; }
      const entry = archived[idx];
      // merge invoices and returns back into live lists
      if (Array.isArray(entry.invoices) && entry.invoices.length > 0) {
        this.invoices = this.invoices.concat(entry.invoices);
      }
      if (Array.isArray(entry.returns) && entry.returns.length > 0) {
        this.returns = this.returns.concat(entry.returns);
      }
      // remove archived entry
      archived.splice(idx, 1);
      localStorage.setItem('archived_days', JSON.stringify(archived));
      // persist live lists and notify subscribers
      this.saveInvoices();
      this.saveReturns();
      try { this.invoiceService.setInvoices(this.invoices); } catch (e) {}
      this.loadArchivedDays();
      this.updateStatistics();
      alert('تم استعادة بيانات اليوم المؤرشف إلى السجلات الحية');
    } catch (e) {
      alert('حدث خطأ أثناء استعادة اليوم المؤرشف');
    }
  }


  // monthly report generation is done on demand via `getMonthlyBreakdown()` / `getMonthlyReport()`

  deleteProduct(id: string) {
    if (confirm('هل تريد حذف هذا المنتج؟')) {
      this.products = this.products.filter(p => p.id !== id);
      this.saveProducts();
      alert('تم حذف المنتج');
    }
  }

  exportToCSV() {
    let csvContent = 'رقم الفاتورة,التاريخ,العميل,الإجمالي,طريقة الدفع\n';
    this.invoices.forEach(inv => {
      csvContent += `${inv.invoice_number},${inv.date_time_display || inv.date_time},${inv.customer_name},${inv.total},${inv.payment_method}\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csvContent));
    element.setAttribute('download', 'invoices.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Daily report for a given date (defaults to today)
  getDailyReport(date?: Date) {
    const target = date || new Date();
    const targetDay = target.toDateString();

    const invoices = this.invoices.filter(inv => {
      const d = new Date(inv.date_time);
      return d.toDateString() === targetDay;
    });

    const returns = this.returns.filter(ret => {
      const d = new Date(ret.date_time);
      return d.toDateString() === targetDay;
    });

    const totalSales = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalRefunds = returns.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0);

    // include archived day's data if present (supports per-day or per-cashier archive shape)
    // If the archive entry for today was created by 'Start New Day' it will be marked `cleared: true`.
    // In that case we skip merging it for the implicit "today" query so admin sees zero like cashier.
    const isTodayQuery = !date;
    try {
      const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
      archived.forEach((d: any) => {
        const archivedDay = new Date(d.date).toDateString();
        if (archivedDay === targetDay) {
          // if this is the implicit "today" query and there exists an archived entry for today,
          // do not merge archived data so admin sees zero after starting a new day.
          if (isTodayQuery) return;
          if (d.invoices && Array.isArray(d.invoices)) {
            invoices.push(...(d.invoices || []));
          }
          if (d.returns && Array.isArray(d.returns)) {
            returns.push(...(d.returns || []));
          }
          if (d.perCashier && Array.isArray(d.perCashier)) {
            d.perCashier.forEach((c: any) => {
              if (c.invoices && Array.isArray(c.invoices)) invoices.push(...c.invoices);
              if (c.returns && Array.isArray(c.returns)) returns.push(...c.returns);
            });
          }
        }
      });
    } catch (e) {
      // ignore malformed archive
    }

    const totalSales2 = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalRefunds2 = returns.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0);

    return {
      date: target,
      invoices,
      returns,
      totalSales: totalSales2,
      totalRefunds: totalRefunds2,
    };
  }

  // Monthly report for a given year/month (defaults to current month)
  getMonthlyReport(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth(); // 0-based

    // filter invoices in month
    const invoicesInMonth = this.invoices.filter(inv => {
      const d = new Date(inv.date_time);
      return d.getFullYear() === y && d.getMonth() === m;
    });

    const returnsInMonth = this.returns.filter(ret => {
      const d = new Date(ret.date_time);
      return d.getFullYear() === y && d.getMonth() === m;
    });

    // group by day
    const daysMap = new Map<string, { date: string; invoices: any[]; returns: any[]; totalSales: number; totalRefunds: number }>();

    invoicesInMonth.forEach(inv => {
      const d = new Date(inv.date_time).toDateString();
      const entry = daysMap.get(d) || { date: d, invoices: [], returns: [], totalSales: 0, totalRefunds: 0 };
      entry.invoices.push(inv);
      entry.totalSales += Number(inv.total) || 0;
      daysMap.set(d, entry);
    });

    returnsInMonth.forEach(ret => {

          // include archived days from storage
          try {
            const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
            archived.forEach((day: any) => {
              const dd = new Date(day.date);
              if (dd.getFullYear() === y && dd.getMonth() === m) {
                const dkey = new Date(day.date).toDateString();
                const entry = daysMap.get(dkey) || { date: dkey, invoices: [], returns: [], totalSales: 0, totalRefunds: 0 };
                entry.invoices = entry.invoices.concat(day.invoices || []);
                entry.returns = entry.returns.concat(day.returns || []);
                entry.totalSales += day.totalSales || 0;
                entry.totalRefunds += day.totalRefunds || 0;
                daysMap.set(dkey, entry);
              }
            });
          } catch (e) {
            // ignore malformed archive
          }
      const d = new Date(ret.date_time).toDateString();
      const entry = daysMap.get(d) || { date: d, invoices: [], returns: [], totalSales: 0, totalRefunds: 0 };
      entry.returns.push(ret);
      entry.totalRefunds += Number(ret.refund_amount) || 0;
      daysMap.set(d, entry);
    });

    const dailyReports = Array.from(daysMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalSales = dailyReports.reduce((s, d) => s + d.totalSales, 0);
    const totalRefunds = dailyReports.reduce((s, d) => s + d.totalRefunds, 0);
    const invoiceCount = invoicesInMonth.length;
    const averageInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0;

    return { month: m, year: y, dailyReports, totalSales, totalRefunds, invoiceCount, averageInvoice };
  }

  printReport() {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <h2>تقرير المبيعات</h2>
        <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
        <h3>ملخص اليوم</h3>
        <p>إجمالي المبيعات: ${this.todaySales}</p>
        <p>عدد الفاتورات: ${this.todayInvoices}</p>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  getTotalSales(): number {
    return this.invoices.reduce((sum, inv) => sum + inv.total, 0);
  }


  getAverageInvoice(): number {
    return this.invoices.length > 0 ? this.getTotalSales() / this.invoices.length : 0;
  }
}
