/**
 * Address Autocomplete & Reverse Geocoding Service for Foody Vrinda
 * 
 * Provides:
 * 1. Intelligent Hierarchical Reverse Geocoder:
 *    [House/Plot] + [Gali/Road] + [Landmark/Mandir/POI] + [Mohalla/Hamlet] + [Village/Town] + [District] + [Pincode]
 *    Full coverage across Barsana, Aajnokh, Vrindavan, Govardhan, Nandgaon, Chhata & Mathura district.
 * 2. High-performance caching for ultra-responsive mobile experience on low & high-end devices.
 * 3. Scoped Braj autocomplete without restrictive Vrindavan-only hardcoding.
 */

const SUGGESTIONS_CACHE_KEY = 'foody_address_cache';
const REVERSE_CACHE_KEY = 'foody_reverse_geo_cache';

// In-memory runtime caches for instant sub-millisecond retrieval
const memorySuggestionsCache = new Map();
const memoryReverseCache = new Map();

function getStorageCache(key) {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorageCache(key, entryKey, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    const cache = getStorageCache(key);
    cache[entryKey] = value;
    // Evict oldest if cache exceeds 120 entries to save mobile storage
    const keys = Object.keys(cache);
    if (keys.length > 120) {
      delete cache[keys[0]];
    }
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {
    console.warn("Storage cache write note:", e);
  }
}

/**
 * Intelligent Structured Hierarchical Reverse Geocoder
 * Parses live OSM Nominatim addressdetails into a precise hierarchical address:
 * Gali + Landmark/Mandir + Mohalla + Village/Town (Barsana/Aajnokh/Vrindavan) + District (Mathura) + Pincode
 */
export async function reverseGeocodeCoords(lat, lng) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return '';

  // Round to 4 decimal places (~11 meters) for caching
  const cacheKey = `${numLat.toFixed(4)},${numLng.toFixed(4)}`;

  // 1. Check in-memory runtime cache
  if (memoryReverseCache.has(cacheKey)) {
    return memoryReverseCache.get(cacheKey);
  }

  // 2. Check localStorage cache
  const storedCache = getStorageCache(REVERSE_CACHE_KEY);
  if (storedCache[cacheKey]) {
    memoryReverseCache.set(cacheKey, storedCache[cacheKey]);
    return storedCache[cacheKey];
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${numLat}&lon=${numLng}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
          'User-Agent': 'FoodyVrinda-App/3.0'
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const a = data?.address || {};

      // 1. Landmark / Mandir / POI / Shop / Health Centre / Civic Building
      const rawLandmark = a.amenity || a.place_of_worship || a.healthcare || a.historic || 
                          a.tourism || a.leisure || a.building || a.shop || a.office || a.house_name || '';
      const landmark = (/^(yes|no|building|commercial|residential|unnamed|true)$/i.test(rawLandmark.trim()))
        ? '' 
        : rawLandmark.trim();

      // 2. Plot / House / Flat No.
      const rawHouse = (a.house_number || '').trim();
      const house = rawHouse ? (/plot|house|flat|shop|no\./i.test(rawHouse) ? rawHouse : `Plot ${rawHouse}`) : '';

      // 3. Gali / Marg / Road
      const rawRoad = a.road || a.street || a.pedestrian || a.footway || a.path || a.lane || a.alley || a.service || a.track || '';
      const road = (/^(unnamed|service road|path|track)$/i.test(rawRoad.trim())) ? '' : rawRoad.trim();

      // 4. Mohalla / Hamlet / Colony / Neighborhood
      const rawMohalla = a.neighbourhood || a.suburb || a.quarter || (a.residential && a.residential !== rawRoad ? a.residential : '') || '';
      let mohalla = rawMohalla.trim();
      const hamlet = (a.hamlet || '').trim();
      if (hamlet && !mohalla && hamlet.toLowerCase() !== (a.village || '').toLowerCase() && hamlet.toLowerCase() !== (a.town || '').toLowerCase()) {
        mohalla = hamlet;
      }

      // 5. Village / Town / Gram Panchayat (Barsana, Aajnokh, Vrindavan, Govardhan, Nandgaon, etc.)
      let villageTown = (a.village || a.town || '').trim();
      if (!villageTown && a.city && !/mathura/i.test(a.city)) {
        villageTown = a.city.trim();
      }
      if (!villageTown && hamlet) {
        villageTown = hamlet;
      }
      // If landmark or healthcare explicitly identifies village (e.g. SubCentre Ajnokh in Gajipur revenue area)
      if (/ajnokh/i.test(landmark) && !/ajnokh/i.test(villageTown)) {
        villageTown = villageTown ? `Aajnokh (${villageTown})` : 'Aajnokh';
      }

      // 6. Tehsil / Municipality (e.g. Chhata, Mathura)
      const tehsil = (a.municipality || '').trim();

      // 7. District (county normalized from Hindi 'मथुरा' to Mathura)
      let district = (a.county || a.state_district || '').trim();
      if (!district || district.includes('मथुरा') || /mathura/i.test(district)) {
        district = 'Mathura';
      }

      // 8. Pincode
      const pincode = (a.postcode || '').trim();

      // Assemble hierarchically with intelligent deduplication:
      // Gali/Road -> Landmark/Mandir -> Mohalla -> Village/Town -> Tehsil -> District -> Pincode
      const parts = [];

      const addPart = (val) => {
        if (!val) return;
        const clean = val.trim();
        if (!clean) return;
        const cleanLower = clean.toLowerCase();
        const exists = parts.some(p => {
          const pLower = p.toLowerCase();
          return pLower === cleanLower || (cleanLower.length > 3 && pLower.includes(cleanLower));
        });
        if (!exists) {
          parts.push(clean);
        }
      };

      // Street & House combo
      const streetPart = [house, road].filter(Boolean).join(', ');
      if (streetPart) addPart(streetPart);
      if (landmark) addPart(landmark);
      if (mohalla) addPart(mohalla);
      if (villageTown) addPart(villageTown);
      if (tehsil && tehsil.toLowerCase() !== (villageTown || '').toLowerCase() && tehsil.toLowerCase() !== district.toLowerCase()) {
        addPart(tehsil);
      }
      addPart(district);
      if (pincode) addPart(pincode);

      let formattedAddress = '';
      if (parts.length >= 2) {
        formattedAddress = parts.join(', ');
      } else if (data.display_name) {
        // Fallback: clean the raw display_name by removing redundant country & duplicates
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
        formattedAddress = uniqueTokens.slice(0, 5).join(', ');
      }

      if (formattedAddress) {
        memoryReverseCache.set(cacheKey, formattedAddress);
        setStorageCache(REVERSE_CACHE_KEY, cacheKey, formattedAddress);
        return formattedAddress;
      }
    }
  } catch (err) {
    console.warn("Reverse geocode network notice:", err);
  }

  const fallbackStr = `${numLat.toFixed(5)}, ${numLng.toFixed(5)}`;
  return fallbackStr;
}

