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
  let selectedMethod = null;
  let currentView = 'packs'; // 'packs', 'methods', 'secure', or 'success'

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

  function renderSecurePayment() {
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

          <label class="secure-field-label" for="secureCardNumber">Card information</label>
          <div class="secure-card-row">
            <input id="secureCardNumber" class="secure-input" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" required />
            <div class="secure-expiry-wrap">
              <input id="secureCardExpiry" class="secure-input secure-input-small" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" minlength="5" pattern="^(0[1-9]|1[0-2])/[0-9]{2}$" required />
              <button type="button" class="secure-expiry-picker-btn" id="secureExpiryPickerBtn" aria-label="Pick expiry month">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2" />
                  <path d="M3 9h18" stroke="currentColor" stroke-width="2" />
                  <path d="M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
              <input type="month" id="secureExpiryPicker" class="secure-expiry-picker" tabindex="-1" aria-hidden="true" />
            </div>
            <input class="secure-input secure-input-small" type="text" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" required />
          </div>

          <label class="secure-field-label" for="secureCardHolder">Cardholder name</label>
          <input id="secureCardHolder" class="secure-input" type="text" autocomplete="cc-name" placeholder="Full name on card" required />

          <label class="secure-field-label" for="secureCountry">Billing information</label>
          <select id="secureCountry" class="secure-input" required>
            <option value="">Select country</option>
            <option value="AF">Afghanistan</option>
            <option value="AL">Albania</option>
            <option value="DZ">Algeria</option>
            <option value="AD">Andorra</option>
            <option value="AO">Angola</option>
            <option value="AG">Antigua and Barbuda</option>
            <option value="AR">Argentina</option>
            <option value="AM">Armenia</option>
            <option value="AU">Australia</option>
            <option value="AT">Austria</option>
            <option value="AZ">Azerbaijan</option>
            <option value="BS">Bahamas</option>
            <option value="BH">Bahrain</option>
            <option value="BD">Bangladesh</option>
            <option value="BB">Barbados</option>
            <option value="BY">Belarus</option>
            <option value="BE">Belgium</option>
            <option value="BZ">Belize</option>
            <option value="BJ">Benin</option>
            <option value="BT">Bhutan</option>
            <option value="BO">Bolivia</option>
            <option value="BA">Bosnia and Herzegovina</option>
            <option value="BW">Botswana</option>
            <option value="BR">Brazil</option>
            <option value="BN">Brunei</option>
            <option value="BG">Bulgaria</option>
            <option value="BF">Burkina Faso</option>
            <option value="BI">Burundi</option>
            <option value="CV">Cabo Verde</option>
            <option value="KH">Cambodia</option>
            <option value="CM">Cameroon</option>
            <option value="CA">Canada</option>
            <option value="CF">Central African Republic</option>
            <option value="TD">Chad</option>
            <option value="CL">Chile</option>
            <option value="CN">China</option>
            <option value="CO">Colombia</option>
            <option value="KM">Comoros</option>
            <option value="CG">Congo</option>
            <option value="CD">Congo, Democratic Republic of the</option>
            <option value="CR">Costa Rica</option>
            <option value="CI">Cote d'Ivoire</option>
            <option value="HR">Croatia</option>
            <option value="CU">Cuba</option>
            <option value="CY">Cyprus</option>
            <option value="CZ">Czechia</option>
            <option value="DK">Denmark</option>
            <option value="DJ">Djibouti</option>
            <option value="DM">Dominica</option>
            <option value="DO">Dominican Republic</option>
            <option value="EC">Ecuador</option>
            <option value="EG">Egypt</option>
            <option value="SV">El Salvador</option>
            <option value="GQ">Equatorial Guinea</option>
            <option value="ER">Eritrea</option>
            <option value="EE">Estonia</option>
            <option value="SZ">Eswatini</option>
            <option value="ET">Ethiopia</option>
            <option value="FJ">Fiji</option>
            <option value="FI">Finland</option>
            <option value="FR">France</option>
            <option value="GA">Gabon</option>
            <option value="GM">Gambia</option>
            <option value="GE">Georgia</option>
            <option value="DE">Germany</option>
            <option value="GH">Ghana</option>
            <option value="GR">Greece</option>
            <option value="GD">Grenada</option>
            <option value="GT">Guatemala</option>
            <option value="GN">Guinea</option>
            <option value="GW">Guinea-Bissau</option>
            <option value="GY">Guyana</option>
            <option value="HT">Haiti</option>
            <option value="HN">Honduras</option>
            <option value="HK">Hong Kong</option>
            <option value="HU">Hungary</option>
            <option value="IS">Iceland</option>
            <option value="IN">India</option>
            <option value="ID">Indonesia</option>
            <option value="IR">Iran</option>
            <option value="IQ">Iraq</option>
            <option value="IE">Ireland</option>
            <option value="IL">Israel</option>
            <option value="IT">Italy</option>
            <option value="JM">Jamaica</option>
            <option value="JP">Japan</option>
            <option value="JO">Jordan</option>
            <option value="KZ">Kazakhstan</option>
            <option value="KE">Kenya</option>
            <option value="KI">Kiribati</option>
            <option value="KP">Korea, North</option>
            <option value="KR">Korea, South</option>
            <option value="KW">Kuwait</option>
            <option value="KG">Kyrgyzstan</option>
            <option value="LA">Laos</option>
            <option value="LV">Latvia</option>
            <option value="LB">Lebanon</option>
            <option value="LS">Lesotho</option>
            <option value="LR">Liberia</option>
            <option value="LY">Libya</option>
            <option value="LI">Liechtenstein</option>
            <option value="LT">Lithuania</option>
            <option value="LU">Luxembourg</option>
            <option value="MO">Macao</option>
            <option value="MG">Madagascar</option>
            <option value="MW">Malawi</option>
            <option value="MY">Malaysia</option>
            <option value="MV">Maldives</option>
            <option value="ML">Mali</option>
            <option value="MT">Malta</option>
            <option value="MH">Marshall Islands</option>
            <option value="MR">Mauritania</option>
            <option value="MU">Mauritius</option>
            <option value="MX">Mexico</option>
            <option value="FM">Micronesia</option>
            <option value="MD">Moldova</option>
            <option value="MC">Monaco</option>
            <option value="MN">Mongolia</option>
            <option value="ME">Montenegro</option>
            <option value="MA">Morocco</option>
            <option value="MZ">Mozambique</option>
            <option value="MM">Myanmar</option>
            <option value="NA">Namibia</option>
            <option value="NR">Nauru</option>
            <option value="NP">Nepal</option>
            <option value="NL">Netherlands</option>
            <option value="NZ">New Zealand</option>
            <option value="NI">Nicaragua</option>
            <option value="NE">Niger</option>
            <option value="NG">Nigeria</option>
            <option value="MK">North Macedonia</option>
            <option value="NO">Norway</option>
            <option value="OM">Oman</option>
            <option value="PK">Pakistan</option>
            <option value="PW">Palau</option>
            <option value="PS">Palestine</option>
            <option value="PA">Panama</option>
            <option value="PG">Papua New Guinea</option>
            <option value="PY">Paraguay</option>
            <option value="PE">Peru</option>
            <option value="PH">Philippines</option>
            <option value="PL">Poland</option>
            <option value="PT">Portugal</option>
            <option value="QA">Qatar</option>
            <option value="RO">Romania</option>
            <option value="RU">Russia</option>
            <option value="RW">Rwanda</option>
            <option value="KN">Saint Kitts and Nevis</option>
            <option value="LC">Saint Lucia</option>
            <option value="VC">Saint Vincent and the Grenadines</option>
            <option value="WS">Samoa</option>
            <option value="SM">San Marino</option>
            <option value="ST">Sao Tome and Principe</option>
            <option value="SA">Saudi Arabia</option>
            <option value="SN">Senegal</option>
            <option value="RS">Serbia</option>
            <option value="SC">Seychelles</option>
            <option value="SL">Sierra Leone</option>
            <option value="SG">Singapore</option>
            <option value="SK">Slovakia</option>
            <option value="SI">Slovenia</option>
            <option value="SB">Solomon Islands</option>
            <option value="SO">Somalia</option>
            <option value="ZA">South Africa</option>
            <option value="ES">Spain</option>
            <option value="LK">Sri Lanka</option>
            <option value="SD">Sudan</option>
            <option value="SR">Suriname</option>
            <option value="SE">Sweden</option>
            <option value="CH">Switzerland</option>
            <option value="SY">Syria</option>
            <option value="TW">Taiwan</option>
            <option value="TJ">Tajikistan</option>
            <option value="TZ">Tanzania</option>
            <option value="TH">Thailand</option>
            <option value="TL">Timor-Leste</option>
            <option value="TG">Togo</option>
            <option value="TO">Tonga</option>
            <option value="TT">Trinidad and Tobago</option>
            <option value="TN">Tunisia</option>
            <option value="TR">Turkey</option>
            <option value="TM">Turkmenistan</option>
            <option value="TV">Tuvalu</option>
            <option value="UG">Uganda</option>
            <option value="UA">Ukraine</option>
            <option value="AE">United Arab Emirates</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="UY">Uruguay</option>
            <option value="UZ">Uzbekistan</option>
            <option value="VU">Vanuatu</option>
            <option value="VA">Vatican City</option>
            <option value="VE">Venezuela</option>
            <option value="VN">Vietnam</option>
            <option value="YE">Yemen</option>
            <option value="ZM">Zambia</option>
            <option value="ZW">Zimbabwe</option>
            <option value="other">Other</option>
          </select>

          <input class="secure-input" type="text" autocomplete="address-line1" placeholder="Address" required />

          <div class="secure-address-row">
            <input class="secure-input" type="text" autocomplete="address-level2" placeholder="City" required />
            <input class="secure-input" type="text" autocomplete="postal-code" placeholder="ZIP Code" required />
          </div>

          <label class="secure-terms">
            <input type="checkbox" id="secureTerms" required />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>

          <button type="submit" class="secure-pay-btn">Pay</button>
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
        const expiryInput = list.querySelector('#secureCardExpiry');
        const expiryPickerBtn = list.querySelector('#secureExpiryPickerBtn');
        const expiryPicker = list.querySelector('#secureExpiryPicker');

        const formatExpiry = (value) => {
          const digits = value.replace(/\D/g, '').slice(0, 4);
          if (digits.length <= 2) return digits;
          return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        };

        if (expiryInput) {
          expiryInput.addEventListener('input', () => {
            expiryInput.value = formatExpiry(expiryInput.value);
            expiryInput.setCustomValidity('');
          });

          expiryInput.addEventListener('blur', () => {
            const [mm] = expiryInput.value.split('/');
            const month = Number(mm);

            if (!expiryInput.value) {
              expiryInput.setCustomValidity('');
              return;
            }

            if (expiryInput.value.length !== 5) {
              expiryInput.setCustomValidity('Use MM/YY format.');
              return;
            }

            if (!month || month < 1 || month > 12) {
              expiryInput.setCustomValidity('Enter a valid month (01-12).');
              return;
            }

            expiryInput.setCustomValidity('');
          });
        }

        if (expiryPickerBtn && expiryPicker && expiryInput) {
          expiryPickerBtn.onclick = () => {
            if (typeof expiryPicker.showPicker === 'function') {
              expiryPicker.showPicker();
            } else {
              expiryPicker.click();
            }
          };

          expiryPicker.addEventListener('change', () => {
            if (!expiryPicker.value) return;
            const [year, month] = expiryPicker.value.split('-');
            if (!year || !month) return;
            expiryInput.value = `${month}/${year.slice(-2)}`;
            expiryInput.setCustomValidity('');
          });
        }

        secureForm.onsubmit = (e) => {
          e.preventDefault();
          if (!secureForm.checkValidity()) {
            secureForm.reportValidity();
            return;
          }
          processPayment(selectedMethod);
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
