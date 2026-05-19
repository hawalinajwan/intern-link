const TOAST_EVENT = 'app:toast';

export function showToast(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }));
}

export function getToastEventName(): string {
  return TOAST_EVENT;
}
