import { API_BASE } from './api/apiClient.js';

console.log('onboarding.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    let currentSlide = 0;
    const slides       = document.querySelectorAll('.slide');
    const dots         = document.querySelectorAll('.dot');
    const prevBtn      = document.querySelector('.prev-btn');
    const nextBtn      = document.querySelector('.next-btn');
    const startBtn     = document.querySelector('.start-btn');
    const skipBtn      = document.querySelector('.skip-btn');
    const footer       = document.querySelector('.onboarding-footer');
    const scrollHint   = document.getElementById('scrollHint');
    const totalSlides  = slides.length;

    // ── Timer settings state (slide 4) ──────────────────
    let focusMinutes = 25;
    let breakMinutes = 5;

    const focusSlider  = document.getElementById('focusSlider');
    const breakSlider  = document.getElementById('breakSlider');
    const focusDisplay = document.getElementById('focusDisplay');
    const breakDisplay = document.getElementById('breakDisplay');

    function updateSliderFill(slider) {
        const min = Number(slider.min), max = Number(slider.max), val = Number(slider.value);
        const pct = ((val - min) / (max - min)) * 100;
        slider.style.setProperty('--fill', `${pct}%`);
    }

    focusSlider.addEventListener('input', () => {
        focusMinutes = Number(focusSlider.value);
        focusDisplay.textContent = focusMinutes;
        updateSliderFill(focusSlider);
    });
    breakSlider.addEventListener('input', () => {
        breakMinutes = Number(breakSlider.value);
        breakDisplay.textContent = breakMinutes;
        updateSliderFill(breakSlider);
    });

    // Init fill on load
    updateSliderFill(focusSlider);
    updateSliderFill(breakSlider);

    // ── Fetch real user data from backend ────────────────
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = user.name;
            });
            localStorage.setItem('userName', user.name);
            // Pre-fill sliders with any saved settings
            if (user.settings?.focusMinutes) {
                focusMinutes = user.settings.focusMinutes;
                focusSlider.value = focusMinutes;
                focusDisplay.textContent = focusMinutes;
                updateSliderFill(focusSlider);
            }
            if (user.settings?.breakMinutes) {
                breakMinutes = user.settings.breakMinutes;
                breakSlider.value = breakMinutes;
                breakDisplay.textContent = breakMinutes;
                updateSliderFill(breakSlider);
            }
        } else {
            const cached = localStorage.getItem('userName');
            if (cached) document.querySelectorAll('.user-name').forEach(el => { el.textContent = cached; });
        }
    } catch {
        const cached = localStorage.getItem('userName');
        if (cached) document.querySelectorAll('.user-name').forEach(el => { el.textContent = cached; });
    }

    function updateSlide(newIndex, direction = 'next') {
        if (newIndex < 0 || newIndex >= totalSlides) return;

        const oldSlide = slides[currentSlide];
        const newSlide = slides[newIndex];

        // Exit the current slide
        oldSlide.classList.add(direction === 'next' ? 'exit-left' : 'exit-right');
        setTimeout(() => {
            oldSlide.classList.remove('active', 'exit-left', 'exit-right');
        }, 800);

        // Position the incoming slide off-screen (no transition yet)
        newSlide.classList.add(direction === 'next' ? 'enter-right' : 'enter-left');

        // Force the browser to paint the off-screen position before we start
        // the transition — otherwise the slide-in animation won't play
        void newSlide.offsetWidth;

        // Activate: triggers the CSS transition from off-screen to center
        newSlide.classList.add('active');
        newSlide.classList.remove('enter-left', 'enter-right');

        // Sync dots
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

    function nextSlide() {
        if (currentSlide < totalSlides - 1) updateSlide(currentSlide + 1, 'next');
    }

    function prevSlide() {
        if (currentSlide > 0) updateSlide(currentSlide - 1, 'prev');
    }

    async function completeOnboarding() {
        const wrap = document.querySelector('.ob-wrap');
        wrap.style.transition = 'opacity 0.5s ease';
        wrap.style.opacity = '0';

        // Mark locally immediately so the main page guard passes
        localStorage.setItem('hasSeenOnboarding', 'true');

        const authToken = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };

        // Save timer settings to backend
        try {
            const res = await fetch(`${API_BASE}/user/settings`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ focusMinutes, breakMinutes })
            });
            if (!res.ok) console.warn('Settings sync returned', res.status);
        } catch (e) {
            console.warn('Failed to sync settings to backend', e);
        }

        // Mark onboarding complete in backend
        try {
            const res = await fetch(`${API_BASE}/user/onboarding`, {
                method: 'PATCH',
                headers
            });
            if (!res.ok) console.warn('Onboarding sync returned', res.status);
        } catch (e) {
            console.warn('Failed to sync onboarding to backend', e);
        }

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    // Hidden prev/next buttons (kept for fallback — scroll is primary)
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);
    startBtn.addEventListener('click', completeOnboarding);
    skipBtn.addEventListener('click', completeOnboarding);

    // Dot listeners
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            updateSlide(index, index > currentSlide ? 'next' : 'prev');
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if      (e.key === 'ArrowDown')  nextSlide();
        else if (e.key === 'ArrowUp')    prevSlide();
        else if (e.key === 'Enter' && currentSlide === totalSlides - 1) completeOnboarding();
        else if (e.key === 'Escape') completeOnboarding();
    });

    // ── Scroll wheel navigation (throttled) ──────────────
    let scrollCooldown = false;
    document.addEventListener('wheel', (e) => {
        if (scrollCooldown) return;
        scrollCooldown = true;
        setTimeout(() => { scrollCooldown = false; }, 700);

        if (e.deltaY > 0) nextSlide();
        else if (e.deltaY < 0) prevSlide();
    }, { passive: true });

    // ── Vertical touch swipe ──────────────────────────────
    let touchStartY = 0;
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const diffX = touchStartX - e.changedTouches[0].screenX;
        const diffY = touchStartY - e.changedTouches[0].screenY;
        // Only trigger if vertical swipe dominates
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
            diffY > 0 ? nextSlide() : prevSlide();
        }
    }, { passive: true });

    updateButtons();
    console.log('Onboarding initialized');
});
