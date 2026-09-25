/* Daniel W — AppDev · v2 interactive site
   - WebGL particle field (Three.js) that reacts to the mouse
   - graceful fallback to a CSS aurora if WebGL is unavailable
   - reveal-on-scroll, animated stat counters, slideshows, nav, tilt, modal, cursor glow */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 860px)').matches;

  /* ---------------- WebGL particle background ---------------- */
  function initWebGL() {
    const canvas = document.getElementById('webgl-bg');
    if (!canvas || typeof THREE === 'undefined') return false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      return false;
    }
    if (!renderer) return false;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;

    // particle field
    const COUNT = isMobile ? 1400 : 3200;
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const spread = 120;
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // two-colour gradient via a small canvas texture as the point sprite
    const sprite = makeGlowSprite();
    const mat = new THREE.PointsMaterial({
      size: isMobile ? 1.5 : 1.2,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(0x8fa0ff),
      opacity: 0.9,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // a second, cyan-tinted, slightly offset layer for depth
    const mat2 = mat.clone();
    mat2.color = new THREE.Color(0x35c4ff);
    mat2.size = (isMobile ? 1.1 : 0.9);
    mat2.opacity = 0.6;
    const points2 = new THREE.Points(geo.clone(), mat2);
    points2.rotation.y = 0.4;
    scene.add(points2);

    // mouse parallax
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5);
      target.y = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });

    let scrollY = window.scrollY;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();
      cur.x += (target.x - cur.x) * 0.04;
      cur.y += (target.y - cur.y) * 0.04;

      // gentle rotation + mouse tilt + slow drift
      points.rotation.y = t * 0.03 + cur.x * 0.6;
      points.rotation.x = cur.y * 0.4;
      points2.rotation.y = t * 0.02 + cur.x * 0.5 + 0.4;
      points2.rotation.x = cur.y * 0.3;

      // subtle scroll push so it feels connected to the page
      camera.position.y = -scrollY * 0.006;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    if (!prefersReduced) animate(); else renderer.render(scene, camera);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return true;
  }

  function makeGlowSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(200,210,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------------- reveal on scroll ---------------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------- animated stat counters ---------------- */
  function initCounters() {
    const nums = document.querySelectorAll('.stat-num');
    const run = (el) => {
      const target = +el.dataset.target || 0;
      const dur = 1400; const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---------------- slideshows ---------------- */
  function initSlideshows() {
    document.querySelectorAll('.slideshow').forEach((sc) => {
      const imgs = sc.querySelectorAll('img');
      if (imgs.length < 2) return;
      let i = 0;
      const interval = +sc.dataset.interval || 2800;
      setInterval(() => {
        imgs[i].classList.remove('active');
        i = (i + 1) % imgs.length;
        imgs[i].classList.add('active');
      }, interval);
    });
  }

  /* ---------------- nav (scroll style + burger) ---------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    const burger = document.getElementById('burger');
    const links = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
    if (burger && links) {
      burger.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
    }
  }

  /* ---------------- card 3D tilt ---------------- */
  function initTilt() {
    if (isMobile) return;
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------- cursor glow ---------------- */
  function initCursor() {
    if (isMobile) return;
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;
    window.addEventListener('pointermove', (e) => {
      glow.style.opacity = '1';
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  }

  /* ---------------- QuickGallery modal ---------------- */
  function initModal() {
    const modal = document.getElementById('qg-modal');
    const open = document.getElementById('qg-play');
    const close = document.getElementById('qg-modal-close');
    const contact = document.getElementById('qg-modal-contact');
    if (!modal) return;
    const show = () => modal.classList.add('open');
    const hide = () => modal.classList.remove('open');
    if (open) open.addEventListener('click', show);
    if (close) close.addEventListener('click', hide);
    if (contact) contact.addEventListener('click', hide);
    modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  }

  /* ---------------- 3D phone carousel (turntable) ---------------- */
  function initCarousel() {
    const scene = document.getElementById('carouselScene');
    const carousel = document.getElementById('carousel');
    if (!scene || !carousel) return;
    const cells = Array.from(carousel.querySelectorAll('.carousel-cell'));
    const n = cells.length;
    if (!n) return;

    const captionEl = document.getElementById('carCaption');
    const names = cells.map((c) => {
      const img = c.querySelector('img');
      return img ? (img.getAttribute('alt') || '') : '';
    });

    const theta = 360 / n;               // angle between phones
    // Much larger radius so phones are spread wide around the ring and never
    // overlap. Base = half-width / tan(halfAngle) (the minimum to not touch),
    // then a big extra gap scaled to phone width.
    const cellW = cells[0].getBoundingClientRect().width || 210;
    const gapFactor = 1.15;              // <- bump this for a wider ring (spacing between phones)
    let radius = Math.round((cellW / 2) / Math.tan(Math.PI / n) + cellW * gapFactor);

    // place each phone around the circle
    function layout() {
      const w = cells[0].getBoundingClientRect().width || 230;
      radius = Math.round((w / 2) / Math.tan(Math.PI / n) + w * gapFactor);
      cells.forEach((cell, i) => {
        cell.style.transform = `rotateY(${i * theta}deg) translateZ(${radius}px)`;
      });
    }
    layout();

    let angle = 0;            // current rotation of the whole carousel
    let velocity = 0;         // deg per frame (inertia + auto-spin)
    const autoSpin = -0.12;   // gentle continuous rotation
    let dragging = false;
    let lastX = 0;
    let paused = false;

    function render() {
      carousel.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;
      // depth cues: dim + slightly shrink phones facing away
      cells.forEach((cell, i) => {
        // effective angle of this phone relative to the viewer (front = 0)
        let a = ((i * theta + angle) % 360 + 360) % 360;
        if (a > 180) a -= 360;              // -180..180
        const facing = Math.cos(a * Math.PI / 180); // 1 front, -1 back
        const frame = cell.querySelector('.phone-frame');
        if (frame) {
          const b = 0.35 + 0.65 * (facing * 0.5 + 0.5); // 0.35..1 brightness
          frame.style.filter = `brightness(${b.toFixed(2)})`;
          frame.style.opacity = (0.55 + 0.45 * (facing * 0.5 + 0.5)).toFixed(2);
        }
      });
      updateCaption();
    }

    let lastCaptionIdx = -1;
    function updateCaption() {
      if (!captionEl) return;
      // which phone is closest to the front?
      let best = 0, bestCos = -2;
      cells.forEach((cell, i) => {
        let a = ((i * theta + angle) % 360 + 360) % 360;
        if (a > 180) a -= 360;
        const c = Math.cos(a * Math.PI / 180);
        if (c > bestCos) { bestCos = c; best = i; }
      });
      if (best !== lastCaptionIdx) {
        lastCaptionIdx = best;
        captionEl.textContent = names[best] || '';
      }
    }

    function frame() {
      if (!dragging) {
        // inertia decays, then falls back to gentle auto-spin
        velocity += (autoSpin - velocity) * 0.02;
        if (!paused) angle += velocity;
      }
      render();
      requestAnimationFrame(frame);
    }
    if (!prefersReduced) frame(); else render();

    // ---- drag / swipe to spin ----
    function onDown(x) { dragging = true; lastX = x; carousel.classList.add('dragging'); }
    function onMove(x) {
      if (!dragging) return;
      const dx = x - lastX; lastX = x;
      const d = dx * 0.35;          // sensitivity
      angle += d;
      velocity = d;                 // carry momentum on release
    }
    function onUp() { dragging = false; carousel.classList.remove('dragging'); }

    scene.addEventListener('pointerdown', (e) => { onDown(e.clientX); });
    window.addEventListener('pointermove', (e) => onMove(e.clientX));
    window.addEventListener('pointerup', onUp);

    // pause auto-spin on hover so people can look
    scene.addEventListener('pointerenter', () => { paused = true; });
    scene.addEventListener('pointerleave', () => { paused = false; });

    // ---- arrow buttons: snap one phone at a time ----
    const prev = document.getElementById('carPrev');
    const next = document.getElementById('carNext');
    function snapBy(dir) {
      // animate a smooth step of one theta
      const targetAngle = angle + dir * theta;
      const start = angle; const t0 = performance.now(); const dur = 500;
      paused = true;
      function step(now) {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        angle = start + (targetAngle - start) * eased;
        if (p < 1) requestAnimationFrame(step); else { velocity = 0; paused = false; }
      }
      requestAnimationFrame(step);
    }
    if (prev) prev.addEventListener('click', () => snapBy(+1));
    if (next) next.addEventListener('click', () => snapBy(-1));

    window.addEventListener('resize', layout);
  }

  /* ---------------- footer year ---------------- */
  function initYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const ok = initWebGL();
    if (!ok) document.body.classList.add('no-webgl');
    initReveal();
    initCounters();
    initSlideshows();
    initCarousel();
    initNav();
    initTilt();
    initCursor();
    initModal();
    initYear();
  });
})();
