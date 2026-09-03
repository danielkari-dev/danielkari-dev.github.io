// ===== Daniel W — AppDev | interactions =====

// year
document.getElementById('year').textContent = new Date().getFullYear();

// nav scroll state
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// mobile menu
const burger = document.getElementById('burger');
const links = document.querySelector('.nav-links');
burger.addEventListener('click', () => links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => links.classList.remove('open'))
);

// QuickGallery "in testing" modal
const qgModal = document.getElementById('qg-modal');
const qgBtn = document.getElementById('qg-play');
const qgClose = document.getElementById('qg-modal-close');
const qgContact = document.getElementById('qg-modal-contact');
function openModal() { qgModal.classList.add('open'); }
function closeModal() { qgModal.classList.remove('open'); }
if (qgBtn) qgBtn.addEventListener('click', openModal);
if (qgClose) qgClose.addEventListener('click', closeModal);
if (qgContact) qgContact.addEventListener('click', closeModal);
if (qgModal) qgModal.addEventListener('click', (e) => { if (e.target === qgModal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// count-up stats
const stats = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.target;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const tick = () => {
      cur += step;
      if (cur >= target) { el.textContent = target; }
      else { el.textContent = cur; requestAnimationFrame(tick); }
    };
    tick();
    statObserver.unobserve(el);
  });
}, { threshold: 0.5 });
stats.forEach(s => statObserver.observe(s));

// ===== animated particle/constellation background =====
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let w, h, particles;
const COUNT = 70;
const mouse = { x: -999, y: -999 };

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

function initParticles() {
  particles = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.8 + 0.6,
  }));
}
initParticles();

function draw() {
  ctx.clearRect(0, 0, w, h);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;

    // gentle attraction to mouse
    const dx = mouse.x - p.x, dy = mouse.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 160) { p.x += dx * 0.002; p.y += dy * 0.002; }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,108,255,0.7)';
    ctx.fill();
  }
  // connect nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 130) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(53,196,255,${0.14 * (1 - d / 130)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(draw);
}
draw();

// ===== slideshows (cross-fade between screenshots) =====
document.querySelectorAll('.slideshow').forEach((box) => {
  const imgs = box.querySelectorAll('img');
  if (imgs.length < 2) return;
  const interval = +box.dataset.interval || 3000;
  let i = 0;
  setInterval(() => {
    imgs[i].classList.remove('active');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('active');
  }, interval);
});
