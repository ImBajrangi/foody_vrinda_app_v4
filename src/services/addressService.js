/**
 * Address Autocomplete & Reverse Geocoding Service for Foody Vrinda
 * Pure dynamic geocoding via OpenStreetMap Nominatim with granular street parsing & deduplication.
 * No hardcoded or dummy landmarks.
 */

const CACHE_KEY = 'foody_address_cache';

function getLocalCache() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalCache(query, results) {
  try {
    if (typeof localStorage === 'undefined') return;
    const cache = getLocalCache();
    cache[query.toLowerCase().trim()] = results;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Address cache write notice:", e);
  }
}

/**
 * Intelligent Structured Reverse Geocoder
 * Parses live OSM Nominatim addressdetails into a precise street & colony address.
 * Uses 100% live API data without any hardcoded dummy arrays.
 */
export async function reverseGeocodeCoords(lat, lng) {
  if (!lat || !lng) return '';

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
          'User-Agent': 'FoodyVrinda-App'
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const a = data?.address || {};

      // Real granular components directly from the map engine
      const building = a.amenity || a.building || a.shop || a.tourism || a.leisure || a.house_name || '';
      const house = a.house_number ? `Plot ${a.house_number}` : '';
      const road = a.road || a.pedestrian || a.footway || a.street || a.path || '';
      const colony = a.neighbourhood || a.suburb || a.residential || a.subdistrict || a.quarter || '';
      const village = a.hamlet || a.village || '';
      const city = a.city || a.town || a.municipality || a.county || '';
      const postcode = a.postcode || '';

      const parts = [];

      if (building) parts.push(building);
      if (house) parts.push(house);
      if (road && !parts.some(p => p.toLowerCase().includes(road.toLowerCase()))) {
        parts.push(road);
      }
      if (colony && !parts.some(p => p.toLowerCase().includes(colony.toLowerCase()))) {
        parts.push(colony);
      } else if (village && !parts.some(p => p.toLowerCase().includes(village.toLowerCase()))) {
        parts.push(village);
      }
      if (city && !parts.some(p => p.toLowerCase().includes(city.toLowerCase()))) {
        parts.push(city);
      }
      if (postcode && !parts.includes(postcode)) {
        parts.push(postcode);
      }

      // If structured parts produced a clean street address, return it
      if (parts.length >= 2) {
        return parts.join(', ');
      }

      // Fallback: clean the raw display_name by removing redundant Hindi/English duplicates and trailing country
      if (data.display_name) {
        const tokens = data.display_name.split(',').map(s => s.trim()).filter(Boolean);
        const uniqueTokens = [];
        for (const tok of tokens) {
          const isDuplicate = uniqueTokens.some(u => 
            u.toLowerCase() === tok.toLowerCase() || 
            (u.includes('Mathura') && tok.includes('मथुरा'))
          );
          if (!isDuplicate && !['India', 'IN'].includes(tok)) {
            uniqueTokens.push(tok);
          }
        }
        return uniqueTokens.slice(0, 4).join(', ');
      }
    }
  } catch (err) {
    console.warn("Reverse geocode network notice:", err);
  }

  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

/**
 * Address Autocomplete with Live OSM Search & Deduplication
 * Deduplicates overlapping way segments and normalizes duplicate road names.
 */
export async function fetchAddressSuggestions(query) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return [];

  // 1. Check local cache
  const cache = getLocalCache();
  if (cache[cleanQuery.toLowerCase()]) {
    return cache[cleanQuery.toLowerCase()];
  }

  try {
    const isScoped = /vrindavan|mathura|uttar pradesh/i.test(cleanQuery);
    const apiQuery = isScoped ? cleanQuery : `${cleanQuery}, Vrindavan, Mathura`;
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(apiQuery)}&format=json&addressdetails=1&limit=10&countrycodes=in`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        'User-Agent': 'FoodyVrinda-App'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // Deduplicate overlapping OSM way segments with identical titles/addresses
      const seenKeys = new Set();
      const osmResults = [];

      for (const item of data) {
        const road = item.address?.road || item.address?.pedestrian || '';
        const suburb = item.address?.suburb || item.address?.neighbourhood || item.address?.residential || '';
        const rawTitle = item.name || item.display_name.split(',')[0].trim();
        
        // If it's a road and we know the colony/suburb, clarify: "Mathura Road (Chhatikara)"
        let cleanTitle = rawTitle;
        if (road && suburb && cleanTitle.toLowerCase() === road.toLowerCase()) {
          cleanTitle = `${road} (${suburb})`;
        }

        // Clean display name by trimming country and excessive commas
        const cleanAddress = (item.display_name || '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !['India', 'IN'].includes(s))
          .join(', ');

        const dedupeKey = `${cleanTitle.toLowerCase()}|${(item.address?.postcode || '')}|${(item.address?.suburb || '').toLowerCase()}`;

        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          osmResults.push({
            title: cleanTitle,
            address: cleanAddress || item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          });
        }
      }

      const results = osmResults.slice(0, 6);
      setLocalCache(cleanQuery, results);
      return results;
    }
  } catch (err) {
    console.warn("Address search notice:", err);
  }

  return [];
}
