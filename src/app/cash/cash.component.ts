import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InvoiceService } from './invoice.service';

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

interface InvoiceItem {
  product: Product;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface ReturnItem {
  product: Product;
  quantity: number;
  reason?: string;
}

interface ReturnRecord {
  id: string;
  invoice_id: string;
  invoice_number: string;
  date_time: string;
  processed_by: string;
  items: ReturnItem[];
  refund_amount: number;
  reason?: string;
}

interface Installment {
  installment_number: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  invoice_ids: string[];
  created_at: string;
  last_purchase_at: string;
}
interface PointsHistoryEntry {
  date: string;
  points: number;
  reason?: string;
  invoice_id?: string;
}

// extend Customer with email and loyalty
interface CustomerExtended extends Customer {
  email?: string;
  points?: number;
  points_history?: PointsHistoryEntry[];
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
  items: InvoiceItem[];
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

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent implements OnInit {
  products: Product[] = [
    { id: '1', hgn: 'CHR001', name: 'كرسي خشبي', cost_price: 100, wholesale_price: 130, sale_price: 150, min_stock: 5, stock_quantity: 50 },
    { id: '2', hgn: 'TBL001', name: 'طاولة قهوة', cost_price: 180, wholesale_price: 220, sale_price: 250, min_stock: 2, stock_quantity: 20 },
    { id: '3', hgn: 'SHL001', name: 'رف جداري', cost_price: 120, wholesale_price: 160, sale_price: 180, min_stock: 3, stock_quantity: 15 },
    { id: '4', hgn: 'CAB001', name: 'دولاب ملابس', cost_price: 380, wholesale_price: 450, sale_price: 500, min_stock: 1, stock_quantity: 10 },
    { id: '5', hgn: 'BED001', name: 'سرير مفرد', cost_price: 600, wholesale_price: 720, sale_price: 800, min_stock: 2, stock_quantity: 8 },
  ];

  invoices: Invoice[] = [];

  currentUser: any = null;
  currentPage: string = 'cash';
  todayReturnsTotal: number = 0;
  returns: ReturnRecord[] = [];
  customers: Customer[] = [];
  searchQuery: string = '';
  selectedInvoiceDetail: Invoice | null = null;
  
  // Invoice form
  customer_name: string = '';
  customer_phone: string = '';
  customer_email: string = '';
  discount_percent: number = 0;
  payment_method: string = 'نقدي';
  invoice_items: InvoiceItem[] = [];
  // manual total override
  manualTotalEnabled: boolean = false;
  manual_total: number | null = null;

  // Installment fields
  installment_count: number = 0;
  installment_dates: { [key: number]: string } = {};
  installment_amounts: { [key: number]: number } = {};
  showInstallmentForm: boolean = false;
  
  // prevent double save
  savingInvoice: boolean = false;

  // Product search
  selectedProduct: Product | null = null;
  // price mode: false => use sale_price, true => use wholesale_price
  useWholesalePrice: boolean = false;
  selected_unit_price: number = 0;
  product_quantity: number = 1;
  // (removed per-card manual overrides) unit price can be edited in invoice items
  // returns search & matched results
  returnSearchQuery: string = '';
  matchedInvoices: Invoice[] = [];
  // debug: last added/updated invoice item (for UI debug)
  // removed debug field

  constructor(private router: Router, private invoiceService: InvoiceService) {}

  ngOnInit() {
    const user = localStorage.getItem('user');
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = JSON.parse(user);
    // default to sale price (as-before)
    this.useWholesalePrice = false;
    this.loadProducts();
    this.loadInvoices();
    // keep invoices in sync with the InvoiceService
    this.invoiceService.invoices$.subscribe(list => {
      this.invoices = list || [];
    });
    this.loadReturns();
    this.loadCustomers();
    this.updateTodayReturns();

    window.addEventListener('storage', () => {
      this.loadProducts();
      this.loadReturns();
      this.loadCustomers();
      this.updateTodayReturns();
    });
  }

  updateTodayReturns() {
    const todayKey = new Date().toDateString();
    const total = (this.returns || []).filter(r => {
      const d = new Date(r.date_time);
      return d.toDateString() === todayKey;
    }).reduce((s, r) => s + (Number(r.refund_amount) || 0), 0);
    this.todayReturnsTotal = total;
  }

  onProductSelect() {
    if (this.selectedProduct) {
      this.selected_unit_price = this.getActivePrice(this.selectedProduct);
      this.product_quantity = 1;
    } else {
      this.selected_unit_price = 0;
    }
  }

  quickAdd(product: Product) {
    // set selection and populate price/quantity fields so cashier can confirm
    this.selectedProduct = product;
    this.onProductSelect();
    this.product_quantity = 1;
    // immediately add the selected product to the invoice
    this.addToInvoice();
  }

  // return active price (handles boolean or string 'true' from template bindings)
  getActivePrice(p: Product): number {
    const useWholesale = !!this.useWholesalePrice;
    const sale = (p.sale_price !== undefined && p.sale_price !== null) ? p.sale_price : (p.wholesale_price !== undefined ? p.wholesale_price : p.cost_price || 0);
    const wholesale = (p.wholesale_price !== undefined && p.wholesale_price !== null) ? p.wholesale_price : (p.sale_price !== undefined ? p.sale_price : p.cost_price || 0);
    const chosen = useWholesale ? wholesale : sale;
    return Number(chosen) || 0;
  }

  // update existing invoice items to reflect current price mode
  onPriceModeChange() {
    this.invoice_items.forEach(item => {
      const newPrice = Number(this.getActivePrice(item.product));
      item.unit_price = newPrice;
      item.line_total = Number(item.quantity) * Number(item.unit_price);
      this.updateItemPrice(item);
    });
  }

  loadInvoices() {
    const data = localStorage.getItem('invoices');
    this.invoices = data ? JSON.parse(data) : [];
  }

  loadReturns() {
    const data = localStorage.getItem('returns');
    this.returns = data ? JSON.parse(data) : [];
  }

  saveInvoices() {
    localStorage.setItem('invoices', JSON.stringify(this.invoices));
  }

  saveReturns() {
    localStorage.setItem('returns', JSON.stringify(this.returns));
  }

  loadProducts() {
    const data = localStorage.getItem('products');
    if (data) {
      this.products = JSON.parse(data);
    } else {
      // seed initial sample products in storage on first run
      localStorage.setItem('products', JSON.stringify(this.products));
    }
  }

  saveProducts() {
    localStorage.setItem('products', JSON.stringify(this.products));
  }

  loadCustomers() {
    const data = localStorage.getItem('customers');
    this.customers = data ? JSON.parse(data) : [];
  }

  saveCustomers() {
    localStorage.setItem('customers', JSON.stringify(this.customers));
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  toggleInstallmentForm() {
    this.showInstallmentForm = this.payment_method === 'قسط';
    if (!this.showInstallmentForm) {
      this.installment_count = 0;
      this.installment_dates = {};
    }
  }

  viewInvoiceDetails(invoice: Invoice) {
    this.selectedInvoiceDetail = invoice;
  }

  closeInvoiceDetails() {
    this.selectedInvoiceDetail = null;
  }

  calculateTotalInstallments(): number {
    let total = 0;
    for (let key in this.installment_amounts) {
      total += this.installment_amounts[key] || 0;
    }
    return total;
  }

  generateInstallments(totalAmount: number): Installment[] {
    const installments: Installment[] = [];
    
    for (let i = 1; i <= this.installment_count; i++) {
      const dueDate = this.installment_dates[i];
      const amount = this.installment_amounts[i] || 0;
      
      installments.push({
        installment_number: i,
        amount: amount,
        due_date: dueDate,
        paid: false
      });
    }
    return installments;
  }

  addToInvoice() {
    if (!this.selectedProduct || this.product_quantity <= 0) {
      alert('يرجى تحديد منتج وكمية صحيحة');
      return;
    }

    if (this.product_quantity > this.selectedProduct.stock_quantity) {
      alert('الكمية المتاحة غير كافية');
      return;
    }

    const existingItem = this.invoice_items.find(i => i.product.id === this.selectedProduct!.id);

    if (existingItem) {
      if (existingItem.quantity + this.product_quantity > this.selectedProduct.stock_quantity) {
        alert('الكمية المتاحة غير كافية');
        return;
      }
      // determine desired unit price based on selected price mode
      const desiredUnitPrice = Number(this.getActivePrice(this.selectedProduct));
      // if price mode changed from previous line, update the unit price
      if (existingItem.unit_price !== desiredUnitPrice) {
        existingItem.unit_price = desiredUnitPrice;
      }
      existingItem.quantity += this.product_quantity;
      // normalize and recalc
      existingItem.unit_price = Number(existingItem.unit_price) || 0;
      existingItem.quantity = Number(existingItem.quantity) || 0;
      this.updateItemPrice(existingItem);
      // ensure Angular detects the change
      this.invoice_items = this.invoice_items.slice();
    } else {
      // prefer manually prepared selected_unit_price if cashier changed it in UI
      const unitPrice = Number(this.selected_unit_price) || Number(this.getActivePrice(this.selectedProduct));
      const item: InvoiceItem = {
        product: this.selectedProduct,
        quantity: Number(this.product_quantity) || 0,
        unit_price: unitPrice,
        line_total: 0,
      };
      this.updateItemPrice(item);
      this.invoice_items.push(item);
      // ensure Angular detects the change
      this.invoice_items = this.invoice_items.slice();
    }

    // reset selection but keep prices reset
    this.selectedProduct = null;
    this.product_quantity = 1;
    this.selected_unit_price = 0;
  }

  removeFromInvoice(index: number) {
    this.invoice_items.splice(index, 1);
  }

  get subtotal(): number {
    return this.invoice_items.reduce((sum, item) => sum + item.line_total, 0);
  }

  get discount_amount(): number {
    return (this.subtotal * this.discount_percent) / 100;
  }

  get total(): number {
    // total after applying percentage discount; tax removed per request
    return this.subtotal - this.discount_amount;
  }

  // displayed total (allows manual override)
  get displayedTotal(): number {
    if (this.manualTotalEnabled && this.manual_total !== null && !isNaN(Number(this.manual_total))) {
      return Number(this.manual_total);
    }
    return this.total;
  }

  confirmInvoice() {
    if (this.savingInvoice) return;
    this.savingInvoice = true;
    if (this.invoice_items.length === 0) {
      this.savingInvoice = false;
      alert('يرجى إضافة منتجات للفاتورة');
      return;
    }

    if (!this.customer_name.trim()) {
      alert('يرجى إدخال اسم العميل');
      return;
    }

    // Validate installments if selected
    if (this.payment_method === 'قسط') {
      if (this.installment_count <= 0) {
        alert('يرجى تحديد عدد الأقساط');
        return;
      }
      let totalInstallments = 0;
      for (let i = 1; i <= this.installment_count; i++) {
        if (!this.installment_dates[i]) {
          alert(`يرجى إدخال تاريخ استحقاق القسط ${i}`);
          return;
        }
        const amount = this.installment_amounts[i];
        if (!amount || amount <= 0) {
          alert(`يرجى إدخال مبلغ صحيح للقسط ${i}`);
          return;
        }
        totalInstallments += amount;
      }
      if (totalInstallments !== this.total) {
        alert(`إجمالي الأقساط (${totalInstallments}) يجب أن يساوي الإجمالي (${this.total})`);
        return;
      }
    }

    // sequential invoice number starting from 1 (persisted in localStorage)
    const counter = parseInt(localStorage.getItem('invoice_counter') || '0', 10) + 1;
    localStorage.setItem('invoice_counter', String(counter));

    const invoice: Invoice = {
      id: Date.now().toString(),
      invoice_number: String(counter),
      date_time: new Date().toISOString(),
      date_time_display: new Date().toLocaleString('ar-EG'),
      cashier_id: this.currentUser.id,
      cashier_name: this.currentUser.name,
      customer_name: this.customer_name,
      customer_phone: this.customer_phone || undefined,
      items: JSON.parse(JSON.stringify(this.invoice_items)),
      subtotal: this.subtotal,
      discount_percent: this.discount_percent,
      discount_amount: this.discount_amount,
      tax_amount: 0,
      total: this.displayedTotal,
      status: 'مكتملة',
      payment_method: this.payment_method,
    };

    // Prevent duplicate invoice (same customer, total and identical items)
    const existing = (localStorage.getItem('invoices') ? JSON.parse(localStorage.getItem('invoices')!) : []) as Invoice[];
    const isSameItems = (a: InvoiceItem[], b: InvoiceItem[]) => {
      if (!a || !b || a.length !== b.length) return false;
      const sortedA = a.slice().sort((x,y) => x.product.id.localeCompare(y.product.id));
      const sortedB = b.slice().sort((x,y) => x.product.id.localeCompare(y.product.id));
      for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i].product.id !== sortedB[i].product.id) return false;
        if (Number(sortedA[i].quantity) !== Number(sortedB[i].quantity)) return false;
        if (Number(sortedA[i].unit_price) !== Number(sortedB[i].unit_price)) return false;
      }
      return true;
    };

