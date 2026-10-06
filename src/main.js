import * as THREE from 'three';
import './style.css';

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  menuToggle.setAttribute('aria-label', open ? 'Menüyü aç' : 'Menüyü kapat');
  nav?.classList.toggle('is-open', !open);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuToggle?.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
}));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('.cake-canvas');
const sceneHost = document.querySelector('.hero__visual');
const staticFallback = document.querySelector('.hero-fallback');

function initCakeScene() {
  if (!canvas || !sceneHost || reducedMotion || !('WebGLRenderingContext' in window)) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const frameGroup = new THREE.Group();
  scene.add(frameGroup);
  const cards = [];
  const cardSpecs = [
    { file: 'koleksiyon-01.jpg', x: 0.5, y: 0.06, z: 0.1, scale: 1.05 },
    { file: 'dugun-pastasi.jpg', x: 0.8, y: 0.56, z: -0.9, scale: 0.75 },
    { file: 'butik-koleksiyon-01.jpg', x: 0.85, y: -0.77, z: -0.55, scale: 0.82 },
    { file: 'pasta-detayi.jpg', x: -0.4, y: -0.9, z: -0.95, scale: 0.68 },
  ];
  const mobilePositions = [
    [0, -0.18, 0.3, 0.85],
    [1.12, 0.1, -0.45, 0.65],
    [-1.12, -0.25, -0.55, 0.66],
    [-0.62, -0.8, -1.0, 0.5],
  ];
  let loaded = 0;
  for (const spec of cardSpecs) {
    const image = new Image();
    image.src = `./images/${spec.file}`;
    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      const height = 2.9 * spec.scale;
      const width = height * image.naturalWidth / image.naturalHeight;
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const card = new THREE.Mesh(geometry, material);
      card.position.set(spec.x, spec.y, spec.z);
      card.userData = { ...spec, baseY: spec.y, phase: cards.length * 1.4 };
      frameGroup.add(card);
      cards.push(card);
      resize();
      loaded += 1;
      if (loaded >= 2) {
        staticFallback?.classList.add('is-hidden');
        canvas.classList.add('is-ready');
      }
    };
    image.onerror = () => {};
  }

  const ambient = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambient);
  let width = 1;
  let height = 1;
  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let scrollY = 0;
  let frame = 0;
  const isMobile = () => window.innerWidth < 820;

  function resize() {
    width = sceneHost.clientWidth;
    height = sceneHost.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.position.set(0, 0, isMobile() ? 7.8 : 7.8);
    camera.updateProjectionMatrix();
    if (isMobile()) {
      cards.forEach((card, i) => {
        const [x, y, z, scale] = mobilePositions[i];
        card.position.set(x, y, z);
        card.scale.setScalar(scale / card.userData.scale);
      });
    } else {
      cards.forEach((card) => {
        card.position.set(card.userData.x, card.userData.y, card.userData.z);
        card.scale.setScalar(1);
      });
    }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  function render() {
    frame = requestAnimationFrame(render);
    if (document.hidden) return;
    targetX += (pointerX - targetX) * 0.025;
    targetY += (pointerY - targetY) * 0.025;
    const mobile = isMobile();
    frameGroup.rotation.y += ((mobile ? 0 : targetX * 0.065) - frameGroup.rotation.y) * 0.04;
    frameGroup.rotation.x += ((mobile ? 0 : -targetY * 0.035) - frameGroup.rotation.x) * 0.04;
    frameGroup.position.y = (mobile ? 0 : Math.min(scrollY * 0.00038, 0.3));
    const time = performance.now() * 0.0005;
    cards.forEach((card, i) => {
      const baseY = mobile ? mobilePositions[i][1] : card.userData.baseY;
      const float = mobile ? 0 : Math.sin(time + card.userData.phase) * 0.025;
      card.position.y += ((baseY + float) - card.position.y) * 0.025;
    });
    renderer.render(scene, camera);
  }
  render();
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    renderer.dispose();
    cards.forEach((card) => { card.geometry.dispose(); card.material.dispose(); });
  }, { once: true });
}

initCakeScene();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.cake-card, .occasion-photo, .occasion-copy, .gallery-grid a, .visit-card').forEach((element) => {
  element.classList.add('reveal');
  revealObserver.observe(element);
});
