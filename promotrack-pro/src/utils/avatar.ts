import type { UserProfile } from '../types';

export function avatarFor(user?: Pick<UserProfile, 'fullName' | 'avatarUrl'>) {
  if (user?.avatarUrl) return user.avatarUrl;
  const initials = (user?.fullName || '').split(/\s+/).slice(0, 2).map((word) => word[0] || '').join('').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#248A60"/><text x="40" y="49" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white">${initials}</text></svg>`)}`;
}
