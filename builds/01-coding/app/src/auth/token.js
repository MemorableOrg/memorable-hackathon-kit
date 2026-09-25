import { createHash } from 'node:crypto';

export function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHash('sha256').update(body + secret).digest('base64url');
  return `${body}.${sig}`;
}

export function verify(token, secret) {
  const [body, sig] = token.split('.');
  const expected = createHash('sha256').update(body + secret).digest('base64url');
  if (sig !== expected) return null;
  return JSON.parse(Buffer.from(body, 'base64url').toString());
}
