export type AuthRole = 'mahasiswa' | 'hrd';
type StoredProfile = Record<string, unknown>;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function setCookie(name: string, value: string, maxAge = 60 * 60 * 24 * 7): void {
  if (!hasWindow()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearCookie(name: string): void {
  if (!hasWindow()) return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function getToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem('token');
}

export function setAuth(
  token: string,
  userId: string | number,
  role: string,
  options?: { name?: string | null; email?: string | null; profile?: StoredProfile | null }
): void {
  if (!hasWindow()) return;
  window.localStorage.setItem('token', token);
  window.localStorage.setItem('userId', String(userId));
  window.localStorage.setItem('role', role);
  if (options?.name) {
    window.localStorage.setItem('name', options.name);
  }
  if (options?.email) {
    window.localStorage.setItem('email', options.email);
  }
  if (options?.profile) {
    setStoredProfile(options.profile);
  }
  setCookie('token', token);
  setCookie('role', role);
  setCookie('userId', String(userId));
  window.dispatchEvent(new Event('auth:changed'));
}

export function clearAuth(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('userId');
  window.localStorage.removeItem('role');
  window.localStorage.removeItem('name');
  window.localStorage.removeItem('email');
  window.localStorage.removeItem('profile');
  clearCookie('token');
  clearCookie('role');
  clearCookie('userId');
  window.dispatchEvent(new Event('auth:changed'));
}

export function getRole(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem('role');
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function setStoredProfile(profile: StoredProfile): void {
  if (!hasWindow()) return;
  window.localStorage.setItem('profile', JSON.stringify(profile));
  const name = getUserNameFromProfile(profile);
  if (name) {
    window.localStorage.setItem('name', name);
  }
  window.dispatchEvent(new Event('profile:changed'));
  window.dispatchEvent(new Event('auth:changed'));
}

export function getStoredProfile(): StoredProfile | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem('profile');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getUserName(): string | null {
  if (!hasWindow()) return null;
  const profile = getStoredProfile();
  const fromProfile = profile ? getUserNameFromProfile(profile) : null;
  return fromProfile || window.localStorage.getItem('name') || window.localStorage.getItem('email');
}

function getUserNameFromProfile(profile: StoredProfile): string | null {
  const candidates = [
    profile.nama,
    profile.nama_perusahaan,
    profile.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}