    const duplicate = existing.find(inv => inv.customer_name === invoice.customer_name && Number(inv.total) === Number(invoice.total) && isSameItems(inv.items, invoice.items));
    if (duplicate) {
      this.savingInvoice = false;
      alert('هذه الفاتورة محفوظه بالفعل');
      return;
    }

    // Add installments if payment method is قسط
    if (this.payment_method === 'قسط') {
      invoice.installment_count = this.installment_count;
      invoice.installments = this.generateInstallments(this.total);
    }

    // Update stock
    this.invoice_items.forEach(item => {
      const product = this.products.find(p => p.id === item.product.id);
      if (product) {
        product.stock_quantity -= item.quantity;
      }
    });
    this.saveProducts();

    // Update customers database/list
    const phone = (this.customer_phone || '').trim();
    const name = (this.customer_name || '').trim();
    const email = (this.customer_email || '').trim();
    const nowIso = new Date().toISOString();
    let customer: CustomerExtended | undefined = this.customers.find((c: any) => (phone ? c.phone === phone : c.name === name)) as CustomerExtended | undefined;
    if (customer) {
      customer.invoice_ids.push(invoice.id);
      customer.last_purchase_at = nowIso;
      if (email) customer.email = email;
    } else {
      customer = {
        id: Date.now().toString() + '_' + Math.random().toString(36).slice(2),
        name,
        phone,
        email,
        invoice_ids: [invoice.id],
        created_at: nowIso,
        last_purchase_at: nowIso,
        points: 0,
        points_history: [],
      } as CustomerExtended;
      this.customers.push(customer as any);
    }

