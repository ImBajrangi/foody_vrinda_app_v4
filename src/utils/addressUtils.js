/**
 * Foody Vrinda - Address & Coordinate Utilities
 * 
 * Provides robust isolation between delivery and self-pickup counter addresses,
 * sanitization against legacy contaminated localStorage/profile state,
 * and multi-tier coordinate resolution (GPS -> saved -> service_area_fallback).
 */

export const DEFAULT_VRINDA_COORDS = { lat: 27.5706, lng: 77.6593 };

/**
 * Checks whether an address string contains a contaminated self-pickup counter marker
 * @param {string} addr
 * @returns {boolean}
 */
export const isContaminatedPickupAddress = (addr) => {
  if (!addr || typeof addr !== 'string') return false;
  const s = addr.trim();
  if (!s) return false;

  return (
    s.startsWith('[Self-Pickup]') ||
    s.startsWith('[Pickup]') ||
    s.startsWith('[Counter Pickup]') ||
    s.includes('Counter:') ||
    s.includes('[Self-Pickup') ||
    /^\[.*pickup.*\]/i.test(s) ||
    /counter\s*pickup/i.test(s)
  );
};

/**
 * Returns a sanitized address or empty string if contaminated
 * @param {string} addr
 * @returns {string}
 */
export const sanitizeCustomerAddress = (addr) => {
  if (!addr || typeof addr !== 'string') return '';
  if (isContaminatedPickupAddress(addr)) return '';
  return addr.trim();
};

/**
 * Validates if coordinates object has valid non-zero numeric lat and lng
 * @param {object} coords
 * @returns {boolean}
 */
export const isValidCoordinates = (coords) => {
  return (
    Boolean(coords) &&
    typeof coords === 'object' &&
    typeof coords.lat === 'number' &&
    !isNaN(coords.lat) &&
    typeof coords.lng === 'number' &&
    !isNaN(coords.lng) &&
    coords.lat !== 0 &&
    coords.lng !== 0
  );
};

/**
 * Resolves coordinates according to the preferred order:
 * 1. Explicitly pinned / freshly fetched GPS
 * 2. Previously saved valid coordinates
 * 3. Default service-area fallback
 * @param {object} params
 * @param {object} [params.pinnedCoords]
 * @param {object} [params.savedCoords]
 * @param {object} [params.activeShopCoords]
 * @param {string} [params.fulfillmentType] - 'delivery' | 'pickup'
 * @returns {{ coords: { lat: number, lng: number }, source: 'gps' | 'saved' | 'service_area_fallback' | 'pickup_counter' }}
 */
export const resolveOrderCoordinates = ({
  pinnedCoords = null,
  savedCoords = null,
  activeShopCoords = null,
  fulfillmentType = 'delivery'
} = {}) => {
  if (fulfillmentType === 'pickup') {
    if (isValidCoordinates(activeShopCoords)) {
      return { coords: activeShopCoords, source: 'pickup_counter' };
    }
    return { coords: DEFAULT_VRINDA_COORDS, source: 'pickup_counter' };
  }

  // 1. Explicitly pinned or freshly auto-filled GPS coordinates
  if (isValidCoordinates(pinnedCoords)) {
    return { coords: pinnedCoords, source: 'gps' };
  }

  // 2. Previously saved valid customer delivery coordinates
  if (isValidCoordinates(savedCoords)) {
    return { coords: savedCoords, source: 'saved' };
  }

  // 3. Backend/default service-area coordinates (last-resort fallback)
  return { coords: DEFAULT_VRINDA_COORDS, source: 'service_area_fallback' };
};
