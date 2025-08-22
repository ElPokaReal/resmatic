export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: 'ADMIN' | 'USER' };
};

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function apiMe(accessToken: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Me failed (${res.status})`);
  }
  return res.json();
}

export async function apiRefresh(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Refresh failed (${res.status})`);
  }
  return res.json();
}

export async function apiLogout(accessToken: string) {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Logout failed (${res.status})`);
  }
  return res.json();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
