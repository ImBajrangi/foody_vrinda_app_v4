/**
 * Address Autocomplete & Reverse Geocoding Service for Foody Vrinda
 * Provides forward geocoding, deduplication, and high-precision street-level reverse geocoding
 */

const CACHE_KEY = 'foody_address_cache';

// Curated Vrindavan & Mathura prominent landmarks, colonies, and roads for instant local resolution
export const VRINDAVAN_LANDMARKS = [
  { name: 'Prem Mandir', area: 'Chhatikara Road, Raman Reti', lat: 27.5721, lng: 77.6738 },
  { name: 'ISKCON Temple', area: 'Bhakti Vedanta Swami Marg, Raman Reti', lat: 27.5706, lng: 77.6593 },
  { name: 'Bankey Bihari Temple', area: 'Bihari Pura, Goda Vihar', lat: 27.5815, lng: 77.6990 },
  { name: 'Radha Raman Temple', area: 'Kesi Ghat', lat: 27.5862, lng: 77.7020 },
  { name: 'Shri Radha Vallabh Temple', area: 'Gotam Nagar', lat: 27.5840, lng: 77.7001 },
  { name: 'Maa Vaishno Devi Dham', area: 'Chhatikara Road', lat: 27.5512, lng: 77.6410 },
  { name: 'Chaitanya Vihar Phase 1 & 2', area: 'Chaitanya Vihar', lat: 27.5645, lng: 77.6680 },
  { name: 'Goda Vihar Colony', area: 'Goda Vihar, Vrindavan', lat: 27.5835, lng: 77.6960 },
  { name: 'Vrindavan Parikrama Marg', area: 'Raman Reti', lat: 27.5735, lng: 77.6620 },
  { name: 'Sunrakh Road', area: 'Sunrakh, Vrindavan', lat: 27.5890, lng: 77.6540 },
  { name: 'Omaxe Eternity', area: 'Chhatikara Road, Vrindavan', lat: 27.5610, lng: 77.6520 },
  { name: 'Krishna Valley / Rukmani Vihar', area: 'NH-19 Link Road, Vrindavan', lat: 27.5550, lng: 77.6450 },
  { name: 'Gaurav Nagar Colony', area: 'Near ISKCON, Raman Reti, Vrindavan', lat: 27.5680, lng: 77.6640 },
  { name: 'Pagal Baba Temple Area', area: 'Mathura-Vrindavan Road', lat: 27.5580, lng: 77.6830 },
  { name: 'Birla Mandir (Gita Mandir)', area: 'Mathura-Vrindavan Marg', lat: 27.5320, lng: 77.6880 },
  { name: 'Vrindavan Railway Station Area', area: 'Station Road, Vrindavan', lat: 27.5750, lng: 77.6850 },
  { name: 'Pani Gaon Yamuna Bridge Area', area: 'Pani Gaon Road, Vrindavan', lat: 27.5870, lng: 77.7120 },
  { name: 'Govardhan Chauraha / Highway', area: 'Mathura Junction Road', lat: 27.4920, lng: 77.6710 },
  { name: 'Krishna Janmabhoomi Mandir Area', area: 'Deeg Gate, Mathura', lat: 27.5050, lng: 77.6720 },
  { name: 'Dampier Nagar', area: 'Civil Lines, Mathura', lat: 27.4950, lng: 77.6800 },
  { name: 'Krishna Nagar', area: 'Mathura Market', lat: 27.5010, lng: 77.6650 },
  { name: 'Dan Ghati Mandir', area: 'Govardhan Parikrama, Mathura', lat: 27.4988, lng: 77.4647 }
];

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function findNearestLandmark(lat, lng) {
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const landmark of VRINDAVAN_LANDMARKS) {
    const dist = calculateDistanceKm(lat, lng, landmark.lat, landmark.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...landmark, distKm: dist };
    }
  }

  return nearest;
}

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
 * Parses OSM Nominatim addressdetails into a human-readable, precise street address
 * Enriched with local Vrindavan landmarks to prevent generic "Mathura, UP" area fallbacks
 */