    // Loyalty points removed: no points are granted or redeemed on invoice save

    this.saveCustomers();

    this.invoices.push(invoice);
    this.saveInvoices();
    this.invoiceService.addInvoice(invoice);
    alert('تم حفظ الفاتورة بنجاح');
    this.resetInvoice();
    this.savingInvoice = false;
  }

  /**** Returns handling ****/
  // find invoices by exact invoice number or by customer name (partial)
  findInvoicesByQuery(q: string): Invoice[] {
    if (!q) return [];
    const trimmed = q.trim();
    const results: Invoice[] = [];

    // exact invoice number in live invoices
    const byNumber = this.invoices.filter(inv => String(inv.invoice_number) === trimmed);
    if (byNumber.length) return byNumber;

    // match by customer name or phone in live invoices
    const byName = this.invoices.filter(inv => (inv.customer_name && inv.customer_name.toLowerCase().includes(trimmed.toLowerCase())) || (inv.customer_phone && String(inv.customer_phone).toLowerCase().includes(trimmed.toLowerCase())) );
    results.push(...byName);

    // also search archived_days (stored in localStorage) so returns can target older invoices
    try {
      const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
      archived.forEach((day: any, dayIndex: number) => {
        // direct day.invoices
        if (Array.isArray(day.invoices)) {
          day.invoices.forEach((inv: any, idx: number) => {
            if (!inv) return;
            const matches = String(inv.invoice_number) === trimmed || (inv.customer_name && String(inv.customer_name).toLowerCase().includes(trimmed.toLowerCase()));
            if (matches) {
              const copy: Invoice = JSON.parse(JSON.stringify(inv));
              (copy as any).__archived = { dayIndex, type: 'invoices', idx };
              results.push(copy);
            }
          });
        }

        // perCashier grouped invoices
        if (Array.isArray(day.perCashier)) {
          day.perCashier.forEach((c: any, cashierIndex: number) => {
            if (!Array.isArray(c.invoices)) return;
            c.invoices.forEach((inv: any, idx: number) => {
              if (!inv) return;
              const matches = String(inv.invoice_number) === trimmed || (inv.customer_name && String(inv.customer_name).toLowerCase().includes(trimmed.toLowerCase()));
              if (matches) {
                const copy: Invoice = JSON.parse(JSON.stringify(inv));
                (copy as any).__archived = { dayIndex, type: 'perCashier', cashierIndex, idx };
                results.push(copy);
              }
            });
          });
        }
      });
    } catch (e) {
      // ignore archive parse errors
    }

    return results;
  }

