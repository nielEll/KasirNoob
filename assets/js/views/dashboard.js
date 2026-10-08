/* ==========================================================
   views/dashboard.js
   Grid dipakai dari Bootstrap: 4 kartu statistik per baris
   (col-12 col-sm-6 col-xl-3).
   ========================================================== */

const DashboardView = {
  render(container) {
    const today = Store.todayTransactions();
    const week = Store.statsByRange(7);
    const prev = Store.statsByRange(14); // 7 hari sebelumnya + 7 ini
    const prevWeekRevenue = prev.revenue - week.revenue;
    const growth = prevWeekRevenue > 0
      ? ((week.revenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;

    const todayRevenue = today.reduce((s, x) => s + x.total, 0);
    const avgTx = today.length ? todayRevenue / today.length : 0;
    const series = Store.dailySeries(7);
    const top = Store.topProducts(7, 5);
    const maxSeries = Math.max(...series.map(s => s.revenue), 1);
    const topMax = Math.max(...top.map(t => t.revenue), 1);
    const low = Store.lowStock();
    const recent = Store.transactions().slice(0, 6);
    const hourData = this.hourly(today.length ? today : Store.transactions().slice(0, 8));
    const hourMax = Math.max(...hourData.map(x => x.count), 1);

    container.innerHTML = `
      <div class="row g-3 mb-4">
        ${this.statCard('bg-white', '💰', 'Penjualan Hari Ini', Utils.rupiah(todayRevenue), `${today.length} transaksi`)}
        ${this.statCard('bg-white', '📈', 'Penjualan 7 Hari', Utils.rupiah(week.revenue),
          `<span class="delta ${growth >= 0 ? 'up' : 'down'}">${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}% vs minggu lalu</span>`)}
        ${this.statCard('bg-white', '🧾', 'Rata-rata Transaksi', Utils.rupiah(avgTx), `${week.count} transaksi / 7 hari`)}
        ${this.statCard('bg-white', '📦', 'Stok Menipis', low.length + ' produk', low.length ? 'Perlu restock segera' : 'Semua stok aman',
          low.length ? '<span class="delta down">perhatian</span>' : '<span class="delta up">aman</span>')}
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head">
              <div>
                <h3>Grafik Penjualan 7 Hari Terakhir</h3>
                <p>Total omzet harian</p>
              </div>
            </div>
            <div class="chart">
              ${series.map(s => `
                <div class="chart-col" title="${Utils.rupiah(s.revenue)} · ${s.count} transaksi">
                  <span class="chart-val">${s.revenue >= 1e6 ? (s.revenue / 1e6).toFixed(1) + 'jt' : Math.round(s.revenue / 1e3) + 'k'}</span>
                  <div class="chart-bar" style="height:${Math.max(4, (s.revenue / maxSeries) * 100)}%"></div>
                  <span class="chart-lbl">${s.label}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head">
              <div>
                <h3>Jam Tersibuk</h3>
                <p>Jumlah transaksi per jam</p>
              </div>
            </div>
            <div class="chart">
              ${hourData.map(h => `
                <div class="chart-col" title="${h.count} transaksi">
                  <span class="chart-val">${h.count}</span>
                  <div class="chart-bar" style="height:${Math.max(4, (h.count / hourMax) * 100)}%"></div>
                  <span class="chart-lbl">${h.label}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head"><div><h3>Produk Terlaris (7 hari)</h3><p>Berdasarkan nilai penjualan</p></div></div>
            ${top.length ? top.map(t => `
              <div class="prog-row">
                <div class="prog-top"><span>${Utils.escape(t.name)}</span><strong>${Utils.rupiah(t.revenue)}</strong></div>
                <div class="prog-track"><div class="prog-fill" style="width:${(t.revenue / topMax) * 100}%"></div></div>
              </div>`).join('') : UI.empty('Belum ada penjualan', '📊')}
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="panel-flat h-100">
            <div class="card-head">
              <div><h3>Stok Perlu Restock</h3><p>Stok &le; batas minimum</p></div>
              ${Auth.isAdmin() ? '<a href="#/products" class="btn btn-sm btn-outline">Kelola Produk</a>' : ''}
            </div>
            ${low.length ? `<div class="table-scroll"><table>
              <thead><tr><th>Produk</th><th class="text-end">Sisa Stok</th><th class="text-end">Minimum</th></tr></thead>
              <tbody>${low.map(p => `
                <tr>
                  <td>
                    <div class="cell-product">
                      ${Utils.productImg(p.image, p.name)}
                      <div><strong>${Utils.escape(p.name)}</strong></div>
                    </div>
                  </td>
                  <td class="text-end"><span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warn'}">${p.stock}</span></td>
                  <td class="text-end muted">${p.minStock}</td>
                </tr>`).join('')}</tbody>
            </table></div>` : UI.empty('Semua stok aman', '✅')}
          </div>
        </div>
      </div>

      <div class="card-head">
        <div><h3>Transaksi Terbaru</h3><p>5 transaksi terakhir</p></div>
        <a href="#/transactions" class="btn btn-sm btn-primary">Lihat Semua Riwayat</a>
      </div>
      <div class="table-wrap">
        ${recent.length ? `<div class="table-scroll"><table>
          <thead><tr>
            <th>No. Transaksi</th><th>Tanggal</th><th>Kasir</th>
            <th>Produk</th>
            <th class="text-end">Item</th><th class="text-end">Total</th>
          </tr></thead>
          <tbody>${recent.map(t => `
            <tr>
              <td><strong>${t.code}</strong></td>
              <td class="nowrap">${Utils.datetime(t.date)}</td>
              <td>${Utils.escape(t.cashierName)}</td>
              <td>${this.productCell(t.items)}</td>
              <td class="text-end">${t.items.reduce((a, i) => a + i.qty, 0)}</td>
              <td class="text-end"><strong>${Utils.rupiah(t.total)}</strong></td>
            </tr>`).join('')}</tbody>
        </table></div>` : UI.empty('Belum ada transaksi', '🧾')}
      </div>
    `;
  },

  /** Ringkasan produk dalam satu transaksi, dengan foto. */
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

  statCard(bg, icon, label, value, sub) {
    return `<div class="col-12 col-sm-6 col-xl-3">
      <div class="stat">
        <div class="stat-icon ${bg}">${icon}</div>
        <div class="stat-body">
          <small>${label}</small>
          <strong>${value}</strong>
          <span class="small muted">${sub}</span>
        </div>
      </div>
    </div>`;
  },

  hourly(txs) {
    const buckets = [
      { label: '08', from: 8, to: 9 }, { label: '09', from: 9, to: 10 },
      { label: '10', from: 10, to: 11 }, { label: '11', from: 11, to: 12 },
      { label: '12', from: 12, to: 13 }, { label: '13', from: 13, to: 14 },
      { label: '14', from: 14, to: 15 }, { label: '15', from: 15, to: 16 },
      { label: '16', from: 16, to: 17 }, { label: '17', from: 17, to: 18 },
      { label: '18', from: 18, to: 19 }, { label: '19', from: 19, to: 20 }
    ];
    return buckets.map(b => ({
      label: b.label,
      count: txs.filter(t => { const h = new Date(t.date).getHours(); return h >= b.from && h < b.to; }).length
    }));
  }
};
