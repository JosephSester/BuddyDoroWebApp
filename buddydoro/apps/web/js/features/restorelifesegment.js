// restorelifesegment.js
// Whenever a FOOD or WATER item is used in the store, restore one life segment.

(function(){
  function onItemUsed(event){
    const detail = event.detail || {};
    const sku = detail.sku || '';
    const category = detail.category || '';

    // Decide if this is a food or water item.
    const kind =
      (category === 'food'  || sku.startsWith('food-'))  ? 'food'  :
      (category === 'water' || sku.startsWith('water-')) ? 'water' :
      null;

    // Ignore play / medicine / other
    if (!kind) return;

    const lc = window.LifeCircle;
    if (!lc || typeof lc.markCare !== 'function') {
      console.warn('[restorelifesegment] LifeCircle.markCare is not available.');
      return;
    }

    // markCare(kind, heal = true) -> +1 life (up to max) and reset decay timer
    lc.markCare(kind, true);
  }

  // Listen globally for "store:itemUsed" events from store.js
  window.addEventListener('store:itemUsed', onItemUsed);
})();
