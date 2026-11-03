import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { addPin, deletePin, pinsDoc, selectedPinId, t, updatePin } from '../state/store.ts';

/** Coordinates of a pin being created (set by a long-press / right-click on the map). */
export const pinDraft = signal<{ lat: number; lng: number } | null>(null);
/** Id of a pin being edited. */
export const pinEditing = signal<string | null>(null);

const COLORS = ['#c8a24a', '#c0392b', '#5d9bd6', '#7fae5b', '#a55fd1', '#e98f5a', '#f4e4c1'];

export function PinEditor() {
  const draft = pinDraft.value;
  const editing = pinEditing.value ? pinsDoc.value.pins.find((p) => p.id === pinEditing.value) : null;
  const open = draft !== null || !!editing;
  const tr = t.value;
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(COLORS[0]!);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setNote(editing?.note ?? '');
    setColor(editing?.color ?? COLORS[0]!);
    setTimeout(() => titleRef.current?.focus(), 30);
  }, [open, editing?.id]);

  if (!open) return null;
  const close = () => {
    pinDraft.value = null;
    pinEditing.value = null;
  };
  const save = (e: Event) => {
    e.preventDefault();
    const finalTitle = title.trim() || tr('pin.defaultTitle');
    if (editing) updatePin({ ...editing, title: finalTitle, note: note.trim(), color });
    else if (draft) {
      const p = addPin(draft.lat, draft.lng, finalTitle, note.trim(), color);
      selectedPinId.value = p.id;
    }
    close();
  };

  return (
    <div class="modal-backdrop" onClick={close}>
      <div class="modal pin-editor" role="dialog" aria-modal="true" aria-labelledby="pin-editor-title" onClick={(e) => e.stopPropagation()}>
      <form onKeyDown={(e) => e.key === 'Escape' && close()} onSubmit={save}>
        <h2 id="pin-editor-title">{editing ? tr('pin.edit') : tr('pin.new')}</h2>
        <label class="field">
          <span>{tr('pin.title')}</span>
          <input ref={titleRef} value={title} maxLength={80} onInput={(e) => setTitle(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>{tr('pin.note')}</span>
          <textarea value={note} maxLength={1000} rows={3} onInput={(e) => setNote(e.currentTarget.value)} />
        </label>
        <fieldset class="field color-choices">
          <legend>{tr('pin.color')}</legend>
          {COLORS.map((c) => (
            <label key={c} class={`swatch ${c === color ? 'is-checked' : ''}`} style={{ background: c }}>
              <input type="radio" name="pin-color" value={c} checked={c === color} onChange={() => setColor(c)} aria-label={c} />
            </label>
          ))}
        </fieldset>
        <div class="modal-actions">
          {editing && (
            <button
              type="button"
              class="btn btn-ghost-danger"
              onClick={() => {
                deletePin(editing.id);
                selectedPinId.value = null;
                close();
              }}
            >
              {tr('pin.delete')}
            </button>
          )}
          <span class="spacer" />
          <button type="button" class="btn" onClick={close}>
            {tr('pin.cancel')}
          </button>
          <button type="submit" class="btn btn-primary">
            {tr('pin.save')}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
