// Main page: copy buttons only. Gallery code now lives in photos.js and videos.js.
const $ = s => document.querySelector(s);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
document.querySelectorAll('.cp').forEach(b => b.onclick = async () => {
  try { await navigator.clipboard.writeText(b.dataset.c); toast('Copied: ' + b.dataset.c); } catch (e) { toast(b.dataset.c); }
});
