/* ==========================================================
   app.js - Router & bootstrap
   ========================================================== */

const App = {
  routes: {
    dashboard: { title: 'Dashboard', subtitle: 'Ringkasan penjualan & aktivitas toko', view: () => DashboardView },
    pos: { title: 'Kasir / POS', subtitle: 'Masukkan pesanan pelanggan', view: () => POSView },
    transactions: { title: 'Riwayat Transaksi', subtitle: 'Daftar & pencarian transaksi penjualan', view: () => TransactionsView },
    products: { title: 'Manajemen Produk', subtitle: 'Katalog, harga, dan stok barang', view: () => ProductsView },
    users: { title: 'Manajemen Pengguna', subtitle: 'Akun admin dan kasir', view: () => UsersView },
    report: { title: 'Laporan Penjualan', subtitle: 'Analisis penjualan periode tertentu', view: () => ReportView }
  },

  current: null,

  init() {
    Store.init();
    this.bindShell();
    this.tickClock();

    const user = Auth.restore();
    if (user) this.startApp();
    else this.showLogin();

    window.addEventListener('hashchange', () => this.route());
  },

  /* ---------- login ---------- */
  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    const u = document.getElementById('login-username');
    u.value = '';
    document.getElementById('login-password').value = '';
    setTimeout(() => u.focus(), 100);

    const form = document.getElementById('login-form');
    if (form.dataset.ready) return;
    form.dataset.ready = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const err = document.getElementById('login-error');
      const res = Auth.login(
        document.getElementById('login-username').value,
        document.getElementById('login-password').value
      );
      if (!res.ok) {
        err.textContent = res.msg;
        err.classList.remove('hidden');
        return;
      }
      err.classList.add('hidden');
      document.getElementById('login-password').value = '';
      UI.toast('Selamat datang, ' + res.user.name + '!');
      this.startApp();
      if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
    });
  },

  startApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    document.getElementById('user-name').textContent = Auth.user.name;
    document.getElementById('user-role').textContent = Auth.user.role;
    document.getElementById('user-avatar').textContent = Auth.user.name.charAt(0).toUpperCase();
    document.getElementById('store-name-label').textContent = Store.db.settings.storeName;

    // sembunyikan menu khusus admin untuk kasir
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.classList.toggle('hidden', !Auth.isAdmin());
    });

    if (!Auth.canAccess(this.parseHash())) location.hash = '#/dashboard';
    this.route();
  },

  /* ---------- shell ---------- */
  bindShell() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      UI.confirm('Keluar', 'Anda ingin keluar dari aplikasi?', () => {
        Auth.logout();
        location.hash = '';
        this.showLogin();
        UI.toast('Anda telah keluar', 'warn');
      }, 'Ya, Keluar', false);
    });

    document.getElementById('menu-toggle').addEventListener('click', () => this.toggleSidebar(true));
    document.getElementById('sidebar-backdrop').addEventListener('click', () => this.toggleSidebar(false));
  },

  toggleSidebar(open) {
    document.querySelector('.sidebar').classList.toggle('open', open);
    document.getElementById('sidebar-backdrop').classList.toggle('show', open);
  },

  tickClock() {
    const update = () => {
      const el = document.getElementById('clock');
      if (!el) return;
      const d = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const p = x => String(x).padStart(2, '0');
      el.textContent = `${days[d.getDay()]}, ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    update();
    setInterval(update, 30000);
  },

  /* ---------- routing ---------- */
  parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return this.routes[h] ? h : 'dashboard';
  },

  route() {
    if (!Auth.user) return this.showLogin();
    const name = this.parseHash();
    if (!Auth.canAccess(name)) {
      UI.toast('Akses ditolak untuk role ' + Auth.user.role, 'error');
      location.hash = '#/dashboard';
      return;
    }

    const r = this.routes[name];
    this.current = name;
    document.getElementById('page-title').textContent = r.title;
    document.getElementById('page-subtitle').textContent = r.subtitle;
    document.querySelectorAll('#main-menu a').forEach(a =>
      a.classList.toggle('active', a.dataset.route === name));
    this.toggleSidebar(false);

    const container = document.getElementById('view-container');
    container.innerHTML = '';
    r.view().render(container);
  },

  render() {
    if (Auth.user) this.route();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