  selectedReturnInvoice: Invoice | null = null;
  // map item index -> return quantity
  returnQuantities: { [index: number]: number } = {};
  returnReason: string = '';

  selectInvoiceForReturn(inv: Invoice) {
    // keep metadata if invoice came from archive
    const copy: any = JSON.parse(JSON.stringify(inv));
    if ((inv as any).__archived) copy.__archived = (inv as any).__archived;
    this.selectedReturnInvoice = copy as Invoice;
    // reset quantities to 0
    this.returnQuantities = {};
    (this.selectedReturnInvoice.items || []).forEach((it, idx) => this.returnQuantities[idx] = 0);
    this.returnReason = '';
    // initialize preview after selection
    this.updateReturnPreview();
  }

  // set all return quantities to full item quantities
  setFullReturn() {
    if (!this.selectedReturnInvoice) return;
    this.selectedReturnInvoice.items.forEach((it, idx) => this.returnQuantities[idx] = it.quantity);
    this.updateReturnPreview();
  }

  // compute preview refund amount based on current returnQuantities
  updateReturnPreview() {
    if (!this.selectedReturnInvoice) { this._currentReturnPreview = 0; return; }
    let total = 0;
    (this.selectedReturnInvoice.items || []).forEach((it: any, idx: number) => {
      const q = Number(this.returnQuantities[idx] || 0);
      total += (Number(it.product.sale_price) || 0) * q;
    });
    this._currentReturnPreview = total;
  }

