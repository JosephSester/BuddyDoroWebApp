// Diamonds Store modal (Buy Diamonds)
const STRIPE_CONFIG_PATH = '/api/stripe/config';
const STRIPE_CREATE_INTENT_PATH = '/api/stripe/create-payment-intent';
const STRIPE_JS_URL = 'https://js.stripe.com/v3/';

let stripeJsLoadPromise = null;

function getApiBaseCandidates() {
  const candidates = [];
  if (typeof window !== 'undefined' && window.location?.origin) {
    candidates.push(window.location.origin);
  }
  candidates.push('http://localhost:3000', 'http://127.0.0.1:3000');
  return [...new Set(candidates)];
}

async function fetchFromApiWithFallback(path, options = {}) {
  let lastError = null;

  for (const base of getApiBaseCandidates()) {
    const url = `${base}${path}`;

    try {
      const response = await fetch(url, options);

      // If frontend static server is on current origin, /api may return 404/405 there. Try next base.
      if ((response.status === 404 || response.status === 405) && typeof window !== 'undefined' && base === window.location.origin) {
        continue;
      }

      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      return { response, data, url };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to fetch API endpoint.');
}

function ensureStripeJsLoaded() {
  if (typeof window.Stripe === 'function') return Promise.resolve();
  if (stripeJsLoadPromise) return stripeJsLoadPromise;

  stripeJsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${STRIPE_JS_URL}"]`) ||
      document.querySelector('script[src="https://js.stripe.com/v3"]');

    if (existing) {
      existing.addEventListener('load', () => {
        if (typeof window.Stripe === 'function') resolve();
        else reject(new Error('Stripe.js loaded but Stripe is unavailable.'));
      }, { once: true });
      existing.addEventListener('error', () => {
        reject(new Error('Stripe.js failed to load.'));
      }, { once: true });

      // If already loaded before listeners were attached, resolve immediately.
      if (typeof window.Stripe === 'function') resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => {
      if (typeof window.Stripe === 'function') resolve();
      else reject(new Error('Stripe.js loaded but Stripe is unavailable.'));
    };
    script.onerror = () => reject(new Error('Stripe.js failed to load.'));
    document.head.appendChild(script);
  });

  return stripeJsLoadPromise;
}

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
  let selectedMethod = null;
  let currentView = 'packs'; // 'packs', 'methods', 'secure', or 'success'
  let stripePublishableKey = null;

  function mountManualCardFallback(message) {
    const errorEl = list.querySelector('#stripe-card-errors');
    if (errorEl) {
      errorEl.textContent = message || 'Could not reach Stripe. Card fields are in manual mode.';
    }

    const hosts = [
      { id: '#stripe-card-number', inputId: 'stripe-card-number-input', placeholder: '1234 1234 1234 1234', inputMode: 'numeric', maxLength: 19 },
      { id: '#stripe-card-expiry', inputId: 'stripe-card-expiry-input', placeholder: 'MM / YY', inputMode: 'numeric', maxLength: 7 },
      { id: '#stripe-card-cvc', inputId: 'stripe-card-cvc-input', placeholder: 'CVC', inputMode: 'numeric', maxLength: 4 },
    ];

    hosts.forEach(({ id, inputId, placeholder, inputMode, maxLength }) => {
      const host = list.querySelector(id);
      if (!host) return;
      host.innerHTML = `
        <input
          id="${inputId}"
          class="stripe-fallback-input"
          type="text"
          inputmode="${inputMode}"
          placeholder="${placeholder}"
          maxlength="${maxLength}"
          autocomplete="off"
        />
      `;
    });

    const expiryInput = list.querySelector('#stripe-card-expiry .stripe-fallback-input');
    if (expiryInput) {
      expiryInput.addEventListener('input', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;

        const digits = input.value.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) {
          input.value = digits;
          return;
        }

        input.value = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
      });
    }
  }

  async function getStripePublishableKey() {
    if (stripePublishableKey) return stripePublishableKey;

    const { response, data } = await fetchFromApiWithFallback(STRIPE_CONFIG_PATH);
    if (!response.ok || !data?.publishableKey) {
      throw new Error(data?.error || data?.message || 'Stripe config missing.');
    }

    stripePublishableKey = data.publishableKey;
    return stripePublishableKey;
  }

  // No quantity controls: each pack is bought as a single unit

  function renderPacks() {
    list.innerHTML = "";

    // Remove payment view class if present
    dialog.classList.remove('payment-view');
    dialog.classList.remove('secure-payment-view');
    dialog.classList.remove('success-view');

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
        selectedMethod = null;
        currentView = 'methods';
        renderPaymentMethods();
      };

      list.appendChild(row);
    });
  }

  function renderPaymentMethods() {
    if (!selectedPack) return;

    const diamondLabel = selectedPack.amount === 1 ? 'Diamond' : 'Diamonds';

    const header = dialog.querySelector('.diamond-store-header');
    const headerTitle = header?.querySelector('#diamondStoreTitle');
    const headerBackBtn = header?.querySelector('.payment-back-btn');

    if (headerBackBtn) headerBackBtn.remove();
    if (headerTitle) headerTitle.textContent = '';

    dialog.classList.add('payment-view');
    dialog.classList.remove('secure-payment-view');
    dialog.classList.remove('success-view');

    list.innerHTML = `
      <div class="payment-header">
        <h3 class="payment-title">Choose Payment Method</h3>
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
        selectedMethod = btn.dataset.method || 'card';
        currentView = 'secure';
        renderSecurePayment();
      };
    });

    const cancelBtn = list.querySelector('.payment-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        currentView = 'packs';
        selectedPack = null;
        selectedMethod = null;
        renderPacks();
      };
    }
  }

  function getMethodLabel(method) {
    const labels = {
      card: 'Credit / Debit Card',
      paypal: 'PayPal',
      venmo: 'Venmo',
      other: 'Other'
    };
    return labels[method] || 'Credit / Debit Card';
  }

  async function renderSecurePayment() {
    if (!selectedPack || !selectedMethod) return;

    const header = dialog.querySelector('.diamond-store-header');
    const headerLeft = header?.querySelector('.diamond-store-left');
    const headerTitle = header?.querySelector('#diamondStoreTitle');
    let headerBackBtn = header?.querySelector('.payment-back-btn');

    if (headerTitle) headerTitle.textContent = '';

    if (!headerBackBtn && headerLeft) {
      headerBackBtn = document.createElement('button');
      headerBackBtn.className = 'payment-back-btn';
      headerBackBtn.setAttribute('aria-label', 'Back to payment methods');
      headerBackBtn.innerHTML = '&#8592;';
      headerLeft.prepend(headerBackBtn);
    }

    if (headerBackBtn) {
      headerBackBtn.onclick = () => {
        currentView = 'methods';
        renderPaymentMethods();
      };
    }

    dialog.classList.add('payment-view');
    dialog.classList.add('secure-payment-view');
    dialog.classList.remove('success-view');

    const isWalletMethod = selectedMethod === 'paypal' || selectedMethod === 'venmo';
    const walletLogo = selectedMethod === 'paypal'
      ? 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg'
      : './assets/artwork/Venmo_logo.png';
    const walletLabel = selectedMethod === 'paypal' ? 'Linked PayPal account' : 'Linked Venmo account';
    const walletIdentity = selectedMethod === 'paypal' ? 'buddydoro.user@email.com' : '@buddydoro_user';

    const rightPanel = isWalletMethod
      ? `
        <section class="secure-wallet-panel" aria-label="Wallet payment summary">
          <h4>Payment Method</h4>

          <div class="secure-wallet-account">
            <img src="${walletLogo}" alt="${getMethodLabel(selectedMethod)}" class="secure-wallet-logo" />
            <div class="secure-wallet-account-text">
              <strong>${walletLabel}</strong>
              <span>${walletIdentity}</span>
            </div>
            <button type="button" class="secure-wallet-unlink">Unlink</button>
          </div>

          <div class="secure-wallet-lines">
            <div class="secure-wallet-line"><span>Price</span><strong>$${selectedPack.totalPrice}</strong></div>
            <div class="secure-wallet-line"><span>Tax (0%)</span><strong>$0.00</strong></div>
            <div class="secure-wallet-line secure-wallet-total"><span>Total</span><strong>$${selectedPack.totalPrice}</strong></div>
          </div>

          <button type="button" class="secure-wallet-pay-btn" id="secureWalletPayBtn">Pay now</button>
        </section>
      `
      : `
        <form class="secure-payment-form" id="securePaymentForm" novalidate>
          <h4>Payment Method</h4>

          <label class="secure-field-label" for="secureCardHolder">Cardholder name</label>
          <input id="secureCardHolder" class="secure-input" type="text" autocomplete="cc-name" placeholder="Full name on card" required />

          <label class="secure-field-label">Card number</label>
          <div id="stripe-card-number" class="stripe-card-element-wrap"></div>

          <div class="stripe-expiry-cvc-row">
            <div>
              <label class="secure-field-label">Expiry date</label>
              <div id="stripe-card-expiry" class="stripe-card-element-wrap"></div>
            </div>
            <div>
              <label class="secure-field-label">CVC</label>
              <div id="stripe-card-cvc" class="stripe-card-element-wrap"></div>
            </div>
          </div>

          <div id="stripe-card-errors" class="stripe-card-errors" role="alert"></div>

            <div class="secure-address-row stripe-billing-row">
              <div>
                <label class="secure-field-label" for="secureBillingCountry">Country</label>
                <select id="secureBillingCountry" class="secure-input" autocomplete="country" required>
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="MX">Mexico</option>
                </select>
              </div>
              <div>
                <label class="secure-field-label" for="secureBillingPostalCode">ZIP code</label>
                <input id="secureBillingPostalCode" class="secure-input" type="text" inputmode="text" autocomplete="postal-code" placeholder="10001" required />
              </div>
            </div>

          <label class="secure-terms">
            <input type="checkbox" id="secureTerms" required />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>

          <button type="submit" class="secure-pay-btn" id="securePayBtn">Pay $${selectedPack.totalPrice}</button>
        </form>
      `;

    list.innerHTML = `
      <div class="secure-payment-header">
        <h3 class="secure-payment-title">Secure Payment</h3>
      </div>

      <div class="secure-payment-shell">
        <section class="secure-order-summary" aria-label="Order summary">
          <h4>Order Summary</h4>
          <div class="secure-summary-row"><span>Pay Diamonds</span><strong>${selectedPack.amount}</strong></div>
          <div class="secure-summary-row"><span>Diamonds</span><strong>${selectedPack.amount}</strong></div>
          <div class="secure-summary-row"><span>Subtotal</span><strong>$${selectedPack.totalPrice}</strong></div>
          <div class="secure-summary-row secure-summary-tax"><span>Tax</span><small>Enter address to calculate</small></div>
          <div class="secure-summary-total"><span>Total</span><strong>$${selectedPack.totalPrice}</strong></div>
        </section>
        ${rightPanel}
      </div>
    `;

    if (isWalletMethod) {
      const walletPayBtn = list.querySelector('#secureWalletPayBtn');
      if (walletPayBtn) {
        walletPayBtn.onclick = () => processPayment(selectedMethod);
      }

      const unlinkBtn = list.querySelector('.secure-wallet-unlink');
      if (unlinkBtn) {
        unlinkBtn.onclick = () => {
          alert('Account unlink is not available in this demo yet.');
        };
      }
    } else {
      const secureForm = list.querySelector('#securePaymentForm');
      if (secureForm) {
        let publishableKey;
        try {
          publishableKey = await getStripePublishableKey();
        } catch (err) {
          mountManualCardFallback(err.message || 'Stripe config is unavailable.');
          secureForm.onsubmit = (e) => {
            e.preventDefault();
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = 'Cannot process payment while API is offline. Start backend server on port 3000.';
          };
          return;
        }

        try {
          await ensureStripeJsLoaded();
        } catch (err) {
          mountManualCardFallback(err.message || 'Stripe failed to load.');
          secureForm.onsubmit = (e) => {
            e.preventDefault();
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = 'Cannot process payment while Stripe.js is unavailable.';
          };
          return;
        }

        if (typeof window.Stripe !== 'function') {
          mountManualCardFallback('Stripe is unavailable. Please refresh and try again.');
          secureForm.onsubmit = (e) => {
            e.preventDefault();
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = 'Cannot process payment while Stripe.js is unavailable.';
          };
          return;
        }

        // Mount Stripe split elements
        const stripeInstance = window.Stripe(publishableKey);
        const elements = stripeInstance.elements();
        const cardNumberHost = list.querySelector('#stripe-card-number');
        const cardExpiryHost = list.querySelector('#stripe-card-expiry');
        const cardCvcHost = list.querySelector('#stripe-card-cvc');

        if (!cardNumberHost || !cardExpiryHost || !cardCvcHost) {
          mountManualCardFallback('Secure card field containers were not found.');
          secureForm.onsubmit = (e) => {
            e.preventDefault();
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = 'Secure card fields are unavailable. Please refresh and try again.';
          };
          return;
        }

        const stripeStyle = {
          base: {
            fontSize: '16px',
            color: '#2b2213',
            fontFamily: 'inherit',
            '::placeholder': { color: '#aaa' },
          },
          invalid: { color: '#e53e3e' },
        };
        let cardNumber;
        let cardExpiry;
        let cardCvc;
        try {
          cardNumber = elements.create('cardNumber', { style: stripeStyle, placeholder: '1234 1234 1234 1234' });
          cardExpiry = elements.create('cardExpiry', { style: stripeStyle });
          cardCvc = elements.create('cardCvc', { style: stripeStyle });
          cardNumber.mount(cardNumberHost);
          cardExpiry.mount(cardExpiryHost);
          cardCvc.mount(cardCvcHost);
        } catch (err) {
          mountManualCardFallback(err.message || 'Unable to initialize secure card fields.');
          secureForm.onsubmit = (e) => {
            e.preventDefault();
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = 'Secure card fields are unavailable. Please refresh and try again.';
          };
          return;
        }

        [cardNumber, cardExpiry, cardCvc].forEach((el) => {
          el.on('change', (event) => {
            const errorEl = list.querySelector('#stripe-card-errors');
            if (errorEl) errorEl.textContent = event.error ? event.error.message : '';
          });
        });

        secureForm.onsubmit = async (e) => {
          e.preventDefault();
          const cardHolder = list.querySelector('#secureCardHolder');
          const billingCountry = list.querySelector('#secureBillingCountry');
          const billingPostalCode = list.querySelector('#secureBillingPostalCode');
          const termsCheck = list.querySelector('#secureTerms');
          const payBtn = list.querySelector('#securePayBtn');
          const errorEl = list.querySelector('#stripe-card-errors');

          if (!cardHolder?.value.trim()) {
            cardHolder?.setCustomValidity('Please enter cardholder name.');
            secureForm.reportValidity();
            return;
          }
          cardHolder.setCustomValidity('');

          if (!billingCountry?.value) {
            billingCountry?.setCustomValidity('Please select a billing country.');
            secureForm.reportValidity();
            return;
          }
          billingCountry.setCustomValidity('');

          if (!billingPostalCode?.value.trim()) {
            billingPostalCode?.setCustomValidity('Please enter a ZIP or postal code.');
            secureForm.reportValidity();
            return;
          }
          billingPostalCode.setCustomValidity('');

          if (!termsCheck?.checked) {
            termsCheck?.setCustomValidity('You must agree to the terms.');
            secureForm.reportValidity();
            return;
          }
          termsCheck.setCustomValidity('');

          if (payBtn) payBtn.disabled = true;
          if (errorEl) errorEl.textContent = '';

          try {
            const token = localStorage.getItem('authToken');
            if (!token) {
              throw new Error('Your session expired. Please log in again, then retry payment.');
            }
            const amountCents = Math.round(parseFloat(selectedPack.totalPrice) * 100);
            const { response: res, data } = await fetchFromApiWithFallback(STRIPE_CREATE_INTENT_PATH, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ amount: amountCents }),
            });
            if (res.status === 401 || res.status === 403) {
              throw new Error('Your session expired. Please log in again, then retry payment.');
            }
            if (!res.ok || data?.error) throw new Error(data?.error || data?.message || `Server error (${res.status})`);

            const { paymentIntent, error } = await stripeInstance.confirmCardPayment(data.clientSecret, {
              payment_method: {
                card: cardNumber,
                billing_details: {
                  name: cardHolder.value.trim(),
                  address: {
                    country: billingCountry.value,
                    postal_code: billingPostalCode.value.trim(),
                  },
                },
              },
            });

            if (error) {
              if (errorEl) errorEl.textContent = error.message;
              if (payBtn) payBtn.disabled = false;
              return;
            }

            if (paymentIntent.status === 'succeeded') {
              await processPayment(selectedMethod);
            }
          } catch (err) {
            console.error('Payment error:', err);
            if (errorEl) errorEl.textContent = err.message || 'Payment failed. Please try again.';
            if (payBtn) payBtn.disabled = false;
          }
        };
      }
    }
  }

  function renderSuccess(method) {
    if (!selectedPack) return;

    const header = dialog.querySelector('.diamond-store-header');
    const headerTitle = header?.querySelector('#diamondStoreTitle');
    const headerBackBtn = header?.querySelector('.payment-back-btn');

    if (headerBackBtn) headerBackBtn.remove();
    if (headerTitle) headerTitle.textContent = '';

    dialog.classList.add('payment-view');
    dialog.classList.add('secure-payment-view');
    dialog.classList.add('success-view');

    const diamondLabel = selectedPack.amount === 1 ? 'Diamond' : 'Diamonds';
    const methodLabel = getMethodLabel(method);

    list.innerHTML = `
      <div class="payment-success-wrap" aria-live="polite">
        <h3 class="payment-success-title"><span class="payment-success-check" aria-hidden="true">✔</span> Success</h3>
        <p class="payment-success-heading">Thank you for your purchase!</p>
        <img src="${selectedPack.image}" class="payment-success-icon" alt="Diamonds purchased" />
        <p class="payment-success-amount">+${selectedPack.amount} ${diamondLabel}</p>
        <p class="payment-success-copy">
          Thank you for your purchase! Your account will be updated shortly. Check out the top recommended BuddyDoro upgrades for you!<br />
          Please visit our support page if you are experiencing any issues or have any questions.
        </p>
        <p class="payment-success-signoff">Thanks again,<br />The BuddyDoro Team</p>
        <button type="button" class="payment-success-done-btn" id="paymentSuccessDoneBtn">Done</button>
      </div>
    `;

    const doneBtn = list.querySelector('#paymentSuccessDoneBtn');
    if (doneBtn) {
      doneBtn.onclick = () => {
        currentView = 'packs';
        selectedPack = null;
        selectedMethod = null;
        close();
      };
    }
  }

  async function processPayment(method) {
    try {
      await Diamonds.addDiamond(selectedPack.amount);

      currentView = 'success';
      renderSuccess(method);

    } catch (err) {
      console.error(err);
      alert('Payment failed.');
    }
  }


  function open() {
    currentView = 'packs';
    selectedPack = null;
    selectedMethod = null;
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
    selectedMethod = null;
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
