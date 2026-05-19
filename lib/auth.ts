export type AuthRole = 'mahasiswa' | 'hrd';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem('token');
}

export function setAuth(token: string, userId: string | number, role: string): void {
  if (!hasWindow()) return;
  window.localStorage.setItem('token', token);
  window.localStorage.setItem('userId', String(userId));
  window.localStorage.setItem('role', role);
  window.dispatchEvent(new Event('auth:changed'));
}

export function clearAuth(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('userId');
  window.localStorage.removeItem('role');
  window.dispatchEvent(new Event('auth:changed'));
}

export function getRole(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem('role');
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}
