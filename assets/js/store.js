/* ==========================================================
   store.js - Data layer (localStorage)
   ========================================================== */

const DB_KEY = 'kasirpro_db_v1';
const SESSION_KEY = 'kasirpro_session';

const Store = {
  db: null,

  /* ---------- bootstrap ---------- */
  init() {
    if (!localStorage.getItem(DB_KEY)) {
      this.db = this.seed();
      this.save();
    } else {
      try {
        this.db = JSON.parse(localStorage.getItem(DB_KEY));
      } catch (e) {
        this.db = this.seed();
      }
      this.migrate();
    }
    return this.db;
  },

  migrate() {
    const d = this.db;
    if (!d.settings) d.settings = { storeName: 'Toko Saya', storeAddress: 'Jl. Merdeka No.1', tax: 0 };
    ['users', 'products', 'transactions'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });

    // Backfill foto produk untuk data lama yang masih memakai emoji.
    // Foto disimpan lokal di assets/img/products/<id>.jpg
    d.products.forEach(p => { if (!p.image) p.image = this.imageFor(p.id); });
    d.transactions.forEach(t => {
      if (Array.isArray(t.items)) t.items.forEach(it => { if (!it.image) it.image = it.productId ? this.imageFor(it.productId) : ''; });
    });
    this.save();
  },

  /** Path foto produk, dengan fallback ke placeholder bila file tidak ada. */
  imageFor(id) {
    return id ? `assets/img/products/${id}.jpg` : 'assets/img/products/placeholder.jpg';
  },

  /** Resolve foto produk ke path absolut relatif terhadap dokumen. */
  resolveImage(path) {
    const p = path || 'assets/img/products/placeholder.jpg';
    if (/^https?:/i.test(p) || p.startsWith('data:')) return p;
    return p;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  },

  seed() {
    return {
      settings: {
        storeName: 'Toko Serba Ada',
        storeAddress: 'Jl. Merdeka No. 10, Jakarta',
        tax: 0,
        currency: 'Rp'
      },
      users: [
        { id: 'u1', username: 'admin', password: 'admin123', name: 'Admin Toko', role: 'admin', active: true },
        { id: 'u2', username: 'kasir', password: 'kasir123', name: 'Budi Santoso', role: 'kasir', active: true },
        { id: 'u3', username: 'siti', password: 'siti123', name: 'Siti Aminah', role: 'kasir', active: true }
      ],
      products: [
        { id: 'p1', image: 'assets/img/products/p1.jpg', name: 'Nasi Goreng Spesial', category: 'Makanan', price: 28000, stock: 40, minStock: 10 },
        { id: 'p2', image: 'assets/img/products/p2.jpg', name: 'Mie Ayam Bakso', category: 'Makanan', price: 25000, stock: 35, minStock: 10 },
        { id: 'p3', image: 'assets/img/products/p3.jpg', name: 'Burger Keju', category: 'Makanan', price: 32000, stock: 24, minStock: 8 },
        { id: 'p4', image: 'assets/img/products/p4.jpg', name: 'Pizza Salami', category: 'Makanan', price: 55000, stock: 15, minStock: 5 },
        { id: 'p5', image: 'assets/img/products/p5.jpg', name: 'Salad Wortel', category: 'Makanan', price: 18000, stock: 30, minStock: 10 },
        { id: 'p6', image: 'assets/img/products/p6.jpg', name: 'Es Teh Manis', category: 'Minuman', price: 8000, stock: 120, minStock: 30 },
        { id: 'p7', image: 'assets/img/products/p7.jpg', name: 'Kopi Susu', category: 'Minuman', price: 18000, stock: 60, minStock: 20 },
        { id: 'p8', image: 'assets/img/products/p8.jpg', name: 'Jus Jeruk Segar', category: 'Minuman', price: 15000, stock: 45, minStock: 15 },
        { id: 'p9', image: 'assets/img/products/p9.jpg', name: 'Air Mineral 600ml', category: 'Minuman', price: 5000, stock: 150, minStock: 40 },
        { id: 'p10', image: 'assets/img/products/p10.jpg', name: 'Kue Cokelat', category: 'Snack', price: 15000, stock: 28, minStock: 10 },
        { id: 'p11', image: 'assets/img/products/p11.jpg', name: 'Kentang Goreng', category: 'Snack', price: 15000, stock: 20, minStock: 10 },
        { id: 'p12', image: 'assets/img/products/p12.jpg', name: 'Cokelat Batang', category: 'Snack', price: 12000, stock: 8, minStock: 20 }
      ],
      transactions: this.seedTransactions()
    };
  },

  seedTransactions() {
    const txs = [];
    const users = [{ id: 'u2', name: 'Budi Santoso' }, { id: 'u3', name: 'Siti Aminah' }];
    const catalog = [
      ['p1', 'Nasi Goreng Spesial', 28000], ['p2', 'Mie Ayam Bakso', 25000],
      ['p3', 'Burger Keju', 32000], ['p6', 'Es Teh Manis', 8000],
      ['p7', 'Kopi Susu', 18000], ['p10', 'Kue Cokelat', 15000],
      ['p11', 'Kentang Goreng', 15000], ['p5', 'Salad Wortel', 18000]
    ];
    const now = new Date();
    let n = 1;
    for (let day = 6; day >= 0; day--) {
      const count = 3 + (day % 3);
      for (let k = 0; k < count; k++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day,
          8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));
        const u = users[Math.floor(Math.random() * users.length)];
        const items = [];
        const used = new Set();
        const itemCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < itemCount; i++) {
          const p = catalog[Math.floor(Math.random() * catalog.length)];
          if (used.has(p[0])) continue;
          used.add(p[0]);
          const qty = 1 + Math.floor(Math.random() * 3);
          items.push({
            productId: p[0], image: this.imageFor(p[0]), name: p[1], price: p[2],
            qty, subtotal: p[2] * qty
          });
        }
        const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
        const disc = Math.random() < 0.25 ? Math.min(5000, subtotal * 0.1) : 0;
        txs.push({
          id: 't' + n, code: 'TRX' + String(n).padStart(5, '0'),
          date: d.toISOString(), userId: u.id, cashierName: u.name,
          items, subtotal, discount: disc, tax: 0, total: subtotal - disc,
          payment: ['TUNAI', 'DEBIT', 'QRIS'][Math.floor(Math.random() * 3)],
          paid: subtotal - disc, change: 0
        });
        n++;
      }
    }
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /* ---------- users ---------- */
  findUser(username, password) {
    const u = this.db.users.find(x => x.username.toLowerCase() === String(username).toLowerCase().trim());
    if (!u || u.password !== password) return null;
    if (!u.active) return null;
    return u;
  },

  /* ---------- products ---------- */
  products() { return this.db.products; },
  product(id) { return this.db.products.find(p => p.id === id); },
  categories() { return [...new Set(this.db.products.map(p => p.category))].sort(); },
  lowStock() { return this.db.products.filter(p => p.stock <= p.minStock); },

  /* ---------- transactions ---------- */
  transactions() {
    return [...this.db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  saveTransaction(trx) {
    this.db.transactions.push(trx);
    // kurangi stok
    trx.items.forEach(it => {
      const p = this.product(it.productId);
      if (p) p.stock = Math.max(0, p.stock - it.qty);
    });
    this.save();
  },

  todayTransactions() {
    const t = new Date();
    return this.db.transactions.filter(x => {
      const d = new Date(x.date);
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    });
  },

  /* ---------- reports ---------- */
  statsByRange(days) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    const txs = this.db.transactions.filter(x => new Date(x.date) >= start && new Date(x.date) <= end);
    const revenue = txs.reduce((s, x) => s + x.total, 0);
    const items = txs.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
    return { txs, revenue, items, count: txs.length, avg: txs.length ? revenue / txs.length : 0 };
  },

  dailySeries(days) {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dayTxs = this.db.transactions.filter(x => {
        const xd = new Date(x.date);
        return `${xd.getFullYear()}-${xd.getMonth() + 1}-${xd.getDate()}` === key;
      });
      out.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        revenue: dayTxs.reduce((s, x) => s + x.total, 0),
        count: dayTxs.length
      });
    }
    return out;
  },

  topProducts(days = 7, limit = 5) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    const map = {};
    this.db.transactions
      .filter(x => new Date(x.date) >= start)
      .forEach(x => x.items.forEach(it => {
        map[it.name] = (map[it.name] || 0) + it.qty * it.price;
      }));
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  },

  byCashier(days = 7) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    const map = {};
    this.db.transactions.filter(x => new Date(x.date) >= start).forEach(x => {
      map[x.cashierName] = map[x.cashierName] || { name: x.cashierName, count: 0, revenue: 0 };
      map[x.cashierName].count++;
      map[x.cashierName].revenue += x.total;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  },

  /* ---------- reset ---------- */
  resetDemo() {
    this.db = this.seed();
    this.save();
  }
};

/* ---------- helpers ---------- */
const Utils = {
  uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
  rupiah(n) {
    return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  },
  num(n) {
    return (Number(n) || 0).toLocaleString('id-ID');
  },
  datetime(iso) {
    const d = new Date(iso);
    const p = x => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },
  date(iso) {
    const d = new Date(iso);
    const p = x => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  },
  time(iso) {
    const d = new Date(iso);
    const p = x => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  },
  todayStr() {
    const d = new Date();
    const p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /**
   * Tag <img> untuk foto produk, dengan placeholder bila foto gagal dimuat.
   * src di-escape karena bisa berasal dari data localStorage.
   */
  productImg(src, alt, className = 'thumb') {
    const s = Store.resolveImage(src);
    return `<img src="${Utils.escape(s)}" alt="${Utils.escape(alt || 'Foto produk')}" `
      + `class="${className}" loading="lazy" decoding="async" `
      + `onerror="this.onerror=null;this.src='assets/img/products/placeholder.svg'">`;
  },

  /** Inisial untuk avatar / label bila foto tidak tersedia. */
  initials(name) {
    return String(name || '?').trim().charAt(0).toUpperCase();
  }
};