export async function reverseGeocodeCoords(lat, lng) {
  if (!lat || !lng) return '';

  const nearestLandmark = findNearestLandmark(lat, lng);
  const isVrindavanLocality = (lat >= 27.53 && lat <= 27.63 && lng >= 77.62 && lng <= 77.75);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      {
        headers: { 'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8' }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const a = data?.address || {};

      const poi = a.amenity || a.building || a.shop || a.tourism || a.leisure || a.house_name || '';
      const house = a.house_number ? `Plot ${a.house_number}` : '';
      const road = a.road || a.pedestrian || a.footway || a.street || a.path || '';
      const colony = a.neighbourhood || a.suburb || a.residential || a.subdistrict || a.quarter || '';
      const village = a.hamlet || a.village || '';
      const city = isVrindavanLocality ? 'Vrindavan' : (a.city || a.town || a.municipality || 'Mathura');
      const postcode = a.postcode || (isVrindavanLocality ? '281121' : '');

      const parts = [];

      if (poi) parts.push(poi);
      if (house) parts.push(house);
      if (road && !parts.some(p => p.toLowerCase().includes(road.toLowerCase()))) {
        parts.push(road);
      }

      // If within 250m of a known temple/ashram/colony, seamlessly add reference
      if (nearestLandmark && nearestLandmark.distKm <= 0.25) {
        if (!parts.some(p => p.toLowerCase().includes(nearestLandmark.name.toLowerCase()))) {
          parts.push(`Near ${nearestLandmark.name}`);
        }
      }

      if (colony && !parts.some(p => p.toLowerCase().includes(colony.toLowerCase()))) {
        parts.push(colony);
      } else if (village && !parts.some(p => p.toLowerCase().includes(village.toLowerCase()))) {
        parts.push(village);
      } else if (nearestLandmark && nearestLandmark.area && nearestLandmark.distKm <= 0.8) {
        const areaSnippet = nearestLandmark.area.split(',')[0].trim();
        if (!parts.some(p => p.toLowerCase().includes(areaSnippet.toLowerCase()))) {
          parts.push(areaSnippet);
        }
      }

      if (!parts.some(p => p.toLowerCase().includes(city.toLowerCase()))) {
        parts.push(city);
      }

      if (postcode && !parts.includes(postcode)) {
        parts.push(postcode);
      }

      // If parsed parts are too generic (only city), fallback to nearest landmark or cleaned display name
      if (parts.length <= 1) {
        if (nearestLandmark && nearestLandmark.distKm <= 1.2) {
          return `${nearestLandmark.name}, ${nearestLandmark.area}, ${city} ${postcode}`.trim();
        }
        if (data.display_name) {
          // Remove duplicate Hindi/English repetitions like "Mathura, मथुरा"
          const tokens = data.display_name.split(',').map(s => s.trim()).filter(Boolean);
          const uniqueTokens = [];
          for (const tok of tokens) {
            const isDuplicate = uniqueTokens.some(u => u.toLowerCase() === tok.toLowerCase() || (u.includes('Mathura') && tok.includes('मथुरा')));
            if (!isDuplicate && !['India', 'IN'].includes(tok)) {
              uniqueTokens.push(tok);
            }
          }
          return uniqueTokens.slice(0, 4).join(', ');
        }
      }

      return parts.join(', ');
    }
  } catch (err) {
    console.warn("Reverse geocode network fallback:", err);
  }

  // Graceful offline / network failure fallback
  if (nearestLandmark && nearestLandmark.distKm <= 1.5) {
    return `${nearestLandmark.name}, ${nearestLandmark.area}, Vrindavan 281121`;
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Address Autocomplete with Deduplication & Local Spatial Grouping
 */
export async function fetchAddressSuggestions(query) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return [];

  // 1. Check local cache
  const cache = getLocalCache();
  if (cache[cleanQuery.toLowerCase()]) {
    return cache[cleanQuery.toLowerCase()];
  }

  // 2. Curated Vrindavan / Mathura quick suggestions (Instant local match)
  const normalizedQuery = cleanQuery.toLowerCase().replace(/[-_,.]/g, ' ').trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);

  const matchedLocal = VRINDAVAN_LANDMARKS.filter(spot => {
    const spotNorm = `${spot.name} ${spot.area}`.toLowerCase().replace(/[-_,.]/g, ' ');
    return queryWords.every(w => spotNorm.includes(w)) || spotNorm.includes(normalizedQuery);
  }).map(spot => ({
    title: spot.name,
    address: `${spot.name}, ${spot.area}, Vrindavan 281121`,
    lat: spot.lat,
    lng: spot.lng
  }));

  try {
    const isScoped = /vrindavan|mathura|govardhan/i.test(cleanQuery);
    const apiQuery = isScoped ? cleanQuery : `${cleanQuery} Vrindavan`;
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(apiQuery)}&format=json&addressdetails=1&limit=8&countrycodes=in`;
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
      
      // Parse OSM results and clean repetitive duplicates
      const seenTitles = new Set();
      const seenAddresses = new Set();
      const osmResults = [];

      for (const item of data) {
        const road = item.address?.road || item.address?.pedestrian || '';
        const suburb = item.address?.suburb || item.address?.neighbourhood || item.address?.residential || '';
        const rawTitle = item.name || item.display_name.split(',')[0].trim();
        
        // Disambiguate roads with identical names by appending their colony/suburb
        let cleanTitle = rawTitle;
        if (road && suburb && cleanTitle.toLowerCase() === road.toLowerCase()) {
          cleanTitle = `${road} (${suburb})`;
        }

        const titleKey = cleanTitle.toLowerCase().replace(/\s+/g, ' ');
        const addressKey = (item.display_name || '').toLowerCase().slice(0, 40);

        if (!seenTitles.has(titleKey) && !seenAddresses.has(addressKey)) {
          seenTitles.add(titleKey);
          seenAddresses.add(addressKey);
          osmResults.push({
            title: cleanTitle,
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          });
        }
      }

      // Merge local curated spots first then deduplicated OSM results
      const combined = [
        ...matchedLocal,
        ...osmResults.filter(o => !matchedLocal.some(m => m.title.toLowerCase() === o.title.toLowerCase()))
      ].slice(0, 6);

      setLocalCache(cleanQuery, combined);
      return combined;
    }
  } catch {
    // Graceful fallback to matching local suggestions
  }

  return matchedLocal.slice(0, 5);
}
