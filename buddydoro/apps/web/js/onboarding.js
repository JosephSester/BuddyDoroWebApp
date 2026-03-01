import { API_BASE } from './api/apiClient.js';

console.log('onboarding.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    let currentSlide = 0;
    const slides       = document.querySelectorAll('.slide');
    const dots         = document.querySelectorAll('.dot');
    const prevBtn      = document.querySelector('.prev-btn');
    const nextBtn      = document.querySelector('.next-btn');
    const startBtn     = document.querySelector('.start-btn');
    const skipBtn      = document.querySelector('.skip-btn');
    const footer       = document.querySelector('.onboarding-footer');
    const totalSlides  = slides.length;

    // Personalize with the user's name from login
    const userName = localStorage.getItem('userName');
    if (userName) {
        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = userName;
        });
    }

    // Toggle dark-mode styling on the footer and skip button.
    // Slide 0 (welcome) is a dark full-screen scene — everything needs to be white.
    // Slides 1+ are split-screen with a white right panel — use dark UI.
    function setDarkMode(isDark) {
        footer.classList.toggle('is-dark', isDark);
        skipBtn.classList.toggle('is-dark', isDark);
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

        setDarkMode(currentSlide === 0);
        updateButtons();
    }

    function updateButtons() {
        prevBtn.disabled = currentSlide === 0;

        if (currentSlide === totalSlides - 1) {
            nextBtn.style.display = 'none';
            startBtn.style.display = 'flex';
        } else {
            nextBtn.style.display = 'flex';
            startBtn.style.display = 'none';
        }
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) updateSlide(currentSlide + 1, 'next');
    }

    function prevSlide() {
        if (currentSlide > 0) updateSlide(currentSlide - 1, 'prev');
    }

    async function completeOnboarding() {
        const container = document.querySelector('.onboarding-container');
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '0';

        try {
            const token = localStorage.getItem('authToken');
            await fetch(`${API_BASE}/user/onboarding`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {
            console.warn('Failed to sync onboarding to backend', e);
        }

        setTimeout(() => {
            localStorage.setItem('hasSeenOnboarding', 'true');
            window.location.href = 'index.html';
        }, 500);
    }

    // Button listeners
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
        if      (e.key === 'ArrowRight' || e.key === 'ArrowDown')  nextSlide();
        else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    prevSlide();
        else if (e.key === 'Enter' && currentSlide === totalSlides - 1) completeOnboarding();
        else if (e.key === 'Escape') completeOnboarding();
    });

    // Swipe support
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
    document.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
    });

    updateButtons();
    console.log('Onboarding initialized');
});
