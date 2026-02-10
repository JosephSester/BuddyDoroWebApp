// apps/web/js/features/timerFeature/menu.js
// Timer launch and duration menus.

export const initTimerMenus = ({
    elements,
    limits,
    getFocusDefaultMinutes,
    getBreakDefaultMinutes,
    onStartWithDuration,
} = {}) => {
    const {
        timerChip,
        timerDurationBackdrop,
        timerDurationMenu,
        timerDurationTitle,
        timerDurationSlider,
        timerDurationValue,
        timerDurationOk,
    } = elements;

    let durationMenuPromise = null;
    let launchHandler = null;

    const closeDurationMenu = () => {
        if (!timerDurationMenu) return;
        timerDurationMenu.hidden = true;
        timerDurationMenu.classList.remove('is-open');
        timerDurationMenu.setAttribute('aria-hidden', 'true');
        if (timerDurationBackdrop) timerDurationBackdrop.hidden = true;
    };

    const defaultDurationTitle = (timerDurationTitle?.textContent || 'Set minutes').trim();

    const openDurationMenuInternal = (modeKey, titleOverride) => {
        if (!timerDurationMenu || !timerDurationSlider) return;
        if (timerDurationTitle) {
            timerDurationTitle.textContent = titleOverride || defaultDurationTitle;
        }
        const baseMinutes = modeKey === 'break' ? getBreakDefaultMinutes() : getFocusDefaultMinutes();
        timerDurationSlider.value = String(baseMinutes);
        if (timerDurationValue) timerDurationValue.value = String(baseMinutes);
        const min = Number(timerDurationSlider.min || limits.min);
        const max = Number(timerDurationSlider.max || limits.max);
        const pct = ((baseMinutes - min) / (max - min)) * 100;
        timerDurationSlider.style.setProperty('--slider-fill', `${pct}%`);
        timerDurationMenu.hidden = false;
        timerDurationMenu.classList.add('is-open');
        timerDurationMenu.setAttribute('aria-hidden', 'false');
        if (timerDurationBackdrop) timerDurationBackdrop.hidden = false;
    };

    const openDurationMenu = ({ title } = {}) => new Promise((resolve) => {
        durationMenuPromise = resolve;
        openDurationMenuInternal('focus', title);
    });

    const openBreakDurationMenu = ({ title } = {}) => new Promise((resolve) => {
        durationMenuPromise = resolve;
        openDurationMenuInternal('break', title);
    });

    const updateSliderFill = () => {
        if (!timerDurationSlider) return;
        const min = Number(timerDurationSlider.min || limits.min);
        const max = Number(timerDurationSlider.max || limits.max);
        const val = Number(timerDurationSlider.value || min);
        const pct = ((val - min) / (max - min)) * 100;
        timerDurationSlider.style.setProperty('--slider-fill', `${pct}%`);
        if (timerDurationValue) timerDurationValue.value = String(val);
    };

    const updateValueFromInput = () => {
        if (!timerDurationValue || !timerDurationSlider) return;
        let val = Number(timerDurationValue.value || limits.min);
        val = Math.max(limits.min, Math.min(val, limits.max));
        timerDurationSlider.value = String(val);
        timerDurationValue.value = String(val);
        updateSliderFill();
    };

    const wireMenu = () => {
        if (!timerChip) {
            console.warn('[Timer] Launch elements not found - menu wiring skipped');
            return;
        }

        timerChip.addEventListener('click', (e) => {
            e.stopPropagation();
            if (launchHandler) {
                launchHandler('focus');
                return;
            }
            openDurationMenuInternal('focus');
        });

        timerChip.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (launchHandler) {
                    launchHandler('focus');
                    return;
                }
                openDurationMenuInternal('focus');
            }
        });

        timerDurationSlider?.addEventListener('input', updateSliderFill);

        timerDurationValue?.addEventListener('input', updateValueFromInput);
        timerDurationValue?.addEventListener('change', updateValueFromInput);

        timerDurationOk?.addEventListener('click', () => {
            const minutes = Number.parseInt(timerDurationValue?.value || timerDurationSlider?.value || '0', 10);
            if (durationMenuPromise) {
                closeDurationMenu();
                durationMenuPromise(minutes);
                durationMenuPromise = null;
                return;
            }
            const durationSeconds = Math.max(limits.min, Math.min(minutes, limits.max)) * 60;
            closeDurationMenu();
            onStartWithDuration('focus', durationSeconds);
        });

        timerDurationBackdrop?.addEventListener('click', () => {
            closeDurationMenu();
            if (durationMenuPromise) {
                durationMenuPromise(null);
                durationMenuPromise = null;
            }
        });

    };

    return {
        wireMenu,
        openDurationMenu,
        openBreakDurationMenu,
        setLaunchHandler: (handler) => { launchHandler = handler; },
    };
};
