/* ==========================================================
   views/report.js - Laporan penjualan (admin)
   ========================================================== */

const ReportView = {
  days: 7,

  render(container) {
    const s = Store.statsByRange(this.days);
    const series = Store.dailySeries(this.days);
    const max = Math.max(...series.map(x => x.revenue), 1);
    const byCashier = Store.byCashier(this.days);
    const top = Store.topProducts(this.days, 8);
    const topMax = Math.max(...top.map(t => t.revenue), 1);

    // produk terlaris per kuantitas
    const qtyMap = {};
    s.txs.forEach(t => t.items.forEach(i => {
      qtyMap[i.name] = qtyMap[i.name] || { name: i.name, qty: 0, revenue: 0, image: i.image };
      qtyMap[i.name].qty += i.qty;
      qtyMap[i.name].revenue += i.subtotal;
    }));
    const topQty = Object.values(qtyMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

    const payments = {};
    s.txs.forEach(t => payments[t.payment] = (payments[t.payment] || 0) + t.total);

    container.innerHTML = `
      <div class="toolbar">
        <select id="r-days" class="form-select">
          ${[7, 14, 30].map(d => `<option value="${d}" ${d === this.days ? 'selected' : ''}>${d} hari terakhir</option>`).join('')}
        </select>
        <button class="btn btn-outline" id="r-print">Cetak Laporan</button>
      </div>

      <div class="row g-3 mb-4">
        ${this.statCard('bg-indigo', '💰', 'Total Pendapatan', Utils.rupiah(s.revenue))}
        ${this.statCard('bg-green', '🧾', 'Jumlah Transaksi', s.count)}
        ${this.statCard('bg-sky', '📦', 'Item Terjual', s.items)}
        ${this.statCard('bg-amber', '🎯', 'Rata-rata / Transaksi', Utils.rupiah(s.avg))}
      </div>

      <div class="panel-flat mb-4">
        <div class="card-head"><div><h3>Tren Penjualan</h3><p>Omzet harian selama ${this.days} hari</p></div></div>
        <div class="chart" style="height:230px">
          ${series.map(x => `
            <div class="chart-col" title="${Utils.rupiah(x.revenue)} · ${x.count} transaksi">
              <span class="chart-val">${Math.round(x.revenue / 1000)}k</span>
              <div class="chart-bar" style="height:${Math.max(3, (x.revenue / max) * 100)}%"></div>
              <span class="chart-lbl">${x.label}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head"><div><h3>Penjualan per Kasir</h3><p>Performa ${this.days} hari terakhir</p></div></div>
            ${byCashier.length ? `<div class="table-scroll"><table>
              <thead><tr><th>Kasir</th><th class="text-end">Transaksi</th><th class="text-end">Omzet</th></tr></thead>
              <tbody>${byCashier.map(c => `<tr>
                <td>
                  <div class="cell-product">
                    <span class="avatar thumb-round" style="width:30px;height:30px;font-size:12px">${Utils.initials(c.name)}</span>
                    <div><strong>${Utils.escape(c.name)}</strong></div>
                  </div>
                </td>
                <td class="text-end">${c.count}</td>
                <td class="text-end"><strong>${Utils.rupiah(c.revenue)}</strong></td>
              </tr>`).join('')}</tbody>
            </table></div>` : UI.empty('Belum ada data', '📊')}
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head"><div><h3>Metode Pembayaran</h3><p>Komposisi omzet</p></div></div>
            ${Object.keys(payments).length ? Object.entries(payments)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => `<div class="prog-row">
                <div class="prog-top"><span>${k}</span><strong>${Utils.rupiah(v)} (${((v / s.revenue) * 100).toFixed(1)}%)</strong></div>
                <div class="prog-track"><div class="prog-fill" style="width:${(v / s.revenue) * 100}%;background:var(--success)"></div></div>
              </div>`).join('') : UI.empty('Belum ada data', '💳')}
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head"><div><h3>10 Produk Terlaris</h3><p>Berdasarkan kuantitas terjual</p></div></div>
            ${topQty.length ? `<div class="table-scroll"><table>
              <thead><tr><th>#</th><th>Produk</th><th class="text-end">Qty</th><th class="text-end">Omzet</th></tr></thead>
              <tbody>${topQty.map((t, i) => `<tr>
                <td class="muted">${i + 1}</td>
                <td>
                  <div class="cell-product">
                    ${Utils.productImg(t.image, t.name)}
                    <div><strong>${Utils.escape(t.name)}</strong></div>
                  </div>
                </td>
                <td class="text-end">${t.qty}</td>
                <td class="text-end">${Utils.rupiah(t.revenue)}</td>
              </tr>`).join('')}</tbody>
            </table></div>` : UI.empty('Belum ada data', '📦')}
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head"><div><h3>8 Produk Highest Value</h3><p>Berdasarkan nilai penjualan</p></div></div>
            ${top.length ? top.map(t => `<div class="prog-row">
              <div class="prog-top"><span>${Utils.escape(t.name)}</span><strong>${Utils.rupiah(t.revenue)}</strong></div>
              <div class="prog-track"><div class="prog-fill" style="width:${(t.revenue / topMax) * 100}%"></div></div>
            </div>`).join('') : UI.empty('Belum ada data', '📊')}
          </div>
        </div>
      </div>
    `;

    container.querySelector('#r-days').addEventListener('change', e => {
      this.days = Number(e.target.value);
      this.render(container);
    });
    container.querySelector('#r-print').addEventListener('click', () => window.print());
  },

  /** Kartu statistik, 4 per baris (Bootstrap col-xl-3). */
  statCard(bg, icon, label, value) {
    return `<div class="col-6 col-xl-3">
      <div class="stat">
        <div class="stat-icon ${bg}">${icon}</div>
        <div class="stat-body"><small>${label}</small><strong>${value}</strong></div>
      </div>
    </div>`;
  }
};
