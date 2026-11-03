import { dismissToast, t, toasts } from '../state/store.ts';
import { Icon } from './common.tsx';

export function Toasts() {
  return (
    <div class="toasts" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.value.map((toast) => (
        <div key={toast.id} class={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          <span class="toast-text">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              class="btn btn-small btn-primary"
              onClick={() => {
                toast.action?.run();
                dismissToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" class="icon-btn icon-btn-small" aria-label={t.value('common.close')} onClick={() => dismissToast(toast.id)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
