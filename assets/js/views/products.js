/* ==========================================================
   views/products.js - Manajemen produk (admin)
   Foto produk: pilih file lokal atau tempel URL gambar.
   ========================================================== */

const ProductsView = {
  q: '',
  cat: 'Semua',

  render(container) {
    const cats = ['Semua', ...Store.categories()];
    container.innerHTML = `
      <div class="toolbar">
        <input type="text" id="p-q" class="form-control grow-input" placeholder="🔍 Cari nama produk..." value="${Utils.escape(this.q)}">
        <select id="p-cat" class="form-select">
          ${cats.map(c => `<option ${c === this.cat ? 'selected' : ''}>${Utils.escape(c)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="p-add">+ Tambah Produk</button>
        <button class="btn btn-outline" id="p-reset-data">⟳ Reset Data Demo</button>
      </div>
      <div class="table-wrap" id="p-table"></div>
    `;

    container.querySelector('#p-q').addEventListener('input', e => { this.q = e.target.value; this.renderTable(); });
    container.querySelector('#p-cat').addEventListener('change', e => { this.cat = e.target.value; this.renderTable(); });
    container.querySelector('#p-add').addEventListener('click', () => this.form(null));
    container.querySelector('#p-reset-data').addEventListener('click', () => {
      UI.confirm('Reset Data Demo', 'Semua produk, pengguna, dan transaksi akan dikembalikan ke data awal. Lanjutkan?',
        () => { Store.resetDemo(); UI.toast('Data demo berhasil direset'); App.render(); }, 'Ya, Reset');
    });
    container.querySelector('#p-table').addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]');
      if (ed) return this.form(Store.product(ed.dataset.edit));
      const st = e.target.closest('[data-stock]');
      if (st) return this.formStock(Store.product(st.dataset.stock));
      const del = e.target.closest('[data-del]');
      if (del) {
        const p = Store.product(del.dataset.del);
        UI.confirm('Hapus Produk', `Hapus produk "${p.name}"?`, () => {
          Store.db.products = Store.db.products.filter(x => x.id !== p.id);
          Store.save();
          UI.toast('Produk dihapus', 'warn');
          this.renderTable();
        }, 'Ya, Hapus');
      }
    });
    this.renderTable();
  },

  renderTable() {
    const q = this.q.toLowerCase();
    const list = Store.products().filter(p =>
      (this.cat === 'Semua' || p.category === this.cat) &&
      (!q || p.name.toLowerCase().includes(q))
    );
    const el = document.getElementById('p-table');
    el.innerHTML = list.length ? `<div class="table-scroll"><table>
      <thead><tr>
        <th style="width:44px">#</th><th>Produk</th><th>Kategori</th>
        <th class="text-end">Harga</th><th class="text-end">Stok</th><th>Status</th><th class="text-end">Aksi</th>
      </tr></thead>
      <tbody>${list.map((p, i) => `
        <tr>
          <td class="muted">${i + 1}</td>
          <td>
            <div class="cell-product">
              ${Utils.productImg(p.image, p.name)}
              <div>
                <strong>${Utils.escape(p.name)}</strong>
                <div class="sku">${Utils.escape(p.id.toUpperCase())}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-muted">${Utils.escape(p.category)}</span></td>
          <td class="text-end">${Utils.rupiah(p.price)}</td>
          <td class="text-end">${p.stock} <span class="small muted">(min ${p.minStock})</span></td>
          <td>${p.stock === 0 ? '<span class="badge badge-danger">Habis</span>'
              : p.stock <= p.minStock ? '<span class="badge badge-warn">Menipis</span>'
              : '<span class="badge badge-success">Aman</span>'}</td>
          <td class="text-end nowrap">
            <button class="btn btn-sm btn-outline" data-stock="${p.id}">Stok</button>
            <button class="btn btn-sm btn-outline" data-edit="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del="${p.id}">Hapus</button>
          </td>
        </tr>`).join('')}</tbody>
    </table></div>` : UI.empty('Belum ada produk', '📦');
  },

  form(product) {
    const p = product || {
      id: null, image: '', name: '', category: '', price: 0, stock: 0, minStock: 5
    };
    const cats = Store.categories();
    const currentImage = Store.resolveImage(p.image);

    const body = `
      <label class="form-field">
        <span class="form-label">Nama Produk</span>
        <input type="text" id="f-name" class="form-control" value="${Utils.escape(p.name)}">
      </label>

      <label class="form-field">
        <span class="form-label">Kategori</span>
        <input type="text" id="f-cat" class="form-control" list="cat-list" value="${Utils.escape(p.category)}">
        <datalist id="cat-list">${cats.map(c => `<option value="${Utils.escape(c)}">`).join('')}</datalist>
      </label>

      <div class="form-field">
        <span class="form-label">Foto Produk</span>
        <div class="d-flex gap-3 align-items-start">
          <div style="width:96px">
            ${Utils.productImg(p.image, p.name, 'thumb thumb-lg')}
          </div>
          <div class="grow">
            <input type="file" id="f-file" class="form-control mb-2" accept="image/*">
            <input type="text" id="f-image" class="form-control" placeholder="atau path/URL foto"
                   value="${Utils.escape(currentImage)}">
            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn btn-sm btn-outline" id="f-preview">Lihat</button>
              <button type="button" class="btn btn-sm btn-outline" id="f-clear">Hapus Foto</button>
            </div>
            <div class="small muted mt-2">Pilih file dari komputer, atau tempel path/URL gambar.
              Foto hasil diunggah disimpan sebagai data URL.</div>
          </div>
        </div>
      </div>

      <div class="row g-2">
        <div class="col-4">
          <label class="form-field"><span class="form-label">Harga (Rp)</span>
            <input type="number" id="f-price" class="form-control" value="${p.price}" min="0"></label>
        </div>
        <div class="col-4">
          <label class="form-field"><span class="form-label">Stok</span>
            <input type="number" id="f-stock" class="form-control" value="${p.stock}" min="0"></label>
        </div>
        <div class="col-4">
          <label class="form-field"><span class="form-label">Stok Minimum</span>
            <input type="number" id="f-min" class="form-control" value="${p.minStock}" min="0"></label>
        </div>
      </div>
    `;

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Batal';
    btnCancel.onclick = () => UI.closeModal();

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = product ? 'Simpan Perubahan' : 'Tambah Produk';
    btnSave.onclick = () => {
      const name = document.getElementById('f-name').value.trim();
      const category = document.getElementById('f-cat').value.trim();
      const image = document.getElementById('f-image').value.trim();
      const price = Math.max(0, Number(document.getElementById('f-price').value) || 0);
      const stock = Math.max(0, Number(document.getElementById('f-stock').value) || 0);
      const minStock = Math.max(0, Number(document.getElementById('f-min').value) || 0);

      if (!name) { UI.toast('Nama produk wajib diisi', 'error'); return; }
      if (price <= 0) { UI.toast('Harga harus lebih dari 0', 'error'); return; }

      if (product) {
        Object.assign(product, { name, category: category || 'Umum', price, stock, minStock, image });
        UI.toast('Produk diperbarui');
      } else {
        const id = Utils.uid('p');
        Store.db.products.push({
          id, name, category: category || 'Umum', price, stock, minStock,
          image: image || Store.imageFor(id)
        });
        UI.toast('Produk ditambahkan');
      }
      Store.save();
      UI.closeModal();
      this.renderTable();
    };

    UI.modal({ title: product ? 'Edit Produk' : 'Tambah Produk', body, footer: [btnCancel, btnSave], wide: true });

    // interaksi pemilih foto
    const body_ = document.getElementById('modal-body');
    body_.querySelector('#f-file').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 400 * 1024) {
        UI.toast('Ukuran foto maksimal 400 KB', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        body_.querySelector('#f-image').value = ev.target.result;
        UI.toast('Foto dimuat, klik Simpan untuk menyimpan');
      };
      reader.onerror = () => UI.toast('Gagal membaca file', 'error');
      reader.readAsDataURL(file);
    });

    const refresh = () => {
      const wrap = body_.querySelector('.thumb-lg')?.parentElement;
      if (!wrap) return;
      wrap.innerHTML = Utils.productImg(body_.querySelector('#f-image').value, 'Preview foto', 'thumb thumb-lg');
    };
    body_.querySelector('#f-preview').onclick = refresh;
    body_.querySelector('#f-clear').onclick = () => {
      body_.querySelector('#f-image').value = '';
      body_.querySelector('#f-file').value = '';
      refresh();
    };
  },

  formStock(p) {
    const body = `
      <p class="mb-2">Stok saat ini: <strong>${p.stock}</strong> · ${Utils.escape(p.name)}</p>
      <div class="row g-2">
        <div class="col-6">
          <label class="form-field"><span class="form-label">Tambah / Kurang (-)</span>
            <input type="number" id="s-delta" class="form-control" value="10"></label>
        </div>
        <div class="col-6">
          <label class="form-field"><span class="form-label">Set Stok Jadi</span>
            <input type="number" id="s-set" class="form-control" value="${p.stock}"></label>
        </div>
      </div>`;
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Batal';
    btnCancel.onclick = () => UI.closeModal();

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = 'Simpan';
    btnSave.onclick = () => {
      const delta = Number(document.getElementById('s-delta').value) || 0;
      const set = document.getElementById('s-set').value;
      p.stock = set !== '' && set !== null ? Math.max(0, Number(set) || 0) : Math.max(0, p.stock + delta);
      Store.save();
      UI.closeModal();
      this.renderTable();
      UI.toast('Stok ' + p.name + ' diperbarui: ' + p.stock);
    };

    UI.modal({ title: 'Atur Stok', body, footer: [btnCancel, btnSave] });
  }
};
