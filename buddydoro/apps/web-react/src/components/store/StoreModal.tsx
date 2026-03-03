import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useCompanionStore } from '../../stores/companionStore';
import { notify } from '../../hooks/useNotification';
import styles from './Store.module.css';

const CATEGORIES = ['all', 'food', 'water', 'medicine', 'play', 'accessory', 'special'];

export function StoreModal() {
  const { isOpen, closeStore, catalog, inventory, currentCategory, setCategory, isLoading, purchaseItem, useItem } = useInventoryStore();
  const { doros, setDoros } = useCurrencyStore();
  const { addLife, markCare } = useCompanionStore();

  if (!isOpen) return null;

  const filtered = currentCategory === 'all'
    ? catalog
    : catalog.filter(item => item.category === currentCategory);

  async function handleBuy(sku: string, price: number) {
    if (doros < price) { notify('Not enough Doros!', 'error'); return; }
    try {
      const newDoros = await purchaseItem(sku);
      setDoros(newDoros);
      notify('Purchased! 🛍️', 'success');
    } catch {
      notify('Purchase failed', 'error');
    }
  }

  async function handleUse(sku: string, category: string) {
    const count = inventory[sku] ?? 0;
    if (count <= 0) { notify('None in inventory!', 'error'); return; }
    try {
      const life = await useItem(sku);
      markCare();
      if (['food', 'medicine', 'water'].includes(category)) {
        addLife(1);
        notify(`Used! Life restored ❤️`, 'success');
      } else {
        notify(`Your buddy loved that! 🎉`, 'success');
      }
      // Update companion life from server response
      useCompanionStore.getState().setLife(life.current);
    } catch {
      notify('Failed to use item', 'error');
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={closeStore}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>🛖 Cozy Shop</span>
          <button className={styles.closeBtn} onClick={closeStore} aria-label="Close store">
            <X size={16} />
          </button>
        </div>

        <div className={styles.tabs}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`${styles.tab} ${currentCategory === cat ? styles.active : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading items…</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(item => {
              const owned = inventory[item.sku] ?? 0;
              return (
                <button
                  key={item.sku}
                  className={styles.itemCard}
                  onClick={() => owned > 0 ? handleUse(item.sku, item.category) : handleBuy(item.sku, item.price)}
                  title={owned > 0 ? `Use (${owned} owned)` : `Buy for ${item.price} doros`}
                >
                  <div className={styles.itemEmoji}>{item.emoji}</div>
                  <div className={styles.itemName}>{item.name}</div>
                  {owned > 0
                    ? <div className={styles.itemPrice}>Use ({owned})</div>
                    : <div className={styles.itemPrice}>🌰 {item.price}</div>
                  }
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
