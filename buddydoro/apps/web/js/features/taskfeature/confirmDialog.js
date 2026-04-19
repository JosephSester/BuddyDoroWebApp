// Reusable confirmation dialog matching the dark navy glassmorphism theme.
const STYLE_ID = 'confirm-dialog-styles';

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(26, 54, 110, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cdlg-fade 0.15s ease;
}
.confirm-dialog {
  background: rgba(26, 54, 110, 0.94);
  border: 1.5px solid rgba(167, 143, 224, 0.28);
  border-radius: 20px;
  padding: 28px 28px 22px;
  width: 340px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 12px 40px rgba(26, 54, 110, 0.55), 0 2px 10px rgba(124, 92, 191, 0.18);
  backdrop-filter: blur(24px) saturate(160%);
  animation: cdlg-up 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.confirm-dialog-title {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}
.confirm-dialog-message {
  font-size: 0.875rem;
  color: #9db0cc;
  margin: 0 0 22px;
  line-height: 1.55;
}
.confirm-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.confirm-dialog-cancel {
  padding: 9px 20px;
  border-radius: 999px;
  border: 1.5px solid rgba(167, 143, 224, 0.35);
  background: transparent;
  color: #9db0cc;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
}
.confirm-dialog-cancel:hover { background: rgba(167, 143, 224, 0.12); color: #ffffff; }
.confirm-dialog-del {
  padding: 9px 20px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(to bottom right, #e05a5a, #b83030);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.14s, transform 0.12s;
  box-shadow: 0 3px 10px rgba(176, 48, 48, 0.35);
}
.confirm-dialog-del:hover { filter: brightness(1.1); transform: translateY(-1px); }
.confirm-dialog-del:active { transform: translateY(0); filter: brightness(0.95); }
@keyframes cdlg-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdlg-up {
  from { transform: translateY(10px) scale(0.96); opacity: 0; }
  to   { transform: translateY(0)    scale(1);    opacity: 1; }
}`;
    document.head.appendChild(s);
}

export function showConfirmDialog({ title, message, confirmText = 'Delete' }) {
    injectStyles();
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <p class="confirm-dialog-title">${title}</p>
            <p class="confirm-dialog-message">${message}</p>
            <div class="confirm-dialog-actions">
                <button class="confirm-dialog-cancel">Cancel</button>
                <button class="confirm-dialog-del">${confirmText}</button>
            </div>`;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const cleanup = (result) => { overlay.remove(); resolve(result); };

        dialog.querySelector('.confirm-dialog-cancel').addEventListener('click', () => cleanup(false));
        dialog.querySelector('.confirm-dialog-del').addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', esc); }
        });
    });
}
