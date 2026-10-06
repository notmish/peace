// No PINs live in this file. Codes are verified server-side (api/verify.py) against salted hashes.
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

document.querySelectorAll('.cp').forEach(b => b.onclick = async () => {
  try { await navigator.clipboard.writeText(b.dataset.c); toast('Copied: ' + b.dataset.c); } catch (e) { toast(b.dataset.c); }
});
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
  if (rm) { rm = false; $('#rmBtn').textContent = '🛠 Admin: Remove Photos'; render(); return; }
  ask('admin', 'Admin access', 'Enter the admin password to remove photos.', () => { rm = true; $('#rmBtn').textContent = '✅ Done removing'; render(); toast('Removal mode on'); });
};

function render() {
  const g = $('#grid'); g.textContent = '';
  if (!items.length) { g.innerHTML = '<div class="empty">No pictures yet. Be the first to share your build!</div>'; return; }
  items.forEach(it => {
    const d = document.createElement('div'); d.className = 'pic';
    const i = document.createElement('img'); i.src = it.url; i.loading = 'lazy'; i.alt = 'Build by ' + it.user;
    i.onclick = () => { $('#bigImg').src = it.url; open('#big'); };
    const p = document.createElement('p'); p.append('Uploaded by ');
    const b = document.createElement('b'); b.textContent = it.user; p.append(b); d.append(i, p);
    if (rm) { const x = document.createElement('button'); x.className = 'x'; x.textContent = 'Remove'; x.onclick = () => del(it); d.append(x); }
    g.append(d);
  });
}
async function load() {
  try { items = (await (await fetch('/api/gallery')).json()).items || []; } catch (e) { items = []; }
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
    await api('upload', {token: tok.upload, username: u, image: await shrink(f)});
    close('#mUp'); $('#uname').value = ''; $('#file').value = ''; toast('Uploaded! Thanks for sharing 🎉');
    setTimeout(load, 800);
  } catch (x) { e.textContent = x.message; }
  $('#uOk').disabled = false;
};

async function del(it) {
  try { await api('remove', {token: tok.admin, name: it.name}); items = items.filter(z => z !== it); render(); toast('Removed'); }
  catch (e) { toast(e.message); }
}
load();
