/**
 * Asides as modals (Deeper, Primer): a compact trigger `[data-modal-open]` followed by a native <dialog>.
 * showModal() gives focus trapping, Esc to close and a top layer for free; clicking the backdrop or
 * `[data-modal-close]` closes it. Idempotent (safe to import from several components).
 */
let installed = false;

export function installModals() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opener = t.closest<HTMLElement>('[data-modal-open]');
    if (opener) {
      const dlg = opener.parentElement?.querySelector<HTMLDialogElement>('dialog[data-modal]');
      if (dlg && !dlg.open) {
        dlg.showModal();
        document.documentElement.classList.add('has-modal');
        // let scenes inside the dialog (e.g. a primer figure) mount and size themselves
        requestAnimationFrame(() => dispatchEvent(new Event('resize')));
      }
      return;
    }
    if (t.closest('[data-modal-close]')) {
      t.closest<HTMLDialogElement>('dialog')?.close();
      return;
    }
    // click on the backdrop = click on the dialog element itself, outside its content box
    if (t instanceof HTMLDialogElement && t.open) {
      const r = t.getBoundingClientRect();
      const ev = e as MouseEvent;
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) t.close();
    }
  });
  document.addEventListener(
    'close',
    (e) => {
      if ((e.target as HTMLElement).matches?.('dialog[data-modal]')) document.documentElement.classList.remove('has-modal');
    },
    true,
  );
}
