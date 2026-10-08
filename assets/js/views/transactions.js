/* ==========================================================
   views/transactions.js - Riwayat transaksi
   ========================================================== */

const TransactionsView = {
  filter: { q: '', from: '', to: '', cashier: '', payment: '', scope: 'all' },

  render(container) {
    // Kasir tidak punya select kasir, jadi filter kasir harus dibuang agar
    // tampilan tidakistenti dengan kontrol yang tersedia.
    if (!Auth.isAdmin()) this.filter.cashier = '';

    container.innerHTML = `
      <div class="toolbar">
        <input type="text" id="f-q" class="form-control grow-input" placeholder="🔍 Cari no. transaksi / nama produk..." value="${Utils.escape(this.filter.q)}">
        <input type="date" id="f-from" class="form-control" value="${this.filter.from}" title="Dari tanggal">
        <input type="date" id="f-to" class="form-control" value="${this.filter.to}" title="Sampai tanggal">
        <select id="f-payment" class="form-select">
          <option value="">Semua Pembayaran</option>
          ${['TUNAI', 'DEBIT', 'QRIS', 'KREDIT'].map(p =>
            `<option ${this.filter.payment === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        ${Auth.isAdmin() ? `
        <select id="f-cashier" class="form-select">
          <option value="">Semua Kasir</option>
          ${Store.db.users.filter(u => u.role === 'kasir').map(u =>
            `<option value="${Utils.escape(u.name)}" ${this.filter.cashier === u.name ? 'selected' : ''}>${Utils.escape(u.name)}</option>`).join('')}
        </select>` : ''}
        <select id="f-scope" class="form-select">
          <option value="all" ${this.filter.scope === 'all' ? 'selected' : ''}>Semua Transaksi</option>
          <option value="mine" ${this.filter.scope === 'mine' ? 'selected' : ''}>Transaksi Saya</option>
        </select>
        <button class="btn btn-outline" id="f-reset">Reset</button>
        <button class="btn btn-outline" id="f-export">⬇ Ekspor CSV</button>
      </div>

      <div class="row g-3 mb-4" id="tx-summary"></div>
      <div class="table-wrap" id="tx-table"></div>
      <div class="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
        <span class="small muted" id="tx-info"></span>
        <div class="d-flex gap-2" id="tx-pager"></div>
      </div>
    `;

    this.bind(container);
    this.renderTable();
  },

  bind(container) {
    const save = () => {
      this.filter = {
        q: container.querySelector('#f-q').value,
        from: container.querySelector('#f-from').value,
        to: container.querySelector('#f-to').value,
        cashier: (container.querySelector('#f-cashier') || {}).value || '',
        payment: container.querySelector('#f-payment').value,
        scope: container.querySelector('#f-scope').value
      };
      this.page = 1;
      this.renderTable();
    };
    ['f-q', 'f-from', 'f-to', 'f-payment', 'f-cashier', 'f-scope']
      .forEach(id => { const el = container.querySelector('#' + id); if (el) el.addEventListener('change', save); });
    container.querySelector('#f-q').addEventListener('keyup', save);
    container.querySelector('#f-reset').addEventListener('click', () => {
      this.filter = { q: '', from: '', to: '', cashier: '', payment: '', scope: 'all' };
      this.page = 1;
      this.render(container);
    });
    container.querySelector('#f-export').addEventListener('click', () => this.exportCSV());
    container.querySelector('#tx-pager').addEventListener('click', e => {
      const b = e.target.closest('[data-page]');
      if (!b) return;
      this.page = Number(b.dataset.page);
      this.renderTable();
    });
  },

  getFiltered() {
    const f = this.filter;
    const q = f.q.toLowerCase();
    return Store.transactions().filter(t => {
      const d = new Date(t.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (f.from && dateStr < f.from) return false;
      if (f.to && dateStr > f.to) return false;
      if (f.payment && t.payment !== f.payment) return false;
      if (f.cashier && t.cashierName !== f.cashier) return false;
      if (f.scope === 'mine' && t.userId !== Auth.user.id) return false;
      if (q) {
        const hay = (t.code + ' ' + t.cashierName + ' ' + t.items.map(i => i.name).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  },

  renderTable() {
    const list = this.getFiltered();
    const perPage = 10;
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    this.page = Math.min(this.page || 1, pages);
    const slice = list.slice((this.page - 1) * perPage, this.page * perPage);

    // ringkasan
    const revenue = list.reduce((s, t) => s + t.total, 0);
    const items = list.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
    const disc = list.reduce((s, t) => s + (t.discount || 0), 0);
    document.getElementById('tx-summary').innerHTML = [
      this.statCard('bg-indigo', '🧾', 'Jumlah Transaksi', list.length),
      this.statCard('bg-green', '💰', 'Total Pendapatan', Utils.rupiah(revenue)),
      this.statCard('bg-sky', '📦', 'Item Terjual', items),
      this.statCard('bg-amber', '🏷', 'Total Diskon', Utils.rupiah(disc))
    ].join('');

    const table = document.getElementById('tx-table');
    table.innerHTML = slice.length ? `<div class="table-scroll"><table>
      <thead><tr>
        <th>No. Transaksi</th><th>Tanggal & Waktu</th><th>Kasir</th>
        <th>Produk</th>
        <th class="text-end">Item</th><th>Pembayaran</th>
        <th class="text-end">Total</th><th class="text-end">Aksi</th>
      </tr></thead>
      <tbody>${slice.map(t => `
        <tr>
          <td class="nowrap"><strong>${t.code}</strong>${t.discount ? '<br><span class="badge badge-warn">Diskon</span>' : ''}</td>
          <td class="nowrap">${Utils.datetime(t.date)}</td>
          <td class="nowrap">${Utils.escape(t.cashierName)}</td>
          <td>${this.productCell(t.items)}</td>
          <td class="text-end">${t.items.reduce((a, i) => a + i.qty, 0)}</td>
          <td><span class="badge badge-muted">${t.payment}</span></td>
          <td class="text-end"><strong>${Utils.rupiah(t.total)}</strong></td>
          <td class="text-end nowrap">
            <button class="btn btn-sm btn-outline" data-detail="${t.id}">Detail</button>
            ${Auth.isAdmin() ? `<button class="btn btn-sm btn-danger" data-del="${t.id}">Hapus</button>` : ''}
          </td>
        </tr>`).join('')}</tbody>
    </table></div>` : UI.empty('Tidak ada transaksi yang cocok', '🔍');

    document.getElementById('tx-info').textContent =
      `Menampilkan ${slice.length} dari ${list.length} transaksi`;

    const pager = document.getElementById('tx-pager');
    pager.innerHTML = pages > 1 ? `
      <button class="btn btn-sm btn-outline" data-page="${this.page - 1}" ${this.page === 1 ? 'disabled' : ''}>‹ Sebelumnya</button>
      <span class="small muted align-self-center">Hal ${this.page} / ${pages}</span>
      <button class="btn btn-sm btn-outline" data-page="${this.page + 1}" ${this.page === pages ? 'disabled' : ''}>Berikutnya ›</button>` : '';

    table.onclick = e => {
      const d = e.target.closest('[data-detail]');
      if (d) return this.showDetail(d.dataset.detail);
      const del = e.target.closest('[data-del]');
      if (del) {
        const trx = Store.db.transactions.find(t => t.id === del.dataset.del);
        UI.confirm('Hapus Transaksi', `Hapus transaksi ${trx.code}? Stok produk tidak dikembalikan.`,
          () => {
            Store.db.transactions = Store.db.transactions.filter(t => t.id !== trx.id);
            Store.save();
            UI.toast('Transaksi dihapus', 'warn');
            this.renderTable();
          }, 'Ya, Hapus');
      }
    };
  },

  /** Kartu statistik, 4 per baris (Bootstrap col-xl-3). */
  statCard(bg, icon, label, value) {
    return `<div class="col-6 col-xl-3">
      <div class="stat">
        <div class="stat-icon ${bg}">${icon}</div>
        <div class="stat-body"><small>${label}</small><strong>${value}</strong></div>
      </div>
    </div>`;
  },

  /** Ringkasan foto + nama produk dalam satu transaksi. */
  productCell(items) {
    if (!items || !items.length) return '<span class="muted">-</span>';
    const shown = items.slice(0, 2);
    const rest = items.length - shown.length;
    return `<div class="d-flex align-items-center gap-2">
      <div class="d-flex">
        ${shown.map((i, k) => `<img src="${Utils.escape(Store.resolveImage(i.image))}" alt="${Utils.escape(i.name)}"
            class="thumb thumb-sm thumb-round" style="margin-left:${k ? '-8px' : '0'}"
            title="${Utils.escape(i.name)} × ${i.qty}">`).join('')}
      </div>
      <span class="small text-truncate" style="max-width:150px">${Utils.escape(shown.map(i => i.name).join(', '))}${rest > 0 ? ' +' + rest : ''}</span>
    </div>`;
  },

  showDetail(id) {
    const t = Store.db.transactions.find(x => x.id === id);
    if (!t) return;
    const body = `
      <div class="panel-flat mb-3" style="box-shadow:none;background:var(--surface-alt)">
        <div class="d-flex justify-content-between"><span class="muted">No. Transaksi</span><strong>${t.code}</strong></div>
        <div class="d-flex justify-content-between"><span class="muted">Tanggal</span><span>${Utils.datetime(t.date)}</span></div>
        <div class="d-flex justify-content-between"><span class="muted">Kasir</span><span>${Utils.escape(t.cashierName)}</span></div>
        <div class="d-flex justify-content-between"><span class="muted">Pembayaran</span><span><span class="badge badge-info">${t.payment}</span></span></div>
      </div>
      <div class="table-wrap mb-3">
        <div class="table-scroll"><table>
          <thead><tr><th>Produk</th><th class="text-end">Harga</th><th class="text-end">Qty</th><th class="text-end">Subtotal</th></tr></thead>
          <tbody>${t.items.length ? t.items.map(i => `
            <tr><td>
              <div class="cell-product">
                ${Utils.productImg(i.image, i.name)}
                <div><strong>${Utils.escape(i.name)}</strong></div>
              </div>
            </td>
              <td class="text-end">${Utils.rupiah(i.price)}</td>
              <td class="text-end">${i.qty}</td>
              <td class="text-end">${Utils.rupiah(i.subtotal)}</td></tr>`).join('')
            : '<tr><td colspan="4" class="muted">Tidak ada item</td></tr>'}
          </tbody>
        </table></div>
      </div>
      <div class="sum-row"><span>Subtotal</span><span>${Utils.rupiah(t.subtotal)}</span></div>
      <div class="sum-row"><span>Diskon</span><span>- ${Utils.rupiah(t.discount || 0)}</span></div>
      ${t.tax ? `<div class="sum-row"><span>Pajak</span><span>${Utils.rupiah(t.tax)}</span></div>` : ''}
      <div class="sum-row total"><span>TOTAL</span><span>${Utils.rupiah(t.total)}</span></div>
      <div class="sum-row"><span>Uang diterima</span><span>${Utils.rupiah(t.paid)}</span></div>
      ${t.change ? `<div class="sum-row"><span>Kembalian</span><span>${Utils.rupiah(t.change)}</span></div>` : ''}
    `;
    const btnClose = document.createElement('button');
    btnClose.className = 'btn btn-outline';
    btnClose.textContent = 'Tutup';
    btnClose.onclick = () => UI.closeModal();
    UI.modal({ title: 'Detail Transaksi', body, footer: [btnClose], wide: true });
  },

  exportCSV() {
    const list = this.getFiltered();
    if (!list.length) { UI.toast('Tidak ada data untuk diekspor', 'warn'); return; }
    const rows = [['Kode', 'Tanggal', 'Kasir', 'Item', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Pembayaran']];
    list.forEach(t => rows.push([
      t.code, Utils.datetime(t.date), t.cashierName,
      t.items.map(i => `${i.name} x${i.qty}`).join(' | '),
      t.subtotal, t.discount || 0, t.tax || 0, t.total, t.payment
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `riwayat-transaksi-${Utils.todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('File CSV berhasil diunduh');
  }
};
