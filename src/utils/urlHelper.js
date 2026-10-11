/**
 * Foody Vrinda Universal URL & Redirection Engine
 * Ensures 100% dynamic, origin-aware redirection across Web, PWA, and Mobile Native environments
 * Prevents localhost leakage on production and external sharing links
 */

import { Capacitor } from '@capacitor/core';

export const PRIMARY_LIVE_DOMAIN = 'https://eat.vrindopnishad.in';

/**
 * Returns true if current environment is local development (localhost / 127.0.0.1 / private LAN)
 */
export function isLocalEnvironment() {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname || '';
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local')
  );
}

/**
 * Returns the exact dynamic root URL of the current application instance
 * E.g., 'https://eat.vrindopnishad.in/' or 'https://foody-vrinda-v3.vercel.app/' or 'http://localhost:5173/'
 */
export function getAppRootUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    return origin.endsWith('/') ? origin : `${origin}/`;
  }
  return `${PRIMARY_LIVE_DOMAIN}/`;
}

/**
 * Returns the redirect URL for authentication flows (OAuth, magic links, email verification)
 * - In Capacitor native app: returns custom app scheme callback
 * - In Web / PWA: returns current dynamic root link
 */
export function getAuthRedirectUrl() {
  if (Capacitor.isNativePlatform()) {
    return 'com.foodyvrinda.app://auth/callback';
  }
  return getAppRootUrl();
}

/**
 * Returns public-facing URLs for sharing (WhatsApp, SMS, Clipboard, QR Codes)
 * If developer is testing on localhost, safely falls back to PRIMARY_LIVE_DOMAIN
 * so recipients never receive broken localhost links.
 */
export function getPublicShareUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    if (isLocalEnvironment()) {
      return `${PRIMARY_LIVE_DOMAIN}${cleanPath}`;
    }
    return `${window.location.origin}${cleanPath}`;
  }
  return `${PRIMARY_LIVE_DOMAIN}${cleanPath}`;
}
