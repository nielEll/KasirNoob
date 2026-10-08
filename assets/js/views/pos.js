/* ==========================================================
   views/pos.js - Halaman kasir / point of sale
   ========================================================== */

const POSView = {
  cart: [],
  discount: 0,
  category: 'Semua',
  search: '',
  payment: 'TUNAI',

  render(container) {
    container.innerHTML = `
      <div class="pos-layout">
        <div>
          <div class="toolbar">
            <input type="text" id="pos-search" class="form-control grow-input" placeholder="🔍 Cari produk..." value="${Utils.escape(this.search)}">
            <button class="btn btn-outline" id="pos-refresh">⟳ Refresh</button>
          </div>
          <div class="cat-tabs" id="pos-cats">
            ${['Semua', ...Store.categories()].map(c =>
              `<button class="cat-tab ${c === this.category ? 'active' : ''}" data-cat="${Utils.escape(c)}">${Utils.escape(c)}</button>`
            ).join('')}
          </div>
          <div class="row g-3" id="pos-products"></div>
        </div>

        <div class="cart">
          <div class="cart-head d-flex justify-content-between align-items-center">
            <div>
              <strong>Keranjang</strong>
              <div class="small muted" id="cart-count">0 item</div>
            </div>
            <button class="btn btn-sm btn-outline" id="cart-clear">Kosongkan</button>
          </div>
          <div class="cart-items" id="cart-items"></div>
          <div class="cart-summary">
            <div class="sum-row"><span>Subtotal</span><span id="sum-subtotal">Rp0</span></div>
            <div class="sum-row"><span>Diskon</span><span id="sum-discount">Rp0</span></div>
            <div class="sum-row"><span>Pajak</span><span id="sum-tax">Rp0</span></div>
            <div class="sum-row total"><span>TOTAL</span><span id="sum-total">Rp0</span></div>
          </div>
          <div class="cart-actions">
            <button class="btn btn-outline" id="cart-discount">🏷 Diskon</button>
            <button class="btn btn-primary" id="cart-pay">💳 Bayar</button>
          </div>
        </div>
      </div>
    `;

    this.bind(container);
    this.renderProducts();
    this.renderCart();
  },

  bind(container) {
    container.querySelector('#pos-search').addEventListener('input', e => {
      this.search = e.target.value;
      this.renderProducts();
    });
    container.querySelector('#pos-cats').addEventListener('click', e => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      this.category = btn.dataset.cat;
      container.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b === btn));
      this.renderProducts();
    });
    container.querySelector('#pos-refresh').addEventListener('click', () => {
      this.search = '';
      this.category = 'Semua';
      this.render(container);
      UI.toast('Daftar produk diperbarui');
    });
    container.querySelector('#pos-products').addEventListener('click', e => {
      const tile = e.target.closest('[data-product]');
      if (tile) this.addToCart(tile.dataset.product);
    });
    container.querySelector('#cart-items').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const { act, id } = btn.dataset;
      if (act === 'inc') this.changeQty(id, 1);
      if (act === 'dec') this.changeQty(id, -1);
      if (act === 'rm') {
        this.cart = this.cart.filter(i => i.productId !== id);
        this.renderCart();
      }
    });
    container.querySelector('#cart-clear').addEventListener('click', () => {
      if (!this.cart.length) return;
      UI.confirm('Kosongkan Keranjang', 'Hapus semua item dari keranjang?', () => {
        this.cart = [];
        this.discount = 0;
        this.renderCart();
      }, 'Ya, Kosongkan');
    });
    container.querySelector('#cart-discount').addEventListener('click', () => this.promptDiscount());
    container.querySelector('#cart-pay').addEventListener('click', () => this.checkout());
  },

  renderProducts() {
    const el = document.getElementById('pos-products');
    if (!el) return;
    const q = this.search.toLowerCase();
    const list = Store.products().filter(p => {
      const okCat = this.category === 'Semua' || p.category === this.category;
      const okSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return okCat && okSearch;
    });
    if (!list.length) {
      el.className = 'row g-3';
      el.innerHTML = `<div class="col-12">${UI.empty('Produk tidak ditemukan', '🔍')}</div>`;
      return;
    }
    // 4 kartu per baris di layar besar, 3 di tablet, 2 di ponsel
    el.className = 'row g-3';
    el.innerHTML = list.map(p => `
      <div class="col-6 col-md-4 col-xl-3">
        <button class="product-tile ${p.stock <= 0 ? 'disabled' : ''}" data-product="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          ${Utils.productImg(p.image, p.name, 'tile-photo')}
          <span class="tile-body">
            <span class="name">${Utils.escape(p.name)}</span>
            <span class="cat">${Utils.escape(p.category)}</span>
            <span class="price">${Utils.rupiah(p.price)}</span>
            <span class="stock ${p.stock === 0 ? 'out' : (p.stock <= p.minStock ? 'low' : '')}">${
              p.stock === 0 ? 'Stok habis' : 'Stok: ' + p.stock
            }</span>
          </span>
        </button>
      </div>`).join('');
  },

  addToCart(id) {
    const p = Store.product(id);
    if (!p) return;
    const inCart = this.cart.find(i => i.productId === id);
    const current = inCart ? inCart.qty : 0;
    if (current >= p.stock) {
      UI.toast(`Stok ${p.name} tidak cukup`, 'error');
      return;
    }
    if (inCart) inCart.qty++;
    else this.cart.push({ productId: p.id, name: p.name, image: p.image, price: p.price, qty: 1 });
    this.renderCart();
  },

  changeQty(id, delta) {
    const item = this.cart.find(i => i.productId === id);
    if (!item) return;
    const p = Store.product(id);
    if (delta > 0 && item.qty >= p.stock) {
      UI.toast(`Stok ${item.name} hanya ${p.stock}`, 'warn');
      return;
    }
    item.qty += delta;
    if (item.qty <= 0) this.cart = this.cart.filter(i => i.productId !== id);
    this.renderCart();
  },

  totals() {
    const subtotal = this.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = this.discount || 0;
    const taxRate = Number(Store.db.settings.tax) || 0;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * taxRate / 100);
    return { subtotal, discount, tax, total: taxable + tax };
  },

  renderCart() {
    const itemsEl = document.getElementById('cart-items');
    if (!itemsEl) return;
    const totalItems = this.cart.reduce((s, i) => s + i.qty, 0);

    itemsEl.innerHTML = this.cart.length ? this.cart.map(i => `
      <div class="cart-item">
        ${Utils.productImg(i.image, i.name, 'thumb thumb-sm')}
        <div class="info">
          <strong>${Utils.escape(i.name)}</strong>
          <small>${Utils.rupiah(i.price)} × ${i.qty}</small>
        </div>
        <div class="qty-ctl">
          <button data-act="dec" data-id="${i.productId}">−</button>
          <span>${i.qty}</span>
          <button data-act="inc" data-id="${i.productId}">+</button>
        </div>
        <div class="sub">${Utils.rupiah(i.price * i.qty)}</div>
        <button class="icon-btn" data-act="rm" data-id="${i.productId}" title="Hapus">&times;</button>
      </div>`).join('') : `<div class="cart-empty">Keranjang masih kosong.<br>Klik produk untuk menambahkan.</div>`;

    document.getElementById('cart-count').textContent = totalItems + ' item';
    const t = this.totals();
    document.getElementById('sum-subtotal').textContent = Utils.rupiah(t.subtotal);
    document.getElementById('sum-discount').textContent = '- ' + Utils.rupiah(t.discount);
    document.getElementById('sum-tax').textContent = Utils.rupiah(t.tax);
    document.getElementById('sum-total').textContent = Utils.rupiah(t.total);
    document.getElementById('cart-pay').disabled = !this.cart.length;
  },

  promptDiscount() {
    if (!this.cart.length) { UI.toast('Keranjang masih kosong', 'warn'); return; }
    const t = this.totals();
    const body = `
      <label class="form-field">
        <span class="form-label">Jenis Diskon</span>
        <select id="d-type" class="form-select">
          <option value="amount">Potongan Tetap (Rp)</option>
          <option value="percent">Persentase (%)</option>
        </select>
      </label>
      <label class="form-field">
        <span class="form-label">Nilai Diskon</span>
        <input type="number" id="d-value" class="form-control" min="0" value="0">
      </label>
      <p class="small muted mb-0">Subtotal saat ini: <strong>${Utils.rupiah(t.subtotal)}</strong></p>
    `;
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Batal';
    btnCancel.onclick = () => UI.closeModal();

    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary';
    btnApply.textContent = 'Terapkan';
    btnApply.onclick = () => {
      const type = document.getElementById('d-type').value;
      const val = Math.max(0, Number(document.getElementById('d-value').value) || 0);
      const subtotal = this.totals().subtotal;
      const disc = type === 'percent' ? Math.round(subtotal * Math.min(val, 100) / 100) : val;
      this.discount = Math.min(disc, subtotal);
      UI.closeModal();
      this.renderCart();
      UI.toast('Diskon diterapkan: ' + Utils.rupiah(this.discount));
    };

    UI.modal({ title: 'Beri Diskon', body, footer: [btnCancel, btnApply] });
  },

  checkout() {
    if (!this.cart.length) return;
    const t = this.totals();
    const quick = [5000, 10000, 20000, 50000, 100000];

    const body = `
      <div class="panel-flat mb-3" style="box-shadow:none;background:var(--surface-alt)">
        <div class="sum-row"><span>Subtotal</span><strong>${Utils.rupiah(t.subtotal)}</strong></div>
        <div class="sum-row"><span>Diskon</span><strong>- ${Utils.rupiah(t.discount)}</strong></div>
        <div class="sum-row"><span>Pajak</span><strong>${Utils.rupiah(t.tax)}</strong></div>
        <div class="sum-row total"><span>TOTAL</span><span>${Utils.rupiah(t.total)}</span></div>
      </div>

      <div class="form-field"><span class="form-label">Metode Pembayaran</span>
        <div class="pay-grid">
          ${['TUNAI', 'DEBIT', 'QRIS', 'KREDIT'].map(p =>
            `<button type="button" class="pay-btn ${p === this.payment ? 'active' : ''}" data-pay="${p}">${p}</button>`).join('')}
        </div>
      </div>

      ${this.payment === 'TUNAI' ? `
        <label class="form-field"><span class="form-label">Uang Diterima (Rp)</span>
          <input type="number" id="pay-cash" class="form-control" value="${t.total}" min="0"></label>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small muted">Kembalian</span>
          <strong id="pay-change">${Utils.rupiah(0)}</strong>
        </div>
        <div class="d-flex flex-wrap gap-2">
          ${quick.map(q => `<button type="button" class="btn btn-sm btn-outline" data-quick="${q}">${Utils.rupiah(q)}</button>`).join('')}
        </div>` : `
        <div class="panel-flat" style="background:var(--success-soft);color:#15803d;border-color:transparent">
          Pembayaran <strong>${this.payment}</strong> sebesar <strong>${Utils.rupiah(t.total)}</strong>.
          Pastikan pembayaran sudah diterima sebelum konfirmasi.
        </div>`}
    `;

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Batal';
    btnCancel.onclick = () => UI.closeModal();

    const btnPay = document.createElement('button');
    btnPay.className = 'btn btn-success';
    btnPay.textContent = '✓ Selesaikan Transaksi';
    btnPay.onclick = () => {
      let paid = t.total, change = 0;
      if (this.payment === 'TUNAI') {
        paid = Number(document.getElementById('pay-cash').value) || 0;
        if (paid < t.total) {
          UI.toast('Uang diterima kurang dari total', 'error');
          return;
        }
        change = paid - t.total;
      }
      this.finish(paid, change);
    };

    UI.modal({ title: 'Pembayaran', body, footer: [btnCancel, btnPay] });

    const root = document.getElementById('modal-root');
    root.querySelectorAll('[data-pay]').forEach(b => {
      b.onclick = () => {
        this.payment = b.dataset.pay;
        UI.closeModal();
        this.checkout();
      };
    });
    root.querySelectorAll('[data-quick]').forEach(b => {
      b.onclick = () => {
        const input = document.getElementById('pay-cash');
        input.value = (Number(input.value) || 0) + Number(b.dataset.quick);
        input.dispatchEvent(new Event('input'));
      };
    });
    const cashInput = document.getElementById('pay-cash');
    if (cashInput) {
      cashInput.addEventListener('input', e => {
        const change = (Number(e.target.value) || 0) - t.total;
        const el = document.getElementById('pay-change');
        el.textContent = Utils.rupiah(Math.max(0, change));
        el.style.color = change < 0 ? 'var(--danger)' : 'var(--success)';
      });
    }
  },

  finish(paid, change) {
    const t = this.totals();
    const trx = {
      id: Utils.uid('t'),
      code: 'TRX' + String(Store.db.transactions.length + 1).padStart(5, '0'),
      date: new Date().toISOString(),
      userId: Auth.user.id,
      cashierName: Auth.user.name,
      items: this.cart.map(i => ({
        productId: i.productId, image: i.image, name: i.name,
        price: i.price, qty: i.qty, subtotal: i.price * i.qty
      })),
      subtotal: t.subtotal,
      discount: t.discount,
      tax: t.tax,
      total: t.total,
      payment: this.payment,
      paid, change
    };
    Store.saveTransaction(trx);
    UI.closeModal();
    this.cart = [];
    this.discount = 0;
    this.payment = 'TUNAI';
    this.showReceipt(trx);
    App.render();
  },

  showReceipt(trx) {
    const s = Store.db.settings;
    const body = `
      <div class="receipt">
        <div class="r-head">
          <strong>${Utils.escape(s.storeName)}</strong>
          <div>${Utils.escape(s.storeAddress)}</div>
          <div>${Utils.datetime(trx.date)}</div>
        </div>
        <hr>
        <div class="d-flex justify-content-between"><span>No. Transaksi</span><strong>${trx.code}</strong></div>
        <div class="d-flex justify-content-between"><span>Kasir</span><span>${Utils.escape(trx.cashierName)}</span></div>
        <hr>
        ${trx.items.map(i => `
          <div class="r-item">
            ${Utils.productImg(i.image, i.name)}
            <div class="grow">
              ${Utils.escape(i.name)}<br>
              <span class="muted">${i.qty} × ${Utils.rupiah(i.price)}</span>
            </div>
            <div class="text-end">${Utils.rupiah(i.subtotal)}</div>
          </div>`).join('')}
        <hr>
        <div class="d-flex justify-content-between"><span>Subtotal</span><span>${Utils.rupiah(trx.subtotal)}</span></div>
        ${trx.discount ? `<div class="d-flex justify-content-between"><span>Diskon</span><span>- ${Utils.rupiah(trx.discount)}</span></div>` : ''}
        ${trx.tax ? `<div class="d-flex justify-content-between"><span>Pajak</span><span>${Utils.rupiah(trx.tax)}</span></div>` : ''}
        <div class="d-flex justify-content-between r-total"><span>TOTAL</span><span>${Utils.rupiah(trx.total)}</span></div>
        <div class="d-flex justify-content-between"><span>Bayar (${trx.payment})</span><span>${Utils.rupiah(trx.paid)}</span></div>
        ${trx.change ? `<div class="d-flex justify-content-between"><span>Kembalian</span><span>${Utils.rupiah(trx.change)}</span></div>` : ''}
        <hr>
        <div class="text-center small">Terima kasih telah berbelanja!</div>
      </div>`;

    const btnClose = document.createElement('button');
    btnClose.className = 'btn btn-outline';
    btnClose.textContent = 'Tutup';
    btnClose.onclick = () => { UI.closeModal(); App.render(); };

    const btnNew = document.createElement('button');
    btnNew.className = 'btn btn-primary';
    btnNew.textContent = 'Transaksi Baru';
    btnNew.onclick = () => { UI.closeModal(); App.render(); };

    UI.modal({ title: 'Transaksi Berhasil', body, footer: [btnClose, btnNew] });
    UI.toast('Transaksi ' + trx.code + ' tersimpan');
  }
};
