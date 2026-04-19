import { API_BASE } from './api/apiClient.js';
import { applyPreferencesToStorage, getStoredPreferences } from './utils/preferences.js';

// ── Text splitting ─────────────────────────────────────────────
function wrapWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w =>
    `<span class="anim-word" style="opacity:0;display:inline-block">${w}</span>`
  ).join(' ');
  el.style.opacity = '1'; // parent visible; children hidden via inline style
}

function wrapChars(el) {
  el.innerHTML = [...el.textContent.trim()].map(c =>
    c === ' '
      ? '<span class="anim-space" style="display:inline-block">&nbsp;</span>'
      : `<span class="anim-char" style="opacity:0;display:inline-block">${c}</span>`
  ).join('');
  el.style.opacity = '1';
}

// ── Fallback when anime unavailable ───────────────────────────
function showSlideImmediate(index) {
  const groups = [
    ['.ob-welcome-to', '.ob-welcome-brand', '.ob-welcome-name'],
    ['.ob-about-eyebrow', '.ob-title-line', '.ob-about-sub', '.ob-about-feat'],
    ['.ob-char-title .anim-char', '.ob-char-sub', '.ob-slide-num', '.ob-char-card'],
  ];
  (groups[index] || []).forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {

  // ── Prep text elements for char animation (do once) ─────────
  document.querySelectorAll('.ob-char-title').forEach(wrapChars);

  // ── Grab anime.js global ────────────────────────────────────
  const anime = window.anime || null;
  if (!anime) console.warn('anime.js global not found — animations skipped');
  const { animate, createTimeline, stagger, spring } = anime || {};

  // ── Loop animation tracker (cancel on slide exit) ───────────
  let loops = [];
  function killLoops() {
    loops.forEach(a => { try { a.pause(); } catch(e) {} });
    loops = [];
  }

  // ── Per-slide entrance animations ───────────────────────────
  function animateSlideIn(index) {
    killLoops();
    if (!anime) { showSlideImmediate(index); return; }

    try {

      // ══ SLIDE 0 — Welcome ═══════════════════════════════════
      if (index === 0) {

        // Reset
        document.querySelectorAll('.ob-welcome-to').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; el.style.letterSpacing = '14px';
        });
        document.querySelectorAll('.ob-welcome-brand').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'scale(0.6) translateY(30px)';
        });
        document.querySelectorAll('.ob-welcome-name').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(22px)';
        });

        // Ken Burns on the background image
        loops.push(animate('.ob-bg-img', {
          scale: [1, 1.07],
          duration: 14000,
          ease: 'linear',
          loop: true,
          alternate: true,
        }));

        // Main timeline
        createTimeline()
          // "WELCOME TO" — letter-spacing collapses in
          .add('.ob-welcome-to', {
            opacity: [0, 1],
            letterSpacing: ['14px', '6px'],
            translateY: [16, 0],
            duration: 600,
            ease: 'outExpo',
          })
          // "BuddyDoro" — POPS in with spring scale
          .add('.ob-welcome-brand', {
            opacity: [0, 1],
            scale: [0.6, 1],
            translateY: [30, 0],
            duration: 900,
            ease: spring({ stiffness: 380, damping: 14 }),
          }, 180)
          // Username — fades up
          .add('.ob-welcome-name', {
            opacity: [0, 1],
            translateY: [22, 0],
            duration: 550,
            ease: 'outExpo',
          }, 700);
      }

      // ══ SLIDE 1 — About ═════════════════════════════════════
      if (index === 1) {

        // Reset — eyebrow
        document.querySelectorAll('.ob-about-eyebrow').forEach(el => {
          el.style.opacity = '0';
          el.style.letterSpacing = '14px';
          el.style.transform = 'translateY(20px)';
        });
        // Reset — title lines
        document.querySelectorAll('.ob-title-line').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(80px)';
        });
        // Reset — sub
        document.querySelectorAll('.ob-about-sub').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
        });
        // Reset — cards (odd from left, even from right)
        document.querySelectorAll('.ob-about-feat:nth-child(odd)').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateX(-70px) scale(0.9)';
        });
        document.querySelectorAll('.ob-about-feat:nth-child(even)').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateX(70px) scale(0.9)';
        });
        // Reset — icons
        document.querySelectorAll('.ob-about-feat-icon').forEach(el => {
          el.style.transform = 'rotate(-180deg) scale(0)';
        });

        createTimeline()
          // Eyebrow: letter-spacing collapse + slide up
          .add('.ob-about-eyebrow', {
            opacity: [0, 1],
            letterSpacing: ['14px', '3px'],
            translateY: [20, 0],
            duration: 750,
            ease: 'outExpo',
          })
          // Title lines: spring drop one by one
          .add('.ob-title-line', {
            opacity: [0, 1],
            translateY: [80, 0],
            duration: 800,
            delay: stagger(140),
            ease: spring({ stiffness: 220, damping: 14 }),
          }, 200)
          // Sub
          .add('.ob-about-sub', {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            ease: 'outExpo',
          }, 720)
          // Odd cards from left
          .add('.ob-about-feat:nth-child(odd)', {
            opacity: [0, 1],
            translateX: [-70, 0],
            scale: [0.9, 1],
            duration: 700,
            delay: stagger(110),
            ease: spring({ stiffness: 200, damping: 15 }),
          }, 880)
          // Even cards from right
          .add('.ob-about-feat:nth-child(even)', {
            opacity: [0, 1],
            translateX: [70, 0],
            scale: [0.9, 1],
            duration: 700,
            delay: stagger(110, { start: 55 }),
            ease: spring({ stiffness: 200, damping: 15 }),
          }, 880)
          // Icons: spin + scale in
          .add('.ob-about-feat-icon', {
            rotate: ['-180deg', '0deg'],
            scale: [0, 1],
            duration: 550,
            delay: stagger(75),
            ease: spring({ stiffness: 320, damping: 13 }),
          }, 1350);
      }

      // ══ SLIDE 2 — Choose Buddy ═══════════════════════════════
      if (index === 2) {

        // Make heading container visible (children animated individually)
        document.querySelectorAll('.ob-char-heading').forEach(el => {
          el.style.opacity = '1';
        });
        // Reset children
        document.querySelectorAll('.ob-slide-num').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
        });
        document.querySelectorAll('.ob-char-title .anim-char').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(-35px)';
        });
        document.querySelectorAll('.ob-char-sub').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
        });
        document.querySelectorAll('.ob-char-card').forEach(el => {
          el.style.opacity = '0'; el.style.transform = 'translateY(90px) scale(0.72)';
        });

        createTimeline()
          // Slide number
          .add('.ob-slide-num', {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 380,
            ease: 'outExpo',
          })
          // Title: each character drops from above, staggered
          .add('.ob-char-title .anim-char', {
            opacity: [0, 1],
            translateY: [-35, 0],
            duration: 380,
            delay: stagger(28),
            ease: 'outExpo',
          }, 80)
          // Subtitle
          .add('.ob-char-sub', {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 480,
            ease: 'outExpo',
          }, 380)
          // Cards: spring pop from below
          .add('.ob-char-card', {
            opacity: [0, 1],
            translateY: [90, 0],
            scale: [0.72, 1],
            duration: 850,
            delay: stagger(150),
            ease: spring({ stiffness: 260, damping: 11 }),
          }, 520);

        // Character images: gentle float loop after cards arrive
        setTimeout(() => {
          loops.push(animate('.ob-char-img-wrap', {
            translateY: [0, -9],
            duration: 1900,
            ease: 'inOut(2)',
            loop: true,
            alternate: true,
            delay: stagger(220),
          }));
        }, 1600);
      }

    } catch(e) {
      console.warn('Anime animation error:', e);
      showSlideImmediate(index);
    }
  }

  // ── Slide setup ───────────────────────────────────────────
  let currentSlide = 0;
  const slides      = document.querySelectorAll('.slide');
  const dots        = document.querySelectorAll('.dot');
  const prevBtn     = document.querySelector('.prev-btn');
  const nextBtn     = document.querySelector('.next-btn');
  const startBtn    = document.querySelector('.start-btn');

  const scrollHint  = document.getElementById('scrollHint');
  const totalSlides = slides.length;

  let selectedSkin = 'DragonSkin.png';

  const petRevealEmpty = document.getElementById('petRevealEmpty');
  const petRevealInner = document.getElementById('petRevealInner');
  const petRevealImg   = document.getElementById('petRevealImg');
  const petRevealName  = document.getElementById('petRevealName');

  document.querySelectorAll('.ob-char-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob-char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedSkin = card.dataset.skin;

      // ── Hatch the egg: reveal the companion ──────────────
      const petSrc   = card.dataset.pet;
      const petLabel = card.dataset.petname;

      if (petRevealImg && petSrc) {
        petRevealImg.src = petSrc;
        petRevealImg.alt = petLabel || '';
        if (petRevealEmpty) petRevealEmpty.hidden = true;
        if (petRevealInner) petRevealInner.hidden = false;
        if (petRevealName)  petRevealName.textContent = petLabel || '';

        if (animate) {
          animate('#petRevealImg', {
            scale:   [0.3, 1],
            opacity: [0, 1],
            rotate:  ['-8deg', '0deg'],
            duration: 750,
            ease: spring ? spring({ stiffness: 260, damping: 11 }) : 'outExpo',
          });
        }
      }
    });
  });

  // Fetch user
  const token = localStorage.getItem('authToken');
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const user = await res.json();
      document.querySelectorAll('.user-name').forEach(el => { el.textContent = user.name; });
      localStorage.setItem('userName', user.name);
    } else {
      const c = localStorage.getItem('userName');
      if (c) document.querySelectorAll('.user-name').forEach(el => { el.textContent = c; });
    }
  } catch {
    const c = localStorage.getItem('userName');
    if (c) document.querySelectorAll('.user-name').forEach(el => { el.textContent = c; });
  }

  function updateSlide(newIndex, direction = 'next') {
    if (newIndex < 0 || newIndex >= totalSlides) return;
    const oldSlide = slides[currentSlide];
    const newSlide = slides[newIndex];

    oldSlide.classList.add(direction === 'next' ? 'exit-left' : 'exit-right');
    setTimeout(() => oldSlide.classList.remove('active', 'exit-left', 'exit-right'), 800);

    newSlide.classList.add(direction === 'next' ? 'enter-right' : 'enter-left');
    void newSlide.offsetWidth;
    newSlide.classList.add('active');
    newSlide.classList.remove('enter-left', 'enter-right');

    animateSlideIn(newIndex);

    dots[currentSlide].classList.remove('active');
    dots[newIndex].classList.add('active');
    currentSlide = newIndex;
    updateButtons();
  }

  function updateButtons() {
    if (currentSlide === totalSlides - 1) {
      startBtn.style.display = 'flex';
      scrollHint.classList.add('hidden');
    } else {
      startBtn.style.display = 'none';
      scrollHint.classList.remove('hidden');
    }
  }

  const nextSlide = () => { if (currentSlide < totalSlides - 1) updateSlide(currentSlide + 1, 'next'); };
  const prevSlide = () => { if (currentSlide > 0) updateSlide(currentSlide - 1, 'prev'); };

  async function completeOnboarding() {
    const preferences = applyPreferencesToStorage({
      skinOpen: `Skins/${selectedSkin}`,
      skinClosed: `Skins/${selectedSkin}`,
      background: getStoredPreferences().background,
    }, { preserveExisting: true });

    if (anime?.animate) {
      anime.animate(document.querySelector('.ob-wrap'), { opacity: [1, 0], duration: 500, ease: 'outQuad' });
    } else {
      document.querySelector('.ob-wrap').style.opacity = '0';
    }

    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.removeItem('hasTakenTour');

    const authToken = localStorage.getItem('authToken');
    try {
      await fetch(`${API_BASE}/user/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(preferences),
      });
    } catch(e) { console.warn('Onboarding sync failed', e); }

    setTimeout(() => { window.location.replace('index.html'); }, 500);
  }

  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);
  startBtn.addEventListener('click', completeOnboarding);

  dots.forEach((dot, i) => dot.addEventListener('click', () => updateSlide(i, i > currentSlide ? 'next' : 'prev')));

  document.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown')  nextSlide();
    else if (e.key === 'ArrowUp')    prevSlide();
    else if (e.key === 'Enter' && currentSlide === totalSlides - 1) completeOnboarding();
    else if (e.key === 'Escape') completeOnboarding();
  });

  let scrollCooldown = false;
  document.addEventListener('wheel', e => {
    if (scrollCooldown) return;
    scrollCooldown = true;
    setTimeout(() => { scrollCooldown = false; }, 700);
    if (e.deltaY > 0) nextSlide(); else if (e.deltaY < 0) prevSlide();
  }, { passive: true });

  let touchStartY = 0, touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = touchStartX - e.changedTouches[0].screenX;
    const dy = touchStartY - e.changedTouches[0].screenY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
      dy > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });

  updateButtons();
  animateSlideIn(0);
  console.log('Onboarding initialized');
});
