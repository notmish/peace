// Video gallery. Codes are verified server-side (api/verify.py), same as the photo gallery.
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

function ytId(u) {
  try {
    const x = new URL(u.trim()), h = x.hostname.replace(/^(www|m)\./, ''); let id = '';
    if (h === 'youtu.be') id = x.pathname.slice(1).split('/')[0];
    else if (['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(h)) {
      if (x.pathname === '/watch') id = x.searchParams.get('v') || '';
      else { const m = x.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?]+)/); id = m ? m[1] : ''; }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch (e) { return ''; }
}

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
  if (rm) { rm = false; $('#rmBtn').textContent = '🛠 Admin: Remove Videos'; render(); return; }
  ask('admin', 'Admin access', 'Enter the admin password to remove videos.', () => { rm = true; $('#rmBtn').textContent = '✅ Done removing'; render(); toast('Removal mode on'); });
};

function render() {
  const g = $('#grid'); g.textContent = '';
  if (!items.length) { g.innerHTML = '<div class="empty">No videos yet. Be the first to share one!</div>'; return; }
  items.forEach(it => {
    const d = document.createElement('div'); d.className = 'pic';
    const f = document.createElement('div'); f.className = 'frame';
    const v = document.createElement('iframe');
    v.src = 'https://www.youtube-nocookie.com/embed/' + it.id; v.loading = 'lazy'; v.title = 'Video by ' + it.user;
    v.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    v.referrerPolicy = 'strict-origin-when-cross-origin'; v.allowFullscreen = true; f.append(v);
    const p = document.createElement('p'); p.append('Uploaded by ');
    const b = document.createElement('b'); b.textContent = it.user; p.append(b);
    d.append(f, p);
    if (rm) { const x = document.createElement('button'); x.className = 'x'; x.textContent = 'Remove'; x.onclick = () => del(it); d.append(x); }
    g.append(d);
  });
}
async function load() {
  try { items = (await (await fetch('/api/videos')).json()).items || []; } catch (e) { items = []; }
  render();
}

$('#uOk').onclick = async () => {
  const u = $('#uname').value.trim(), l = $('#link').value.trim(), e = $('#uE');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) { e.textContent = 'Username: 3-16 letters, numbers or underscores.'; return; }
  if (!ytId(l)) { e.textContent = 'Please paste a valid YouTube link.'; return; }
  e.textContent = 'Uploading…'; $('#uOk').disabled = true;
  try {
    await api('video_upload', {token: tok.upload, username: u, link: l});
    close('#mUp'); $('#uname').value = ''; $('#link').value = ''; toast('Video added! Thanks for sharing 🎉');
    setTimeout(load, 800);
  } catch (x) { e.textContent = x.message; }
  $('#uOk').disabled = false;
};

async function del(it) {
  try { await api('video_remove', {token: tok.admin, name: it.name}); items = items.filter(z => z !== it); render(); toast('Removed'); }
  catch (e) { toast(e.message); }
}
load();
