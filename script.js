// Main page: copy buttons only. Gallery code now lives in photos.js and videos.js.
const $ = s => document.querySelector(s);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
document.querySelectorAll('.cp').forEach(b => b.onclick = async () => {
  try { await navigator.clipboard.writeText(b.dataset.c); toast('Copied: ' + b.dataset.c); } catch (e) { toast(b.dataset.c); }
});

// Latest event post (same data as events.html)
(async () => {
  const box = $('#latestEvent');
  try {
    const it = ((await (await fetch('/api/events')).json()).items || [])[0];
    box.textContent = '';
    if (!it) { box.innerHTML = '<div class="empty">No event posts yet. Check back soon!</div>'; return; }
    const d = document.createElement('div'); d.className = 'pic';
    const i = document.createElement('img'); i.src = it.url; i.alt = 'Latest event picture by ' + it.user;
    i.style.cursor = 'pointer'; i.onclick = () => { location.href = 'events.html'; };
    const p = document.createElement('p'); p.append('Uploaded by ');
    const b = document.createElement('b'); b.textContent = it.user; p.append(b);
    const w = document.createElement('p'); w.className = 'when';
    w.textContent = new Date(it.ts).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
    d.append(i, p, w);
    if (it.note_url) {
      const n = document.createElement('p'); n.className = 'note'; d.append(n);
      fetch(it.note_url).then(r => r.ok ? r.text() : '').then(t => { n.textContent = t; }).catch(() => {});
    }
    box.append(d);
  } catch (e) { box.innerHTML = '<div class="empty">Could not load the latest event.</div>'; }
})();
