// Diamonds Store modal (Buy Diamonds)

const DIAMOND_PACKS = [
  { amount: 1, price: 1.99, image: './assets/artwork/diamond-pack-1.png' },
  { amount: 5, price: 5.99, image: './assets/artwork/diamond-pack-5.png' },
  { amount: 10, price: 9.99, image: './assets/artwork/diamond-pack-10.png' },
  { amount: 20, price: 19.99, image: './assets/artwork/diamond-pack-20.png' }
];

export function initDiamondStore() {
  const backdrop = document.getElementById("diamondStoreBackdrop");
  const dialog = document.getElementById("diamondStoreDialog");
  const closeBtn = document.getElementById("diamondStoreClose");
  const list = document.getElementById("diamondStoreList");
  const balance = document.getElementById("diamondStoreBalance");
  const diamondChip = document.getElementById('diamondChip');
  const diamondMenu = document.getElementById('diamondMenu');

  if (!backdrop || !dialog || !closeBtn || !list || !balance) return;

  // Hide the top balance indicator in the diamond store header
  balance.parentElement?.setAttribute('hidden', '');

  let selectedPack = null;
  let currentView = 'packs'; // 'packs' or 'payment'

  // No quantity controls: each pack is bought as a single unit

  function renderPacks() {
    list.innerHTML = "";

    // Remove payment view class if present
    dialog.classList.remove('payment-view');

    const header = dialog.querySelector('.diamond-store-header');
    const headerLeft = header?.querySelector('.diamond-store-left');
    const headerTitle = header?.querySelector('#diamondStoreTitle');
    const headerBackBtn = header?.querySelector('.payment-back-btn');

    if (headerBackBtn) headerBackBtn.remove();
    if (headerTitle) headerTitle.textContent = 'Buy Diamonds';

    DIAMOND_PACKS.forEach((pack, idx) => {
      const row = document.createElement("div");
      row.className = "diamond-row";

      const qty = 1;
      const totalPrice = (pack.price * qty).toFixed(2);

      const packImage = pack.image || './assets/artwork/DiamondIcon.png';

      row.innerHTML = `
        <div class="diamond-row-left">
          <img src="${packImage}" class="diamond-pack-img" />
          <div class="diamond-amount-badge">${pack.amount}</div>
        </div>
        
        <div class="diamond-row-right">
          <div class="diamond-price">$${totalPrice}</div>
          <button class="diamond-buy-btn" data-idx="${idx}">Buy</button>
        </div>
      `;

      const buyBtn = row.querySelector(".diamond-buy-btn");

      buyBtn.onclick = () => {
        selectedPack = { ...pack, totalPrice };
        currentView = 'payment';
        renderPayment();
      };

      list.appendChild(row);
    });
  }

  function renderPayment() {
    if (!selectedPack) return;

    const diamondLabel = selectedPack.amount === 1 ? 'Diamond' : 'Diamonds';

    dialog.classList.add('payment-view');

    list.innerHTML = `
      <div class="payment-header">
        <h3 class="payment-title">Secure Payment for BuddyDoro</h3>
      </div>

      <div class="payment-container">
        <div class="payment-summary">
          <img src="${selectedPack.image}" class="payment-diamond-icon" />
          <h3>+${selectedPack.amount} ${diamondLabel}</h3>
          <p class="payment-balance">Balance Due: $${selectedPack.totalPrice}</p>
        </div>

        <div class="payment-methods-label">Select payment method:</div>
        <div class="payment-methods">
          <button class="payment-method-btn" data-method="card">
            <div class="payment-method-content">
              <div class="payment-logos">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" class="payment-logo" alt="Visa" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" class="payment-logo" alt="Mastercard" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" class="payment-logo" alt="Amex" />
              </div>
              <div class="payment-method-name">Credit / Debit Card</div>
            </div>
          </button>

          <button class="payment-method-btn" data-method="paypal">
            <div class="payment-method-content">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" class="payment-logo-single" alt="PayPal" />
              <div class="payment-method-name">PayPal</div>
            </div>
          </button>

          <button class="payment-method-btn" data-method="venmo">
            <div class="payment-method-content">
              <img src="./assets/artwork/Venmo_logo.png" class="payment-logo-single" alt="Venmo" />
              <div class="payment-method-name">Venmo</div>
            </div>
          </button>

          <button class="payment-method-btn" data-method="other">
            <div class="payment-method-content">
              <span class="payment-method-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2" />
                  <path d="M3 10h18" stroke="currentColor" stroke-width="2" />
                  <path d="M7 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </span>
              <div class="payment-method-name">Other</div>
            </div>
          </button>
        </div>

        <button class="payment-cancel-btn btn-secondary">Cancel</button>
      </div>
    `;

    const paymentBtns = list.querySelectorAll('.payment-method-btn');
    paymentBtns.forEach(btn => {
      btn.onclick = () => {
        const method = btn.dataset.method;
        processPayment(method);
      };
    });

    const cancelBtn = list.querySelector('.payment-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        currentView = 'packs';
        selectedPack = null;
        renderPacks();
      };
    }
  }

  async function processPayment(method) {
    try {
      await Diamonds.addDiamond(selectedPack.amount);

      alert(`Payment successful! You received ${selectedPack.amount} diamonds via ${method}.`);

      currentView = 'packs';
      selectedPack = null;
      renderPacks();

    } catch (err) {
      console.error(err);
      alert('Payment failed.');
    }
  }


  function open() {
    currentView = 'packs';
    selectedPack = null;
    backdrop.hidden = false;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    renderPacks();
    // Mirror Store UX: mark chip expanded and close dropdown menu
    if (diamondChip) diamondChip.setAttribute('aria-expanded', 'true');
    if (diamondMenu) diamondMenu.hidden = true;
    // focus close button for accessibility
    (closeBtn || dialog).focus();
  }

  function close() {
    backdrop.hidden = true;
    dialog.hidden = true;
    document.body.style.overflow = "";
    currentView = 'packs';
    selectedPack = null;
    if (diamondChip) diamondChip.setAttribute('aria-expanded', 'false');
    if (diamondChip) diamondChip.focus();
  }

  backdrop.onclick = close;
  closeBtn.onclick = close;

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !dialog.hidden) close();
  });

  document.addEventListener("click", e => {
    const trigger = e.target.closest('[data-menu-action="buy-diamonds"]');
    if (trigger) open();
  });

  // Also attach directly to the menu button in case propagation is stopped
  const directBtn = document.querySelector('[data-menu-action="buy-diamonds"]');
  if (directBtn) {
    directBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open();
    });
  }

  // Capture-phase listener to catch clicks before other handlers stop propagation
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-menu-action="buy-diamonds"]');
    if (trigger) {
      open();
    }
  }, { capture: true });
}
