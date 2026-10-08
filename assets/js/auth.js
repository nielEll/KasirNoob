/* ==========================================================
   auth.js - Autentikasi & sesi
   ========================================================== */

const Auth = {
  user: null,

  login(username, password) {
    const raw = String(username || '').trim();
    if (!raw || !password) return { ok: false, msg: 'Username dan password wajib diisi.' };

    const u = Store.findUser(raw, password);
    if (!u) {
      const found = Store.db.users.find(x => x.username.toLowerCase() === raw.toLowerCase());
      if (found && !found.active) return { ok: false, msg: 'Akun ini dinonaktifkan. Hubungi admin.' };
      return { ok: false, msg: 'Username atau password salah.' };
    }
    this.user = u;
    sessionStorage.setItem(SESSION_KEY, u.id);
    return { ok: true, user: u };
  },

  restore() {
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const u = Store.db.users.find(x => x.id === id && x.active);
    this.user = u || null;
    return this.user;
  },

  logout() {
    this.user = null;
    sessionStorage.removeItem(SESSION_KEY);
  },

  isAdmin() { return !!this.user && this.user.role === 'admin'; },
  isKasir() { return !!this.user && this.user.role === 'kasir'; },

  /** Hanya admin boleh akses route */
  canAccess(route) {
    if (!this.user) return false;
    if (route === 'products' || route === 'users' || route === 'report') return this.isAdmin();
    return true;
  }
};
