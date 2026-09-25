import { now } from '../util/time.js';

export function createSession(userId, ttlMs) {
  return { userId, expiresAt: now() + ttlMs };
}

export function isExpired(session) {
  return session.expiresAt < now();
}

export function refresh(session, ttlMs) {
  if (isExpired(session)) throw new Error('cannot refresh an expired session');
  return { ...session, expiresAt: now() + ttlMs };
}
