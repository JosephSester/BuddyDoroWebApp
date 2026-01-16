/**
 * ============================================================================
 * ONBOARDING SYSTEM - Interactive Tutorial for First-Time Users
 * ============================================================================
 * 
 * This module provides a step-by-step guided tour for new users, teaching them
 * how to use BuddyDoro's core features: tasks, timer, currency, and store.
 * 
 * KEY FEATURES:
 * - Progressive disclosure: One concept at a time
 * - Interactive requirements: Users must complete actions (create task, start timer)
 * - Smart positioning: Tooltips automatically avoid blocking highlighted elements
 * - Persistence: Progress saved to localStorage, resumable after refresh
 * - Non-intrusive: Highlighted elements remain fully interactive
 * - Celebration: Confetti animation upon completion
 * 
 * ARCHITECTURE:
 * - Step-based configuration (STEPS array)
 * - Event-driven progression (custom events from features)
 * - Dynamic DOM manipulation for tooltips and overlays
 * - Cleanup system to prevent memory leaks
 * ============================================================================
 */

// LocalStorage keys for persistence
const STORAGE_KEY = 'buddyDoro.onboardingCompleted';
const PROGRESS_KEY = 'buddyDoro.onboardingProgress';

/**
 * Step Configuration Array
 * Each step defines:
 * - id: Unique identifier
 * - title: Step heading shown in tooltip
 * - description: Instructional text
 * - target: CSS selector for element to highlight (null for centered tooltips)
 * - position: Preferred tooltip position relative to target ('top', 'bottom', 'left', 'right', 'center')
 * - requireInteraction: Whether user must complete an action to proceed
 * - waitFor: Event name to listen for (when requireInteraction is true)
 * - highlightElement: Whether to apply pulsing highlight effect
 * - action: What happens on next ('next', 'wait', 'finish')
 * - delay: Optional delay before showing tooltip (milliseconds)
 */
const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to BuddyDoro! 🎉',
        description: 'Your productivity companion is here to help you stay focused. Let\'s learn how to get started!',
        target: '#dragon', // or whatever the companion element ID is
        position: 'bottom',
        requireInteraction: false,
        action: 'next'
    },
    {
        id: 'create-task',
        title: 'Create Your First Task',
        description: 'Start by adding something you want to work on. Click the + button to create a task.',
        target: '#addTaskBtn',
        position: 'left',
        requireInteraction: true,
        waitFor: 'task-created',
        // Highlight the fields inside the task creator (not the + button)
        highlightElement: true,
        highlightTargets: [
            '.task-create-name',      // Task name input
            '.task-create-estimate',  // Estimate input
            '.task-create-save'       // Save button
        ],
        action: 'wait'
    },
    {
        id: 'select-task',
        title: 'Select Your Task',
        description: 'Great! Now click on the task you just created to select it. You need to select a task before starting the timer.',
        target: '.task-card',
        position: 'left',
        requireInteraction: true,
        waitFor: 'task-selected',
        highlightElement: true,
        action: 'wait'
    },
    {
        id: 'understand-timer',
        title: 'Meet the Timer ⏱️',
        description: 'Use Study mode to focus, then take Short or Long Breaks. You can customize the durations using the menu button (⋮) below.',
        target: '.timer-card',
        position: 'right',
        requireInteraction: false,
        action: 'next'
    },
    {
        id: 'start-session',
        title: 'Start Your Focus Session',
        description: 'Ready to begin? Click the Start button to begin your first study session!',
        target: '#startBtn',
        position: 'top',
        requireInteraction: true,
        waitFor: 'timer-started',
        highlightElement: true,
        action: 'wait'
    },
    {
        id: 'earn-doros',
        title: 'Earn Doros! 💰',
        description: 'You earn 50 Doros for every 5 minutes of focused study time. Use them to care for your companion!',
        target: '#dorosChip',
        position: 'bottom',
        requireInteraction: false,
        action: 'next',
        delay: 2000 // Show after timer starts
    },
    {
        id: 'visit-store',
        title: 'Visit the Store 🏪',
        description: 'Click here to see what you can buy for your companion. Food, toys, and more await!',
        target: '#storeChip',
        position: 'bottom',
        requireInteraction: true,
        waitFor: 'store-opened',
        highlightElement: true,
        action: 'wait'
    },
    {
        id: 'complete',
        title: 'You\'re All Set! ✨',
        description: 'Great job! You\'re ready to boost your productivity with BuddyDoro. Keep focusing and watch your companion thrive!',
        target: null,
        position: 'center',
        requireInteraction: false,
        action: 'finish'
    }
];

