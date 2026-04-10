// ============================================================================
// Universal Notification System
// ============================================================================
/**
 * Shows a temporary notification toast to the user
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', or 'info' (defaults to 'info')
 * @param {number} duration - How long to show the notification in ms (default 3000)
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Find or create notification container
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notif = document.createElement('div');
    notif.className = `notification notification--${type}`;

    // Add emoji icon
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = icons[type];

    const text = document.createElement('span');
    text.textContent = message;

    notif.appendChild(icon);
    notif.appendChild(text);
    container.appendChild(notif);

    // Auto-remove after duration
    setTimeout(() => {
        notif.classList.add('slideout');
        setTimeout(() => notif.remove(), 300);
    }, duration);
}

// ---------------------------------------------------------------------------
// Busy/Loading Indicator
// ---------------------------------------------------------------------------
let busyIndicator = null;

/**
 * Shows or hides a loading indicator overlay
 * @param {boolean} isBusy - Whether to show the indicator
 * @param {string} message - Message to display (default 'Loading...')
 * @param {HTMLElement|null} targetElement - Optional element to overlay (defaults to fullscreen)
 */
export function setBusy(isBusy, message = 'Loading...', targetElement = null) {
    // Build indicator lazily
    if (!busyIndicator) {
        busyIndicator = document.createElement('div');
        busyIndicator.id = 'busy-indicator';

        const spinner = document.createElement('span');
        spinner.className = 'busy-spinner';
        spinner.textContent = '⏳';

        const label = document.createElement('span');
        label.className = 'busy-text';

        busyIndicator.append(spinner, label);
        document.body.appendChild(busyIndicator);
    }

    // Update text and visibility
    const labelEl = busyIndicator.querySelector('.busy-text');
    if (labelEl) labelEl.textContent = message;
    busyIndicator.classList.toggle('active', isBusy);

    // If a specific target element is provided, overlay just that area
    // (For now, this is fullscreen - can be enhanced later for scoped overlays)
    if (targetElement && isBusy) {
        targetElement.style.opacity = '0.55';
        targetElement.style.pointerEvents = 'none';
    } else if (targetElement && !isBusy) {
        targetElement.style.opacity = '';
        targetElement.style.pointerEvents = '';
    }
}
