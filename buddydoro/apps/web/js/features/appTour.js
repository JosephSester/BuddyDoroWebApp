/**
 * appTour.js — First-visit interactive tour overlay for index.html
 *
 * Uses 4 shade panels (top/bottom/left/right) to darken everything around
 * the spotlight. The spotlit element sits in the natural gap between panels
 * so it's fully interactive without any z-index tricks — no stacking-context
 * issues regardless of where the element lives in the DOM.
 * Triggered once per user (localStorage 'hasTakenTour').
 */

const TOUR_STEPS = [
    {
        target: '#dragon',
        badge: '1',
        tip: 'This is your Buddy! They react to your focus sessions — keep them happy.',
        position: 'right',
    },
    {
        target: '#dorosChip',
        badge: '2',
        tip: 'Earn 1 Doro for every focused minute. Watch your balance grow!',
        position: 'bottom',
    },
    {
        target: '#storeChip',
        badge: '3',
        tip: 'Spend your Doros in the shop to unlock new looks for your Buddy.',
        position: 'bottom',
    },
    {
        target: '#menuButton',
        badge: '4',
        tip: 'Click the menu to reveal more features and continue the tour.',
        position: 'bottom',
        hideNext: true,
        spotlightClick: true,
    },
    {
        target: '#sidebarTasksBtn',
        badge: '5',
        tip: 'Add a new goal here to organize what you\'re working on.',
        position: 'bottom',
        beforeShow: () => {}, // wait for sidebar open animation before measuring
    },
    {
        target: '#sidebarAiPlanBtn',
        badge: '6',
        tip: 'Let AI build a study plan for any goal — broken into actionable tasks.',
        position: 'right',
    },
    {
        target: '#startSessionBtn',
        badge: '7',
        tip: 'Start a focus session when you\'re ready. Your buddy studies with you!',
        position: 'right',
        beforeShow: () => {
            const el = document.getElementById('startSessionBtn');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
    },
    {
        target: '#timerChip',
        badge: '8',
        tip: 'Access the timer anytime from here. Set your focus duration and go.',
        position: 'bottom',
    },
];

export function initAppTour() {
    if (localStorage.getItem('hasTakenTour') === 'true') return;

    let currentStep = 0;

    // ── Build DOM ─────────────────────────────────────────────
    // 4 shade panels create the darkened backdrop by framing the spotlight.
    // The target element is naturally visible and clickable through the gap.
    const shadeT   = document.createElement('div');
    const shadeB   = document.createElement('div');
    const shadeL   = document.createElement('div');
    const shadeR   = document.createElement('div');
    const ring     = document.createElement('div');
    const card     = document.createElement('div');
    const spotOver = document.createElement('div');

    shadeT.className = shadeB.className = shadeL.className = shadeR.className = 'tour-shade';
    ring.id = 'tour-spotlight-ring';
    card.id = 'tour-card';
    spotOver.id = 'tour-spotlight-overlay';
    card.innerHTML = `
        <div id="tour-badge"></div>
        <p id="tour-tip"></p>
        <div id="tour-footer">
            <span id="tour-counter"></span>
            <div id="tour-actions">
                <button id="tour-skip-btn">Skip tour</button>
                <button id="tour-next-btn">Next <i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `;

    [shadeT, shadeB, shadeL, shadeR, ring, spotOver, card].forEach(el => document.body.appendChild(el));

    // ── Inject styles ─────────────────────────────────────────
    const tourStyle = document.createElement('style');
    tourStyle.id = 'tour-styles';
    tourStyle.textContent = `
        /* BuddyDoro Tour — dark night theme */
        .tour-shade {
            position: fixed;
            z-index: 9000;
            background: rgba(26, 54, 110, 0.82);
            pointer-events: auto;
            transition: left 0.38s cubic-bezier(0.4,0,0.2,1),
                        top  0.38s cubic-bezier(0.4,0,0.2,1),
                        width  0.38s cubic-bezier(0.4,0,0.2,1),
                        height 0.38s cubic-bezier(0.4,0,0.2,1);
        }

        /* Spotlight ring — teal */
        #tour-spotlight-ring {
            position: fixed;
            border-radius: 1.5rem;
            border: 2px solid rgba(62, 207, 178, 0.70);
            box-shadow: 0 0 0 4px rgba(62,207,178,0.10), 0 0 28px rgba(62,207,178,0.35);
            pointer-events: none;
            z-index: 9001;
            transition: left 0.38s cubic-bezier(0.4,0,0.2,1),
                        top  0.38s cubic-bezier(0.4,0,0.2,1),
                        width  0.38s cubic-bezier(0.4,0,0.2,1),
                        height 0.38s cubic-bezier(0.4,0,0.2,1);
        }

        /* Tour card — dark glass */
        #tour-card {
            position: fixed;
            z-index: 9010;
            width: 272px;
            opacity: 0;
            background: rgba(15, 28, 65, 0.92);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border: 1px solid rgba(120, 140, 200, 0.28);
            border-radius: 1.5rem;
            padding: 20px 22px 18px;
            box-shadow: 0 12px 40px rgba(26, 54, 110,0.40), 0 0 0 1px rgba(120,140,200,0.15);
            pointer-events: auto;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        }

        /* Step badge — teal gradient */
        #tour-badge {
            width: 30px; height: 30px; border-radius: 9999px;
            background: linear-gradient(to bottom, #3ecfb2, #2aad94);
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 800; color: #ffffff;
            box-shadow: 0 0 0 3px rgba(62,207,178,0.20), 0 4px 16px rgba(62,207,178,0.45);
            margin-bottom: 12px;
        }

        #tour-tip {
            font-size: 13px; font-weight: 500; line-height: 1.6;
            color: #e8d5f5; margin: 0 0 16px;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        }

        #tour-footer {
            display: flex; align-items: center;
            justify-content: space-between; gap: 8px;
        }

        #tour-counter {
            font-size: 10px; font-weight: 700;
            letter-spacing: 1.5px;
            color: #9db0cc;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        }

        #tour-actions { display: flex; gap: 8px; align-items: center; }

        #tour-skip-btn {
            background: none; border: none;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
            font-size: 11px; font-weight: 700;
            color: #9db0cc;
            cursor: pointer; padding: 5px 8px; border-radius: 9999px;
            transition: color 0.15s ease, background 0.15s ease;
        }
        #tour-skip-btn:hover {
            color: #ffffff;
            background: rgba(62,207,178,0.12);
        }

        /* Next button — teal→purple gradient */
        #tour-next-btn {
            display: flex; align-items: center; gap: 6px;
            background: linear-gradient(to bottom right, #3ecfb2, #7c5cbf);
            border: none; border-radius: 9999px;
            font-family: "Plus Jakarta Sans", system-ui, sans-serif;
            font-size: 12px; font-weight: 700; color: #ffffff;
            padding: 8px 16px; cursor: pointer;
            box-shadow: 0 4px 16px rgba(124,92,191,0.40);
            transition: transform 0.15s ease, filter 0.15s ease;
        }
        #tour-next-btn:hover  { transform: translateY(-1px); filter: brightness(1.06); }
        #tour-next-btn:active { transform: translateY(0); filter: brightness(0.97); }
        #tour-next-btn i { font-size: 10px; }

        /* Transparent click-capture overlay for spotlightClick steps */
        #tour-spotlight-overlay {
            position: fixed;
            z-index: 9002;
            background: transparent;
            cursor: pointer;
            display: none;
        }

        @keyframes tourCardIn {
            from { opacity: 0; transform: scale(0.94) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tour-card-animate { animation: tourCardIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) both; }
    `;
    document.head.appendChild(tourStyle);

    const badgeEl = document.getElementById('tour-badge');
    const tipEl   = document.getElementById('tour-tip');
    const counter = document.getElementById('tour-counter');
    const nextBtn = document.getElementById('tour-next-btn');
    const skipBtn = document.getElementById('tour-skip-btn');

    // ── Shade + ring positioning ──────────────────────────────
    const PAD    = 12;
    const CARD_W = 260;
    const CARD_H = 148;
    const GAP    = 20;

    function positionShade(rect) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const sl = Math.max(0, rect.left   - PAD);
        const st = Math.max(0, rect.top    - PAD);
        const sr = Math.min(vw, rect.right  + PAD);
        const sb = Math.min(vh, rect.bottom + PAD);

        Object.assign(shadeT.style, { left: '0', top: '0',       width: '100%',             height: `${st}px` });
        Object.assign(shadeB.style, { left: '0', top: `${sb}px`, width: '100%',             height: `${Math.max(0, vh - sb)}px` });
        Object.assign(shadeL.style, { left: '0', top: `${st}px`, width: `${sl}px`,          height: `${Math.max(0, sb - st)}px` });
        Object.assign(shadeR.style, { left: `${sr}px`, top: `${st}px`, width: `${Math.max(0, vw - sr)}px`, height: `${Math.max(0, sb - st)}px` });

        ring.style.left   = `${sl}px`;
        ring.style.top    = `${st}px`;
        ring.style.width  = `${rect.width  + PAD * 2}px`;
        ring.style.height = `${rect.height + PAD * 2}px`;
    }

    function positionCard(rect, preferred) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const opts = {
            right:  { left: rect.right  + PAD + GAP,                   top: rect.top + rect.height / 2 - CARD_H / 2 },
            left:   { left: rect.left   - PAD - GAP - CARD_W,          top: rect.top + rect.height / 2 - CARD_H / 2 },
            bottom: { left: rect.left   + rect.width / 2 - CARD_W / 2, top: rect.bottom + PAD + GAP },
            top:    { left: rect.left   + rect.width / 2 - CARD_W / 2, top: rect.top  - PAD - GAP - CARD_H },
        };
        const order = { right: ['right','left','bottom','top'], left: ['left','right','bottom','top'],
                        bottom: ['bottom','top','right','left'], top: ['top','bottom','right','left'] };

        let chosen = opts[preferred];
        for (const d of (order[preferred] || ['right'])) {
            const c = opts[d];
            if (c.left >= 0 && c.left + CARD_W <= vw && c.top >= 0 && c.top + CARD_H <= vh) { chosen = c; break; }
        }

        card.style.left = `${Math.max(12, Math.min(chosen.left, vw - CARD_W - 12))}px`;
        card.style.top  = `${Math.max(12, Math.min(chosen.top,  vh - CARD_H - 12))}px`;
    }

    // ── Click listener on target ──────────────────────────────
    let activeTarget = null;
    let activeFn     = null;

    function attachTarget(el) {
        activeTarget = el;
        activeFn = () => advance();
        el.addEventListener('click', activeFn);
    }

    function detachTarget() {
        if (!activeTarget) return;
        activeTarget.removeEventListener('click', activeFn);
        activeTarget = activeFn = null;
    }

    // ── Advance / end ─────────────────────────────────────────
    function advance() {
        detachTarget();
        if (currentStep < TOUR_STEPS.length - 1) {
            currentStep++;
            showStep(currentStep);
        } else {
            endTour();
        }
    }

    // ── Render a step ─────────────────────────────────────────
    function showStep(index) {
        detachTarget();

        const step   = TOUR_STEPS[index];
        const target = document.querySelector(step.target);

        if (!target) {
            if (index < TOUR_STEPS.length - 1) showStep(index + 1);
            else endTour();
            return;
        }

        if (step.beforeShow) {
            step.beforeShow();
            setTimeout(() => renderStep(index, step, target), 420);
            return;
        }

        renderStep(index, step, target);
    }

    function renderStep(index, step, target) {
        attachTarget(target);

        const rect = target.getBoundingClientRect();

        positionShade(rect);
        positionCard(rect, step.position);

        // For steps where the target is small, cover the whole spotlight area
        // with a transparent overlay so clicking anywhere in it counts.
        if (step.spotlightClick) {
            spotOver.style.display = 'block';
            spotOver.style.left   = `${rect.left   - PAD}px`;
            spotOver.style.top    = `${rect.top    - PAD}px`;
            spotOver.style.width  = `${rect.width  + PAD * 2}px`;
            spotOver.style.height = `${rect.height + PAD * 2}px`;
            spotOver.onclick = () => { target.click(); };
        } else {
            spotOver.style.display = 'none';
            spotOver.onclick = null;
        }

        badgeEl.textContent = step.badge;
        tipEl.textContent   = step.tip;
        counter.textContent = `${index + 1} / ${TOUR_STEPS.length}`;

        const isLast = index === TOUR_STEPS.length - 1;
        const step_def = TOUR_STEPS[index];
        nextBtn.innerHTML = isLast
            ? `Done <i class="fas fa-check"></i>`
            : `Next <i class="fas fa-arrow-right"></i>`;
        nextBtn.style.display = step_def.hideNext ? 'none' : '';

        card.classList.remove('tour-card-animate');
        void card.offsetWidth;
        card.classList.add('tour-card-animate');
    }

    function endTour() {
        detachTarget();
        localStorage.setItem('hasTakenTour', 'true');
        spotOver.style.display = 'none';
        const els = [shadeT, shadeB, shadeL, shadeR, ring, spotOver, card];
        els.forEach(el => { el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '0'; });
        setTimeout(() => { els.forEach(el => el.remove()); tourStyle.remove(); }, 420);
    }

    nextBtn.addEventListener('click', advance);
    skipBtn.addEventListener('click', endTour);

    // ── Start ─────────────────────────────────────────────────
    setTimeout(() => showStep(0), 800);
}
