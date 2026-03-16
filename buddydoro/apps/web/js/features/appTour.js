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
    },
    {
        target: '#addTasksPanel',
        badge: '5',
        tip: 'Add tasks to stay organized and track what you\'re working on.',
        position: 'right',
    },
    {
        target: '#aiPlanBtn',
        badge: '6',
        tip: 'Generate an AI-powered plan for any goal — broken into actionable steps.',
        position: 'right',
    },
    {
        target: '#timerChip',
        badge: '7',
        tip: 'Start a focus session here. Pick a duration and stay in the zone.',
        position: 'right',
    },
];

export function initAppTour() {
    if (localStorage.getItem('hasTakenTour') === 'true') return;

    let currentStep = 0;

    // ── Build DOM ─────────────────────────────────────────────
    // 4 shade panels create the darkened backdrop by framing the spotlight.
    // The target element is naturally visible and clickable through the gap.
    const shadeT = document.createElement('div');
    const shadeB = document.createElement('div');
    const shadeL = document.createElement('div');
    const shadeR = document.createElement('div');
    const ring   = document.createElement('div');
    const card   = document.createElement('div');

    shadeT.className = shadeB.className = shadeL.className = shadeR.className = 'tour-shade';
    ring.id = 'tour-spotlight-ring';
    card.id = 'tour-card';
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

    [shadeT, shadeB, shadeL, shadeR, ring, card].forEach(el => document.body.appendChild(el));

    // ── Inject styles ─────────────────────────────────────────
    const tourStyle = document.createElement('style');
    tourStyle.id = 'tour-styles';
    tourStyle.textContent = `
        .tour-shade {
            position: fixed;
            z-index: 9000;
            background: rgba(10, 6, 20, 0.82);
            pointer-events: auto;
            transition: left 0.38s cubic-bezier(0.4,0,0.2,1),
                        top  0.38s cubic-bezier(0.4,0,0.2,1),
                        width  0.38s cubic-bezier(0.4,0,0.2,1),
                        height 0.38s cubic-bezier(0.4,0,0.2,1);
        }

        #tour-spotlight-ring {
            position: fixed;
            border-radius: 14px;
            border: 2px solid rgba(167, 139, 250, 0.7);
            box-shadow: 0 0 24px rgba(124, 58, 237, 0.4);
            pointer-events: none;
            z-index: 9001;
            transition: left 0.38s cubic-bezier(0.4,0,0.2,1),
                        top  0.38s cubic-bezier(0.4,0,0.2,1),
                        width  0.38s cubic-bezier(0.4,0,0.2,1),
                        height 0.38s cubic-bezier(0.4,0,0.2,1);
        }

        #tour-card {
            position: fixed;
            z-index: 9010;
            width: 260px;
            opacity: 0;
            background: rgba(14, 8, 28, 0.96);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(124, 58, 237, 0.55);
            border-radius: 14px;
            padding: 18px 20px 16px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2);
            pointer-events: auto;
            font-family: 'Barlow', system-ui, sans-serif;
        }

        #tour-badge {
            width: 28px; height: 28px; border-radius: 50%;
            background: linear-gradient(135deg, #7c3aed, #5b21b6);
            border: 2px solid #a78bfa;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 800; color: #fff;
            box-shadow: 0 0 0 3px rgba(124,58,237,0.22), 0 0 20px rgba(124,58,237,0.8);
            margin-bottom: 12px;
        }

        #tour-tip {
            font-size: 13px; font-weight: 500; line-height: 1.55;
            color: rgba(240, 235, 255, 0.9); margin: 0 0 16px;
        }

        #tour-footer {
            display: flex; align-items: center;
            justify-content: space-between; gap: 8px;
        }

        #tour-counter {
            font-size: 10px; font-weight: 700;
            letter-spacing: 1.5px; color: rgba(167, 139, 250, 0.55);
        }

        #tour-actions { display: flex; gap: 8px; align-items: center; }

        #tour-skip-btn {
            background: none; border: none;
            font-family: 'Barlow', system-ui, sans-serif;
            font-size: 11px; font-weight: 600;
            color: rgba(167, 139, 250, 0.5);
            cursor: pointer; padding: 4px 6px; border-radius: 6px;
            transition: color 0.15s ease;
        }
        #tour-skip-btn:hover { color: rgba(167, 139, 250, 0.85); }

        #tour-next-btn {
            display: flex; align-items: center; gap: 6px;
            background: linear-gradient(135deg, #7c3aed, #5b21b6);
            border: none; border-radius: 100px;
            font-family: 'Barlow', system-ui, sans-serif;
            font-size: 12px; font-weight: 700; color: #fff;
            padding: 7px 14px; cursor: pointer;
            box-shadow: 0 0 16px rgba(124,58,237,0.45);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        #tour-next-btn:hover { transform: translateY(-1px); box-shadow: 0 0 24px rgba(124,58,237,0.65); }
        #tour-next-btn:active { transform: translateY(0); }
        #tour-next-btn i { font-size: 10px; }

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
        const sl = rect.left   - PAD;
        const st = rect.top    - PAD;
        const sr = rect.right  + PAD;
        const sb = rect.bottom + PAD;

        Object.assign(shadeT.style, { left: '0', top: '0',      width: '100%',        height: `${st}px` });
        Object.assign(shadeB.style, { left: '0', top: `${sb}px`, width: '100%',        height: `${vh - sb}px` });
        Object.assign(shadeL.style, { left: '0', top: `${st}px`, width: `${sl}px`,     height: `${sb - st}px` });
        Object.assign(shadeR.style, { left: `${sr}px`, top: `${st}px`, width: `${vw - sr}px`, height: `${sb - st}px` });

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

        attachTarget(target);

        const rect = target.getBoundingClientRect();
        positionShade(rect);
        positionCard(rect, step.position);

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
        const els = [shadeT, shadeB, shadeL, shadeR, ring, card];
        els.forEach(el => { el.style.transition = 'opacity 0.4s ease'; el.style.opacity = '0'; });
        setTimeout(() => { els.forEach(el => el.remove()); tourStyle.remove(); }, 420);
    }

    nextBtn.addEventListener('click', advance);
    skipBtn.addEventListener('click', endTour);

    // ── Start ─────────────────────────────────────────────────
    setTimeout(() => showStep(0), 800);
}
