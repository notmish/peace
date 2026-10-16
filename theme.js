/**
 * Peace SMP - Theme Controller & Ambient Particle Canvas
 * Features: Day/Night Theme Switcher, 60fps Ambient Minecraft Spore/Firefly Canvas,
 * Tactile Copy Feedback, Mobile Nav Drawer, and Minecraft Live Server Status.
 */
(function () {
  'use strict';

  // --- 1. Theme Switcher ---
  const THEME_KEY = 'peace-theme';
  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* storage blocked: fall back to dark */ }
    return 'dark'; // dark by default everywhere (incl. Messenger / in-app browsers)
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ } }
    updateToggleButtons(theme);
    window.dispatchEvent(new CustomEvent('peace-theme-change', { detail: { theme } }));
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      const icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.innerHTML = isDark
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      }
      const label = btn.querySelector('.theme-label');
      if (label) {
        label.textContent = isDark ? 'Light' : 'Dark';
      }
    });
  }

  // Initial theme application
  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme, false);

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(document.documentElement.getAttribute('data-theme') || currentTheme);

    // Bind all theme toggles
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const active = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(active);
      };
    });

    // --- 2. Mobile Nav Toggle ---
    const navBurger = document.querySelector('.nav-burger');
    const navLinks = document.querySelector('.nav-links');
    if (navBurger && navLinks) {
      navBurger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('nav-open');
        navBurger.setAttribute('aria-expanded', String(isOpen));
      };
      navLinks.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          navLinks.classList.remove('nav-open');
          if (navBurger) navBurger.setAttribute('aria-expanded', 'false');
        });
      });
      document.addEventListener('click', (e) => {
        if (!navBurger.contains(e.target) && !navLinks.contains(e.target)) {
          navLinks.classList.remove('nav-open');
          navBurger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // --- 3. Enhanced Copy Feedback ---
    document.querySelectorAll('.cp').forEach(btn => {
      if (!btn.dataset.origText) {
        btn.dataset.origText = btn.innerHTML;
      }
      btn.addEventListener('click', () => {
        btn.classList.add('copied');
        btn.innerHTML = '<span>✓ Copied!</span>';
        clearTimeout(btn._copyTimeout);
        btn._copyTimeout = setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = btn.dataset.origText;
        }, 1800);
      });
    });

    // --- 4. Live Minecraft Server Status ---
    const statusPill = document.getElementById('serverStatus');
    if (statusPill) {
      const render = (cls, label, extra) => {
        statusPill.innerHTML = `<span class="status-dot ${cls}"></span> <b>${label}</b> · <span>${extra}</span>`;
      };
      const unavailable = () => render('', 'Status unavailable', 'Use the IPs below');
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 10000);
      // /api/status checks both Java IPs on the server (see api/status.py)
      fetch('/api/status', ctrl ? { signal: ctrl.signal } : undefined)
        .then(r => { if (!r.ok) throw new Error('status unavailable'); return r.json(); })
        .then(({ main, backup }) => {
          if (main && main.online) render('online', 'Server Online', `${main.players} Playing`);
          else if (backup && backup.online) render('warn', 'Server Online', 'Main IP down, use the backup IP');
          else if (main && backup) render('offline', 'Offline', 'Both Java IPs are down');
          else unavailable(); // the check itself failed: don't claim "Offline"
        })
        .catch(unavailable)
        .finally(() => clearTimeout(timer));
    }

    // --- 5. Ambient Minecraft Particle Canvas ---
    initAmbientCanvas();
  });

  // --- Ambient Canvas Implementation ---
  function initAmbientCanvas() {
    let canvas = document.getElementById('ambient-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ambient-canvas';
      document.body.prepend(canvas);
    }

    const root = document.documentElement;
    if (root.classList.contains('lite')) { canvas.style.display = 'none'; return; } // low-end device: no animation
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    let particles = [];
    let animId = null;
    let isHidden = false;
    let last = 0, frames = 0, slow = 0, stopped = false;
    const sprites = {};
    function sprite(col) {
      const key = col.r + ',' + col.g + ',' + col.b;
      if (sprites[key]) return sprites[key];
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d'), rgb = key;
      const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, `rgba(${rgb}, 1)`);
      glow.addColorStop(0.5, `rgba(${rgb}, 0.35)`);
      glow.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = glow; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgb(${rgb})`; g.beginPath(); g.arc(32, 32, 32 * 0.85 / 2.8, 0, Math.PI * 2); g.fill();
      return (sprites[key] = s);
    }
    function stopCanvas() {
      stopped = true; cancelAnimationFrame(animId);
      canvas.style.display = 'none'; root.classList.add('lite');
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PARTICLE_COUNT = prefersReducedMotion ? 18 : 42;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Particle colors according to theme
    function getColors() {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      return isDark
        ? [
            { r: 74, g: 222, b: 128 },  // emerald green
            { r: 167, g: 243, b: 208 }, // mint glow
            { r: 250, g: 204, b: 21 },  // firefly gold
            { r: 110, g: 231, b: 183 }  // spore teal
          ]
        : [
            { r: 22, g: 163, b: 74 },   // lush green
            { r: 217, g: 119, b: 6 },   // golden sunlight
            { r: 52, g: 211, b: 153 },  // morning leaf
            { r: 202, g: 138, b: 4 }    // warm pollen
          ];
    }

    let palette = getColors();
    window.addEventListener('peace-theme-change', () => {
      palette = getColors();
      // Smoothly update existing particles to the new theme palette
      for (let i = 0; i < particles.length; i++) {
        particles[i].color = palette[Math.floor(Math.random() * palette.length)];
      }
    });

    class Particle {
      constructor(isInitial = false) {
        this.reset(isInitial);
      }
      reset(isInitial = false) {
        this.x = Math.random() * width;
        this.y = isInitial ? Math.random() * height : height + 10;
        this.size = Math.random() * 2.5 + 1.2;
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.vy = -(Math.random() * 0.45 + 0.22) * (prefersReducedMotion ? 0.4 : 1);
        this.swaySpeed = Math.random() * 0.015 + 0.005;
        this.swayAmount = Math.random() * 0.8 + 0.3;
        this.swayOffset = Math.random() * Math.PI * 2;
        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.45 + 0.22;
        this.fadeIn = true;
      }
      update() {
        this.y += this.vy;
        this.x += Math.sin(this.swayOffset) * this.swayAmount;
        this.swayOffset += this.swaySpeed;

        if (this.fadeIn) {
          this.alpha += 0.008;
          if (this.alpha >= this.maxAlpha) this.fadeIn = false;
        } else if (this.y < height * 0.18) {
          this.alpha -= 0.008;
        }

        if (this.y < -15 || (this.alpha <= 0 && !this.fadeIn)) {
          this.reset(false);
        }
      }
      draw(c) {
        const r = this.size * 2.8;
        c.globalAlpha = Math.max(0, Math.min(1, this.alpha));
        c.drawImage(sprite(this.color), this.x - r, this.y - r, r * 2, r * 2);
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(true));
    }

    function loop(ts) {
      if (isHidden || stopped) return;
      if (last) {
        const dt = ts - last; frames++;
        if (dt > 45) slow++;
        if (frames === 120 && slow > 40) { stopCanvas(); return; } // struggling device: switch animation off
      }
      last = ts;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
      }
      animId = requestAnimationFrame(loop);
    }

    document.addEventListener('visibilitychange', () => {
      isHidden = document.hidden;
      if (!isHidden && !stopped) {
        last = 0;
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(loop);
      }
    });

    animId = requestAnimationFrame(loop);
  }
})();
