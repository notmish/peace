// Event gallery. Codes are verified server-side (api/verify.py), same as the main gallery.
const $ = s => document.querySelector(s);
const tok = {upload: null, admin: null};
let items = [], rm = false, scope = 'upload', after = null;

const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
const open = id => $(id).classList.add('on'), close = id => $(id).classList.remove('on');
async function api(path, body) {
  const r = await fetch('/api/' + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.modal').classList.remove('on'));
$('#big').onclick = () => close('#big');

function ask(sc, title, text, fn) {
  scope = sc; after = fn; $('#cT').textContent = title; $('#cP').textContent = text;
  $('#code').value = ''; $('#cE').textContent = ''; open('#mCode'); setTimeout(() => $('#code').focus(), 50);
}
async function submitCode() {
  const btn = $('#cOk'); btn.disabled = true; $('#cE').textContent = '';
  try { tok[scope] = (await api('verify', {pin: $('#code').value.trim(), scope})).token; close('#mCode'); after && after(); }
  catch (e) { $('#cE').textContent = e.message; }
  btn.disabled = false;
}
$('#cOk').onclick = submitCode;
$('#code').onkeydown = e => { if (e.key === 'Enter') submitCode(); };

$('#upBtn').onclick = () => ask('upload', 'Gallery permission', 'Enter the gallery permission code to upload.', () => { $('#uE').textContent = ''; open('#mUp'); });
$('#rmBtn').onclick = () => {
  if (rm) { rm = false; $('#rmBtn').textContent = 'Admin: Remove Photos'; render(); return; }
  ask('admin', 'Admin access', 'Enter the admin password to remove photos.', () => { rm = true; $('#rmBtn').textContent = 'Done removing'; render(); toast('Removal mode on'); });
};

function render() {
  const g = $('#grid'); g.textContent = '';
  if (!items.length) { g.innerHTML = '<div class="empty">No event records yet. Be the first to add one!</div>'; return; }
  items.forEach(it => {
    const d = document.createElement('div'); d.className = 'pic';
    const i = document.createElement('img'); i.src = it.url; i.loading = 'lazy'; i.alt = 'Event picture by ' + it.user;
    i.onclick = () => { $('#bigImg').src = it.url; open('#big'); };
    const p = document.createElement('p'); p.append('Uploaded by ');
    const b = document.createElement('b'); b.textContent = it.user; p.append(b);
    const w = document.createElement('p'); w.className = 'when'; w.textContent = new Date(it.ts).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
    d.append(i, p, w);
    if (it.note_url) {
      const n = document.createElement('p'); n.className = 'note'; d.append(n);
      fetch(it.note_url).then(r => r.ok ? r.text() : '').then(t => { n.textContent = t; }).catch(() => {});
    }
    if (rm) { const x = document.createElement('button'); x.className = 'x'; x.textContent = 'Remove'; x.onclick = () => del(it); d.append(x); }
    g.append(d);
  });
}
async function load() {
  try { items = (await (await fetch('/api/events')).json()).items || []; } catch (e) { items = []; }
  render();
}

function shrink(file) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej;
    r.onload = () => {
      const im = new Image(); im.onerror = rej;
      im.onload = () => {
        const c = document.createElement('canvas'); let w = 1600, q = .85, out;
        for (let n = 0; n < 8; n++) {
          const s = Math.min(1, w / Math.max(im.width, im.height));
          c.width = im.width * s; c.height = im.height * s;
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          if (out.length < 2.2e6) break; w *= .8; q = Math.max(.6, q - .05);
        }
        res(out);
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

$('#uOk').onclick = async () => {
  const u = $('#uname').value.trim(), f = $('#file').files[0], e = $('#uE');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) { e.textContent = 'Username: 3-16 letters, numbers or underscores.'; return; }
  if (!f || !f.type.startsWith('image/')) { e.textContent = 'Please choose an image.'; return; }
  e.textContent = 'Uploading…'; $('#uOk').disabled = true;
  try {
    await api('event_upload', {token: tok.upload, username: u, note: $('#note').value.trim(), image: await shrink(f)});
    close('#mUp'); $('#uname').value = ''; $('#note').value = ''; $('#file').value = ''; toast('Uploaded! Thanks for sharing 🎉');
    setTimeout(load, 800);
  } catch (x) { e.textContent = x.message; }
  $('#uOk').disabled = false;
};

async function del(it) {
  try { await api('event_remove', {token: tok.admin, name: it.name}); items = items.filter(z => z !== it); render(); toast('Removed'); }
  catch (e) { toast(e.message); }
}
load();
