import type { AdminUser } from '../types';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getAdminUser(): AdminUser | null {
  try {
    return JSON.parse(localStorage.getItem('adminUser') || 'null');
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('adminUser');
}
