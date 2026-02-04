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

  // No quantity controls: each pack is bought as a single unit

  function render() {
    list.innerHTML = "";

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
        const totalDiamonds = pack.amount * qty;
        const currentBalance = Number(balance.textContent || "0");
        balance.textContent = currentBalance + totalDiamonds;
        render();
      };

      list.appendChild(row);
    });
  }

  function open() {
    backdrop.hidden = false;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    render();
    updatePreview();
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
