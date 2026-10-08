/* ==========================================================
   views/users.js - Manajemen pengguna (admin)
   ========================================================== */

const UsersView = {
  render(container) {
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" id="u-add">+ Tambah Pengguna</button>
        <div class="grow"></div>
        <div class="panel-flat flex-grow-1" style="max-width:490px;padding:12px 16px;">
          <strong class="small d-block mb-2">Pengaturan Toko</strong>
          <div class="row g-2 col g-4">
            <div class="col-5"><input type="text" id="s-name" class="form-control" placeholder="Nama toko" value="${Utils.escape(Store.db.settings.storeName)}"></div>
            <div class="col-5"><input type="text" id="s-addr" class="form-control" placeholder="Alamat" value="${Utils.escape(Store.db.settings.storeAddress)}"></div>
          </div>
          <button class="btn btn-sm btn-outline mt-2" id="s-save">Simpan Pengaturan</button>
        </div>
      </div>
      <div class="table-wrap" id="u-table"></div>
    `;

    container.querySelector('#u-add').addEventListener('click', () => this.form(null));
    container.querySelector('#s-save').addEventListener('click', () => {
      Store.db.settings.storeName = document.getElementById('s-name').value.trim() || 'Toko Saya';
      Store.db.settings.storeAddress = document.getElementById('s-addr').value.trim();
      Store.db.settings.tax = Math.min(100, Math.max(0, Number(document.getElementById('s-tax').value) || 0));
      Store.save();
      UI.toast('Pengaturan toko disimpan');
      App.render();
    });
    container.querySelector('#u-table').addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]');
      if (ed) return this.form(ed.dataset.edit);
      const del = e.target.closest('[data-del]');
      if (del) {
        const u = Store.db.users.find(x => x.id === del.dataset.del);
        if (u.id === Auth.user.id) { UI.toast('Tidak dapat menghapus akun sendiri', 'error'); return; }
        if (u.role === 'admin' && Store.db.users.filter(x => x.role === 'admin' && x.active).length <= 1) {
          UI.toast('Minimal harus ada 1 admin aktif', 'error');
          return;
        }
        UI.confirm('Hapus Pengguna', `Hapus akun "${u.name}"? Riwayat transaksi tetap tersimpan.`, () => {
          Store.db.users = Store.db.users.filter(x => x.id !== u.id);
          Store.save();
          UI.toast('Pengguna dihapus', 'warn');
          this.renderTable();
        }, 'Ya, Hapus');
      }
    });
    this.renderTable();
  },

  renderTable() {
    const el = document.getElementById('u-table');
    el.innerHTML = `<div class="table-scroll"><table>
      <thead><tr>
        <th>#</th><th>Nama</th><th>Username</th><th>Role</th>
        <th class="text-end">Transaksi</th><th>Status</th><th class="text-end">Aksi</th>
      </tr></thead>
      <tbody>${Store.db.users.map((u, i) => {
        const count = Store.db.transactions.filter(t => t.userId === u.id).length;
        return `<tr>
          <td class="muted">${i + 1}</td>
          <td>
            <div class="cell-product">
              <span class="avatar thumb-round" style="width:32px;height:32px;font-size:13px">${Utils.initials(u.name)}</span>
              <div><strong>${Utils.escape(u.name)}</strong></div>
            </div>
          </td>
          <td><code>${Utils.escape(u.username)}</code></td>
          <td>${u.role === 'admin'
            ? '<span class="badge badge-info">Admin</span>'
            : '<span class="badge badge-muted">Kasir</span>'}</td>
          <td class="text-end">${count}</td>
          <td>${u.active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Nonaktif</span>'}</td>
          <td class="text-end nowrap">
            <button class="btn btn-sm btn-outline" data-edit="${u.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del="${u.id}" ${u.id === Auth.user.id ? 'disabled' : ''}>Hapus</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  form(user) {
    const u = user || { id: null, name: '', username: '', password: '', role: 'kasir', active: true };
    const body = `
      <label class="form-field"><span class="form-label">Nama Lengkap</span>
        <input type="text" id="g-name" class="form-control" value="${Utils.escape(u.name)}"></label>
      <div class="row g-2">
        <div class="col-6">
          <label class="form-field"><span class="form-label">Username</span>
            <input type="text" id="g-username" class="form-control" value="${Utils.escape(u.username)}" ${user ? 'disabled' : ''}></label>
        </div>
        <div class="col-6">
          <label class="form-field"><span class="form-label">${user ? 'Password Baru (kosong = tetap)' : 'Password'}</span>
            <input type="text" id="g-password" class="form-control" placeholder="minimal 4 karakter" value=""></label>
        </div>
      </div>
      <div class="row g-2">
        <div class="col-6">
          <label class="form-field"><span class="form-label">Role</span>
            <select id="g-role" class="form-select">
              <option value="kasir" ${u.role === 'kasir' ? 'selected' : ''}>Kasir</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select></label>
        </div>
        <div class="col-6">
          <label class="form-field"><span class="form-label">Status</span>
            <select id="g-active" class="form-select">
              <option value="1" ${u.active ? 'selected' : ''}>Aktif</option>
              <option value="0" ${!u.active ? 'selected' : ''}>Nonaktif</option>
            </select></label>
        </div>
      </div>
    `;
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Batal';
    btnCancel.onclick = () => UI.closeModal();

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = user ? 'Simpan Perubahan' : 'Tambah Pengguna';
    btnSave.onclick = () => {
      const name = document.getElementById('g-name').value.trim();
      const username = user ? u.username : document.getElementById('g-username').value.trim().toLowerCase();
      const password = document.getElementById('g-password').value.trim();
      const role = document.getElementById('g-role').value;
      const active = document.getElementById('g-active').value === '1';

      if (!name) { UI.toast('Nama wajib diisi', 'error'); return; }
      if (!user) {
        if (!username) { UI.toast('Username wajib diisi', 'error'); return; }
        if (Store.db.users.some(x => x.username.toLowerCase() === username)) {
          UI.toast('Username sudah dipakai', 'error'); return;
        }
      }
      if (!user && password.length < 4) { UI.toast('Password minimal 4 karakter', 'error'); return; }
      if (user && password && password.length < 4) { UI.toast('Password minimal 4 karakter', 'error'); return; }
      if (user && u.role === 'admin' && role !== 'admin' &&
          Store.db.users.filter(x => x.role === 'admin' && x.active).length <= 1) {
        UI.toast('Minimal harus ada 1 admin', 'error'); return;
      }

      if (user) {
        Object.assign(user, { name, role, active });
        if (password) user.password = password;
        if (user.id === Auth.user.id) Auth.user = Store.db.users.find(x => x.id === user.id);
        UI.toast('Pengguna diperbarui');
      } else {
        Store.db.users.push({ id: Utils.uid('u'), name, username, password, role, active });
        UI.toast('Pengguna ditambahkan');
      }
      Store.save();
      UI.closeModal();
      this.renderTable();
    };

    UI.modal({ title: user ? 'Edit Pengguna' : 'Tambah Pengguna', body, footer: [btnCancel, btnSave] });
  }
};