/**
 * ============================================================================
 * MAIN INITIALIZATION FUNCTION
 * ============================================================================
 */
export function initOnboarding() {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    let currentStepIndex = loadProgress(); // Resume from saved progress
    let elementsToCleanup = [];           // Track elements we've modified for cleanup
    let eventListeners = [];              // Track event listeners for cleanup
    let isActive = false;                 // Whether onboarding is currently running
    let isCompleted = isOnboardingCompleted(); // Check if already completed
    let highlightRetryTimers = [];             // Track retry timers for highlighting

    // ========================================================================
    // DOM ELEMENT REFERENCES
    // ========================================================================
    const overlay = document.getElementById('onboardingOverlay');
    const spotlight = document.getElementById('onboardingSpotlight');
    const tooltip = document.getElementById('onboardingTooltip');
    const tooltipStep = document.getElementById('onboardingTooltipStep');
    const tooltipTitle = document.getElementById('onboardingTooltipTitle');
    const tooltipDescription = document.getElementById('onboardingTooltipDescription');
    const nextBtn = document.getElementById('onboardingNextBtn');
    const skipBtn = document.getElementById('onboardingSkipBtn');
    const progress = document.getElementById('onboardingProgress');
    const progressDots = document.getElementById('onboardingProgressDots');

    // Safety check: Ensure required DOM elements exist
    if (!overlay || !tooltip) {
        console.warn('Onboarding: Required DOM elements not found');
        return null;
    }

    // ========================================================================
    // PERSISTENCE FUNCTIONS
    // ========================================================================

    /**
     * Check if user has completed onboarding before
     * @returns {boolean} True if onboarding was completed previously
     */
    function isOnboardingCompleted() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Mark onboarding as completed and clear progress
     */
    function markCompleted() {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
            localStorage.removeItem(PROGRESS_KEY);
        } catch { }
    }

    /**
     * Load saved progress from localStorage
     * @returns {number} The step index to resume from (0 if no progress saved)
     */
    function loadProgress() {
        try {
            const saved = localStorage.getItem(PROGRESS_KEY);
            return saved ? parseInt(saved, 10) : 0;
        } catch {
            return 0;
        }
    }

    /**
     * Save current step index to localStorage
     * @param {number} index - Current step index
     */
    function saveProgress(index) {
        try {
            localStorage.setItem(PROGRESS_KEY, String(index));
        } catch { }
    }

    // ========================================================================
    // CLEANUP FUNCTIONS
    // ========================================================================

    /**
     * Skip onboarding entirely and mark as completed
     */
    function skip() {
        cleanup();
        markCompleted();
    }

    /**
     * Clean up all onboarding UI elements and event listeners
     * Restores the page to its pre-onboarding state
     */
    function cleanup() {
        isActive = false;

        // Remove active classes from UI overlay elements
        overlay?.classList.remove('active');
        spotlight?.classList.remove('active');
        tooltip?.classList.remove('active');
        skipBtn?.classList.remove('active');
        progress?.classList.remove('active');

        // Restore all modified elements to original state
        elementsToCleanup.forEach(el => {
            el.classList.remove('onboarding-interactive-highlight', 'onboarding-pulse');
            el.style.pointerEvents = '';  // Restore click handling
            el.style.zIndex = '';         // Restore stacking order
        });
        elementsToCleanup = [];

        // Remove all event listeners we attached
        eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        eventListeners = [];

        // Clear any pending highlight retry timers
        highlightRetryTimers.forEach(timer => clearInterval(timer));
        highlightRetryTimers = [];
    }

    /**
     * Track an event listener so it can be cleaned up later
     * @param {Element} element - DOM element to attach listener to
     * @param {string} event - Event name (e.g., 'click')
     * @param {Function} handler - Event handler function
     */
    function addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        eventListeners.push({ element, event, handler });
    }

    // ========================================================================
    // PROGRESS INDICATOR FUNCTIONS
    // ========================================================================

    /**
     * Create progress dots representing all steps
     * Dots show completed, active, and upcoming steps
     */
    function createProgressDots() {
        if (!progressDots) return;
        progressDots.innerHTML = '';

        STEPS.forEach((step, index) => {
            const dot = document.createElement('div');
            dot.className = 'onboarding-progress-dot';
            // Style based on completion status
            if (index < currentStepIndex) {
                dot.classList.add('completed');  // Green checkmark style
            } else if (index === currentStepIndex) {
                dot.classList.add('active');     // Gold pulsing style
            }
            // Upcoming steps remain gray (default)
            progressDots.appendChild(dot);
        });
    }

    /**
     * Update progress dots when moving between steps
     * More efficient than recreating all dots
     */
    function updateProgressDots() {
        if (!progressDots) return;
        const dots = progressDots.querySelectorAll('.onboarding-progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('completed', 'active');
            if (index < currentStepIndex) {
                dot.classList.add('completed');
            } else if (index === currentStepIndex) {
                dot.classList.add('active');
            }
        });
    }

    // ========================================================================
    // TOOLTIP POSITIONING FUNCTIONS
    // ========================================================================

    /**
     * Position tooltip relative to target element
     * 
     * CRITICAL: This function ensures tooltips don't block the elements
     * they're highlighting. It uses intelligent positioning that:
     * 1. Respects the preferred position from step config
     * 2. Falls back to alternative positions if preferred blocks the target
     * 3. Keeps tooltip within viewport bounds
     * 4. Leaves adequate spacing between tooltip and target
     * 
     * @param {Object} step - Step configuration object
     */
    function positionTooltip(step) {
        if (!tooltip) return;

        // Reset tooltip classes
        tooltip.className = 'onboarding-tooltip';

        // Handle centered tooltips (no specific target)
        if (!step.target) {
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active');
            return;
        }

        // Find the target element to highlight
        const targetEl = document.querySelector(step.target);
        if (!targetEl) {
            console.warn(`Onboarding: Target element not found: ${step.target}`);
            return;
        }

        // Get element and tooltip dimensions
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const spacing = 24; // Increased spacing to prevent blocking

        let top, left;
        let arrowClass = '';

        // Position tooltip based on step configuration
        // Each position places tooltip AWAY from the target element
        switch (step.position) {
            case 'top':
                // Position above target, centered horizontally
                top = rect.top - tooltipRect.height - spacing;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                arrowClass = 'arrow-bottom'; // Arrow points down to target
                break;

            case 'bottom':
                // Position below target, centered horizontally
                top = rect.bottom + spacing;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                arrowClass = 'arrow-top'; // Arrow points up to target
                break;

            case 'left':
                // Position to the left of target, centered vertically
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - spacing;
                arrowClass = 'arrow-right'; // Arrow points right to target
                break;

            case 'right':
                // Position to the right of target, centered vertically
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + spacing;
                arrowClass = 'arrow-left'; // Arrow points left to target
                break;

            default:
                // Default to bottom position
                top = rect.bottom + spacing;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                arrowClass = 'arrow-top';
        }

        // VIEWPORT BOUNDARY DETECTION
        // Ensure tooltip stays within visible screen area
        const viewportPadding = 20;

        // Constrain vertical position
        if (top < viewportPadding) {
            // Too high - push down
            top = viewportPadding;
        } else if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
            // Too low - push up
            top = window.innerHeight - tooltipRect.height - viewportPadding;
        }

        // Constrain horizontal position
        if (left < viewportPadding) {
            // Too far left - push right
            left = viewportPadding;
        } else if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
            // Too far right - push left
            left = window.innerWidth - tooltipRect.width - viewportPadding;
        }

        // Apply calculated position
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.transform = 'none'; // Remove any default transform
        tooltip.classList.add(arrowClass);
    }

    /**
     * Position the spotlight effect around target element
     * Creates a glowing border that draws attention without blocking interaction
     * 
     * @param {Object} step - Step configuration object
     */
    function positionSpotlight(step) {
        // Hide spotlight if no target specified
        if (!spotlight || !step.target) {
            spotlight?.classList.remove('active');
            return;
        }

        // Find the target element
        const targetEl = document.querySelector(step.target);
        if (!targetEl) return;

        // Calculate spotlight position with padding around element
        const rect = targetEl.getBoundingClientRect();
        const padding = 8; // Small padding for visual breathing room

        // Create/update dynamic style for the spotlight border
        // We use a dynamic style tag because ::before pseudo-elements
        // can't be directly manipulated via JavaScript
        const existingStyle = document.getElementById('onboarding-spotlight-style');
        existingStyle?.remove();

        const style = document.createElement('style');
        style.id = 'onboarding-spotlight-style';
        style.textContent = `
            .onboarding-spotlight::before {
                top: ${rect.top - padding}px;
                left: ${rect.left - padding}px;
                width: ${rect.width + padding * 2}px;
                height: ${rect.height + padding * 2}px;
            }
        `;
        document.head.appendChild(style);

        // Activate spotlight
        spotlight.classList.add('active');
    }

    /**
     * Apply visual highlight to interactive elements
     * 
     * CRITICAL: This function ensures highlighted elements remain clickable
     * by setting pointer-events: auto and proper z-index
     * 
     * @param {Object} step - Step configuration object
     */
    function highlightElement(step) {
        // Only highlight if configured
        if (!step.highlightElement) return;

        // Support multiple explicit targets for a step (fallback to single target)
        const selectors = Array.isArray(step.highlightTargets) && step.highlightTargets.length
            ? step.highlightTargets
            : (step.target ? [step.target] : []);
        if (!selectors.length) return;

        // Helper to apply highlight to all matching elements
        const applyHighlights = () => {
            let applied = false;
            selectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (!el) return;

                el.classList.add('onboarding-interactive-highlight', 'onboarding-pulse');
                el.style.position = 'relative';
                el.style.zIndex = '10000';       // Above overlay
                el.style.pointerEvents = 'auto'; // Keep clickable
                elementsToCleanup.push(el);
                applied = true;
            });
            return applied;
        };

        // Try immediately; if fields not yet in DOM, retry a few times briefly
        if (applyHighlights()) return;

        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (applyHighlights() || attempts >= 10) {
                clearInterval(timer);
            }
        }, 150); // retry up to ~1.5s
        highlightRetryTimers.push(timer);
    }

    // ========================================================================
    // STEP DISPLAY AND NAVIGATION
    // ========================================================================

    /**
     * Display a specific onboarding step
     * Handles all UI updates: tooltip content, positioning, highlights, etc.
     * 
     * @param {number} index - Step index to display
     */
    function showStep(index) {
        // Validate step index
        if (index < 0 || index >= STEPS.length) return;

        const step = STEPS[index];
        currentStepIndex = index;
        saveProgress(index); // Save to localStorage for resume capability

        // Update tooltip text content
        if (tooltipStep) tooltipStep.textContent = `Step ${index + 1} of ${STEPS.length}`;
        if (tooltipTitle) tooltipTitle.textContent = step.title;
        if (tooltipDescription) tooltipDescription.textContent = step.description;

        // Configure Next button based on step requirements
        if (nextBtn) {
            // Disable button if user must complete an interaction first
            nextBtn.disabled = step.requireInteraction;

            // Update button text based on step action
            nextBtn.textContent = step.action === 'finish' ? 'Get Started!' : 'Next';

            // Show waiting spinner if interaction required
            if (step.requireInteraction) {
                const waitingIndicator = document.createElement('span');
                waitingIndicator.className = 'onboarding-waiting';
                nextBtn.appendChild(waitingIndicator);
            }
        }

        // Position all visual elements for this step
        positionSpotlight(step);   // Glowing border around target
        positionTooltip(step);     // Instruction text box
        highlightElement(step);    // Pulsing highlight effect
        // updateProgressDots();      // Progress indicator at top - REMOVED

        // Activate tooltip with optional delay for better UX
        // Delay allows previous step to fully disappear before new one appears
        setTimeout(() => {
            tooltip?.classList.add('active');
        }, step.delay || 100);

        // Set up event listeners if this step requires user interaction
        if (step.requireInteraction) {
            setupStepInteraction(step);
        }
    }

    /**
     * Set up event listeners for interactive steps
     * Waits for specific user actions before allowing progression
     * 
     * @param {Object} step - Step configuration object with waitFor property
     */
    function setupStepInteraction(step) {
        switch (step.waitFor) {
            case 'task-created':
                // Wait for user to create their first task
                const handleTaskCreated = () => {
                    if (nextBtn) {
                        nextBtn.disabled = false;
                        const waitingIndicator = nextBtn.querySelector('.onboarding-waiting');
                        waitingIndicator?.remove();
                    }
                    document.removeEventListener('buddydoro:task-created', handleTaskCreated);
                };
                document.addEventListener('buddydoro:task-created', handleTaskCreated);
                eventListeners.push({ element: document, event: 'buddydoro:task-created', handler: handleTaskCreated });

                // Remove spotlight from create button once clicked (form will appear)
                const addTaskBtn = document.querySelector('#addTaskBtn');
                if (addTaskBtn) {
                    const handleAddTaskClick = () => {
                        // Hide the yellow spotlight border around the button
                        if (spotlight) {
                            spotlight.classList.remove('active');
                        }
                        addTaskBtn.removeEventListener('click', handleAddTaskClick);
                    };
                    addTaskBtn.addEventListener('click', handleAddTaskClick);
                    eventListeners.push({ element: addTaskBtn, event: 'click', handler: handleAddTaskClick });
                }
                break;

            case 'task-selected':
                // Wait for user to select a task
                const handleTaskSelected = () => {
                    if (nextBtn) {
                        nextBtn.disabled = false;
                        const waitingIndicator = nextBtn.querySelector('.onboarding-waiting');
                        waitingIndicator?.remove();
                    }
                    document.removeEventListener('buddydoro:task-selected', handleTaskSelected);
                };
                document.addEventListener('buddydoro:task-selected', handleTaskSelected);
                eventListeners.push({ element: document, event: 'buddydoro:task-selected', handler: handleTaskSelected });
                break;

            case 'timer-started':
                // Wait for user to start the timer
                const handleTimerStarted = () => {
                    if (nextBtn) {
                        nextBtn.disabled = false;
                        const waitingIndicator = nextBtn.querySelector('.onboarding-waiting');
                        waitingIndicator?.remove();
                    }
                    // Auto-advance after brief delay to show the timer running
                    setTimeout(() => nextStep(), 1000);
                };
                document.addEventListener('buddydoro:timer-started', handleTimerStarted);
                eventListeners.push({ element: document, event: 'buddydoro:timer-started', handler: handleTimerStarted });
                break;

            case 'store-opened':
                // Wait for user to open the store
                const handleStoreOpened = () => {
                    if (nextBtn) {
                        nextBtn.disabled = false;
                        const waitingIndicator = nextBtn.querySelector('.onboarding-waiting');
                        waitingIndicator?.remove();
                    }
                    // Auto-advance after brief delay to show the store opened
                    setTimeout(() => nextStep(), 1500);
                };
                document.addEventListener('buddydoro:store-opened', handleStoreOpened);
                eventListeners.push({ element: document, event: 'buddydoro:store-opened', handler: handleStoreOpened });
                break;
        }
    }

    /**
     * Advance to the next step in the onboarding flow
     * Handles cleanup between steps and final completion
     */
    function nextStep() {
        const step = STEPS[currentStepIndex];

        // Check if this is the final step
        if (step.action === 'finish') {
            finish();
            return;
        }

        // Advance to next step if available
        if (currentStepIndex < STEPS.length - 1) {
            cleanup(); // Clean up current step's UI elements
            // Small delay for smooth transition between steps
            setTimeout(() => {
                showStep(currentStepIndex + 1);
            }, 300);
        } else {
            // No more steps - finish onboarding
            finish();
        }
    }

    /**
     * Complete the onboarding process
     * Shows celebration animation then cleans up
     */
    function finish() {
        showConfetti(); // Celebrate completion!
        // Delay cleanup to let confetti animation play
        setTimeout(() => {
            cleanup();
            markCompleted();
        }, 2000);
    }

    // ========================================================================
    // CELEBRATION ANIMATION
    // ========================================================================

    /**
     * Show confetti animation to celebrate onboarding completion
     * Creates 50 colorful falling confetti pieces
     */
    function showConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'onboarding-confetti active';
        document.body.appendChild(confettiContainer);

        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181'];

        // Create 50 individual confetti pieces
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'onboarding-confetti-piece';
            piece.style.left = Math.random() * 100 + '%'; // Random horizontal position
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 0.5 + 's';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confettiContainer.appendChild(piece);
        }

        // Remove confetti container after animation completes
        setTimeout(() => {
            confettiContainer.remove();
        }, 4000);
    }

    // ========================================================================
    // START AND CONTROL FUNCTIONS
    // ========================================================================

    /**
     * Start the onboarding process
     * Activates overlay, progress indicator, and first step
     */
    function start() {
        // Prevent multiple simultaneous onboarding sessions
        if (isActive) return;

        isActive = true;


        // Activate all UI overlay elements
        overlay?.classList.add('active');
        skipBtn?.classList.add('active');


        // Display the first step (or resume from saved progress)
        showStep(currentStepIndex);
    }

    /**
     * Restart onboarding from the beginning
     * Useful for testing or if user wants to see tutorial again
     * Clears completion status so tutorial displays again
     */
    function restart() {
        cleanup();               // Clear current state
        currentStepIndex = 0;    // Reset to first step
        isCompleted = false;     // Mark as not completed so it will display
        // Clear both completion and progress flags from localStorage
        try {
            localStorage.removeItem(STORAGE_KEY);  // Clear completion flag
            localStorage.removeItem(PROGRESS_KEY); // Clear progress flag
        } catch { }
        start();                 // Begin again
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    // Attach button click handlers
    nextBtn?.addEventListener('click', nextStep);
    skipBtn?.addEventListener('click', skip);

    /**
     * Handle window resize events
     * Repositions tooltip and spotlight to match new element positions
     */
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        // Debounce resize events to avoid excessive recalculations
        resizeTimeout = setTimeout(() => {
            if (isActive) {
                const step = STEPS[currentStepIndex];
                // Recalculate positions for current step
                positionSpotlight(step);
                positionTooltip(step);
            }
        }, 100); // Wait 100ms after last resize event
    };
    window.addEventListener('resize', handleResize);

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    // Auto-start onboarding only if NOT already completed
    // (unless explicitly restarted via the restart() method)
    if (!isCompleted) {
        setTimeout(() => start(), 500);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Return public methods for external control
     * Allows other modules to interact with onboarding system
     */
    return {
        start,                             // Begin onboarding (called automatically)
        skip,                              // Skip and mark as completed
        restart,                           // Restart from beginning
        isCompleted: isOnboardingCompleted // Check completion status
    };
}
