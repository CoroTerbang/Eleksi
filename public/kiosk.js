(function () {
  'use strict';
  const root = document.querySelector('.ballot');
  if (!root) return;
  if (root.dataset.kiosk !== '1') return;

  const overlay = document.createElement('div');
  overlay.id = 'kioskLock';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.92);color:#fff;padding:24px;';
  overlay.innerHTML = `
    <div style="max-width:360px;width:100%;text-align:center">
      <h2 style="margin:0 0 8px">Layar Terkunci</h2>
      <p style="opacity:.8;margin:0 0 16px">Masukkan password admin untuk melanjutkan.</p>
      <input id="kioskPwd" type="password" autocomplete="off" style="width:100%;padding:10px;font-size:16px;border-radius:6px;border:1px solid #555;background:#111;color:#fff">
      <button id="kioskUnlock" style="margin-top:12px;width:100%;padding:10px;font-size:16px;border:0;border-radius:6px;background:#0f7a4d;color:#fff;cursor:pointer">Buka Kunci</button>
      <p id="kioskMsg" style="color:#ff6b6b;margin-top:8px;min-height:18px"></p>
    </div>`;
  document.body.appendChild(overlay);

  let locked = false;
  function lock() {
    if (locked) return;
    locked = true;
    overlay.style.display = 'flex';
    const input = document.getElementById('kioskPwd');
    if (input) input.focus();
  }
  function unlock() {
    locked = false;
    overlay.style.display = 'none';
    const input = document.getElementById('kioskPwd');
    if (input) input.value = '';
    const msg = document.getElementById('kioskMsg');
    if (msg) msg.textContent = '';
    requestFS();
  }
  function requestFS() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) lock();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) lock();
  });
  window.addEventListener('blur', () => lock());

  document.getElementById('kioskUnlock').addEventListener('click', async () => {
    const pwd = document.getElementById('kioskPwd').value;
    const msg = document.getElementById('kioskMsg');
    try {
      const res = await fetch('/vote/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'password=' + encodeURIComponent(pwd)
      });
      const data = await res.json();
      if (data.ok) unlock();
      else if (msg) msg.textContent = 'Password salah.';
    } catch (e) {
      if (msg) msg.textContent = 'Gagal menghubungi server.';
    }
  });
  document.getElementById('kioskPwd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('kioskUnlock').click();
  });

  // enter fullscreen on load
  requestFS();
})();