/**
 * Address Autocomplete with Live OSM Search & Mathura/Braj Regional Scoping
 */
export async function fetchAddressSuggestions(query) {
  let cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return [];

  // Normalize common colloquial spellings in the Braj region
  if (/^aajnokh/i.test(cleanQuery)) {
    cleanQuery = cleanQuery.replace(/^aajnokh/i, 'Ajnokh');
  }

  const cacheKey = cleanQuery.toLowerCase();

  // 1. Check in-memory runtime cache
  if (memorySuggestionsCache.has(cacheKey)) {
    return memorySuggestionsCache.get(cacheKey);
  }

  // 2. Check localStorage cache
  const storedCache = getStorageCache(SUGGESTIONS_CACHE_KEY);
  if (storedCache[cacheKey]) {
    memorySuggestionsCache.set(cacheKey, storedCache[cacheKey]);
    return storedCache[cacheKey];
  }

  try {
    // Intelligent scoping:
    // If the query already mentions a specific Braj area, search it as-is.
    // If not, scope to Mathura district rather than hardcoded Vrindavan.
    const hasRegionalContext = /mathura|vrindavan|barsana|ajnokh|govardhan|nandgaon|chhata|kosi|uttar pradesh/i.test(cleanQuery);
    const primaryQuery = hasRegionalContext ? cleanQuery : `${cleanQuery}, Mathura, Uttar Pradesh`;

    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(primaryQuery)}&format=json&addressdetails=1&limit=8&countrycodes=in`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const headers = {
      'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
      'User-Agent': 'FoodyVrinda-App/3.0'
    };

    let response = await fetch(searchUrl, {
      signal: controller.signal,
      headers
    });
    clearTimeout(timeoutId);

    let data = [];
    if (response.ok) {
      data = await response.json();
    }

    // Fallback: If scoped query returned 0 results, retry with bare query in India
    if ((!data || data.length === 0) && !hasRegionalContext) {
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=6&countrycodes=in`;
      const fallbackController = new AbortController();
      const fbTimeoutId = setTimeout(() => fallbackController.abort(), 3500);
      try {
        const fbRes = await fetch(fallbackUrl, {
          signal: fallbackController.signal,
          headers
        });
        clearTimeout(fbTimeoutId);
        if (fbRes.ok) {
          data = await fbRes.json();
        }
      } catch (_) {}
    }

    if (data && data.length > 0) {
      // Deduplicate overlapping OSM way segments with identical titles/addresses
      const seenKeys = new Set();
      const osmResults = [];

      for (const item of data) {
        const road = item.address?.road || item.address?.pedestrian || '';
        const suburb = item.address?.suburb || item.address?.neighbourhood || item.address?.residential || item.address?.village || '';
        const rawTitle = item.name || item.display_name.split(',')[0].trim();

        // Clarify road name with colony/village if identical
        let cleanTitle = rawTitle;
        if (road && suburb && cleanTitle.toLowerCase() === road.toLowerCase()) {
          cleanTitle = `${road} (${suburb})`;
        }

        // Clean display name by trimming country and excessive commas
        const cleanAddress = (item.display_name || '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !['India', 'IN'].includes(s) && !s.includes('मथुरा'))
          .join(', ');

        const dedupeKey = `${cleanTitle.toLowerCase()}|${(item.address?.postcode || '')}|${(item.address?.suburb || item.address?.village || '').toLowerCase()}`;

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
      memorySuggestionsCache.set(cacheKey, results);
      setStorageCache(SUGGESTIONS_CACHE_KEY, cacheKey, results);
      return results;
    }
  } catch (err) {
    console.warn("Address search notice:", err);
  }

  return [];
}
