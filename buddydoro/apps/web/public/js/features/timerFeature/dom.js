// apps/web/js/features/timerFeature/dom.js
// DOM lookups for timer UI.

export const getTimerDom = () => {
    const rightUi  = document.querySelector('.right-ui');
    const display  = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');

    return { rightUi, display, startBtn };
};