  _currentReturnPreview: number = 0;

  processReturn() {
    if (!this.selectedReturnInvoice) {
      alert('يرجى اختيار فاتورة من أجل المرتجع');
      return;
    }

    const itemsToReturn: ReturnItem[] = [];
    this.selectedReturnInvoice.items.forEach((it, idx) => {
      const q = Number(this.returnQuantities[idx] || 0);
      if (q > 0) {
        const product = this.products.find(p => p.id === it.product.id);
        const allowed = product ? product.stock_quantity + it.quantity : it.quantity; // allow up to originally sold
        const qty = Math.min(q, it.quantity);
        itemsToReturn.push({ product: it.product, quantity: qty, reason: this.returnReason || '' });
      }
    });

    if (itemsToReturn.length === 0) {
      alert('يرجى تحديد عناصر للمرتجع');
      return;
    }

    const refund = itemsToReturn.reduce((s, r) => s + r.product.sale_price * r.quantity, 0);

    const ret: ReturnRecord = {
      id: Date.now().toString(),
      invoice_id: this.selectedReturnInvoice.id,
      invoice_number: this.selectedReturnInvoice.invoice_number,
      date_time: new Date().toLocaleString('ar-EG'),
      processed_by: this.currentUser.name,
      items: itemsToReturn,
      refund_amount: refund,
      reason: this.returnReason || undefined,
    };

    // update stock: increase stock by returned qty
    itemsToReturn.forEach(r => {
      const product = this.products.find(p => p.id === r.product.id);
      if (product) product.stock_quantity += r.quantity;
    });
    this.saveProducts();

    // remove the original invoice from live invoices or from archived_days if it was archived
    if ((this.selectedReturnInvoice as any).__archived) {
      try {
        const meta = (this.selectedReturnInvoice as any).__archived;
        const archived = JSON.parse(localStorage.getItem('archived_days') || '[]');
        const day = archived[meta.dayIndex];
        if (day) {
          if (meta.type === 'invoices' && Array.isArray(day.invoices)) {
            day.invoices = day.invoices.filter((inv: any, idx: number) => idx !== meta.idx && String(inv.invoice_number) !== String(this.selectedReturnInvoice!.invoice_number));
          }
          if (meta.type === 'perCashier' && Array.isArray(day.perCashier)) {
            const cashier = day.perCashier[meta.cashierIndex];
            if (cashier && Array.isArray(cashier.invoices)) {
              cashier.invoices = cashier.invoices.filter((inv: any, idx: number) => idx !== meta.idx && String(inv.invoice_number) !== String(this.selectedReturnInvoice!.invoice_number));
            }
          }
          localStorage.setItem('archived_days', JSON.stringify(archived));
        }
      } catch (e) {
        // ignore archive errors
      }
    } else {
      // ensure comparison uses strings to avoid mismatches between number/string types
      this.invoices = this.invoices.filter(i => String(i.invoice_number) !== String(this.selectedReturnInvoice!.invoice_number));
    }

    // store the return record
    this.returns.push(ret);
    this.saveReturns();
    this.saveInvoices();
    // update today's return totals shown in cashier UI
    this.updateTodayReturns();

    alert('تم معالجة المرتجع، المبلغ المسترد: ' + refund + ' جنيه');
    this.selectedReturnInvoice = null;
    this.returnQuantities = {};
    this.returnReason = '';
  }

