/* ==========================================================
   ui.js - Komponen UI bersama (toast, modal, konfirmasi)
   ========================================================== */

const UI = {
  toast(msg, type = 'success') {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .25s';
      setTimeout(() => el.remove(), 250);
    }, 2600);
  },

  modal({ title, body, footer, wide = false }) {
    const root = document.getElementById('modal-root');
    const modal = root.querySelector('.modal');
    modal.classList.toggle('wide', wide);
    modal.classList.toggle('modal-dialog-centered', true);
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const foot = document.getElementById('modal-foot');
    foot.innerHTML = '';
    (footer || []).forEach(b => foot.appendChild(b));
    root.classList.remove('hidden');
    return root;
  },

  closeModal() {
    document.getElementById('modal-root').classList.add('hidden');
  },

  confirm(title, message, onYes, yesLabel = 'Ya, Lanjutkan', danger = true) {
    const btnNo = document.createElement('button');
    btnNo.className = 'btn btn-outline';
    btnNo.textContent = 'Batal';
    btnNo.onclick = () => UI.closeModal();

    const btnYes = document.createElement('button');
    btnYes.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    btnYes.textContent = yesLabel;
    btnYes.onclick = () => { UI.closeModal(); onYes(); };

    UI.modal({ title, body: `<p>${Utils.escape(message)}</p>`, footer: [btnNo, btnYes] });
  },

  /** Baris produk / transaksi kosong */
  empty(message, icon = '📭') {
    return `<div class="empty"><span class="big">${icon}</span>${message}</div>`;
  }
};

document.addEventListener('click', e => {
  if (e.target.hasAttribute('data-close-modal')) UI.closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') UI.closeModal();
});
