// apps/web/js/features/timerFeature/dom.js
// DOM lookups for timer UI and menus.

export const getTimerDom = () => {
    const rightUi = document.querySelector('.right-ui');
    const display = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const modeLabel = document.getElementById('modeLabel');

    const elements = {
        timerChip: document.getElementById('timerChip'),
        timerDurationBackdrop: document.getElementById('timerDurationBackdrop'),
        timerDurationMenu: document.getElementById('timerDurationMenu'),
        timerDurationTitle: document.getElementById('timerDurationTitle'),
        timerDurationSlider: document.getElementById('timerDurationSlider'),
        timerDurationValue: document.getElementById('timerDurationValue'),
        timerDurationOk: document.getElementById('timerDurationOk'),
    };

    return { rightUi, display, startBtn, endBtn, modeLabel, elements };
};