  resetInvoice() {
    this.customer_name = '';
    this.customer_phone = '';
    this.customer_email = '';
    this.discount_percent = 0;
    this.invoice_items = [];
    this.selectedProduct = null;
    this.product_quantity = 1;
    this.payment_method = 'نقدي';
    this.installment_count = 0;
    this.installment_dates = {};
    this.installment_amounts = {};
    this.showInstallmentForm = false;
  }

  getCurrentCustomer(): CustomerExtended | undefined {
    const phone = (this.customer_phone || '').trim();
    const name = (this.customer_name || '').trim();
    return this.customers.find((c: any) => (phone ? c.phone === phone : c.name === name)) as CustomerExtended | undefined;
  }

  // loyalty points removed: helper methods cleared

  getFilteredProducts(): Product[] {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) return this.products;

    const searchWords = q.split(' ').filter(w => w.length > 0);

    return this.products.filter(p => {
      const productName = p.name.toLowerCase();
      const productHgn = p.hgn ? p.hgn.toLowerCase() : '';

      if (productName.includes(q) || productHgn.includes(q)) {
        return true;
      }

      return searchWords.every(word => {
        return productName.includes(word) || productHgn.includes(word);
      });
    });
  }

  updateItemPrice(item: InvoiceItem) {
    item.line_total = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
  }

  printInvoice(invoice: Invoice) {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <h2>فاتورة</h2>
        <p>رقم الفاتورة: ${invoice.invoice_number}</p>
        <p>التاريخ: ${invoice.date_time_display || invoice.date_time}</p>
        <p>اسم العميل: ${invoice.customer_name}</p>
        ${invoice.customer_phone ? `<p>رقم الهاتف: ${invoice.customer_phone}</p>` : ''}
        <table border="1" style="width:100%; direction:rtl">
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.product.name}</td>
              <td>${item.quantity}</td>
              <td>${item.unit_price}</td>
              <td>${item.line_total}</td>
            </tr>
          `).join('')}
        </table>
        <p><strong>الإجمالي: ${invoice.total}</strong></p>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }
}
