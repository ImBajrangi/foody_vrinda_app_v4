/**
 * Address Autocomplete Service for Foody Vrinda
 * Provides forward geocoding & address suggestions using OpenStreetMap Nominatim with local caching
 */

const CACHE_KEY = 'foody_address_cache';

function getLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalCache(query, results) {
  try {
    const cache = getLocalCache();
    cache[query.toLowerCase().trim()] = results;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Address cache write notice:", e);
  }
}

export async function fetchAddressSuggestions(query) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 3) return [];

  // 1. Check local cache
  const cache = getLocalCache();
  if (cache[cleanQuery.toLowerCase()]) {
    return cache[cleanQuery.toLowerCase()];
  }

  // 2. Curated Vrindavan / Mathura quick suggestions for instantaneous local response
  const localVrindavanSpots = [
    { title: 'ISKCON Temple, Raman Reti', address: 'Bhakti Vedanta Swami Marg, Raman Reti, Vrindavan, UP 281121', lat: 27.5706, lng: 77.6593 },
    { title: 'Prem Mandir, Chhatikara Road', address: 'Prem Mandir, Raman Reti, Vrindavan, UP 281121', lat: 27.5721, lng: 77.6738 },
    { title: 'Bankey Bihari Temple, Goda Vihar', address: 'Bihari Pura, Vrindavan, Mathura, UP 281121', lat: 27.5815, lng: 77.6990 },
    { title: 'Radha Raman Temple', address: 'Kesi Ghat, Vrindavan, Mathura, UP 281121', lat: 27.5862, lng: 77.7020 },
    { title: 'Shri Radha Vallabh Temple', address: 'Gotam Nagar, Vrindavan, UP 281121', lat: 27.5840, lng: 77.7001 },
    { title: 'Maa Vaishno Devi Dham', address: 'Chhatikara Road, Vrindavan, UP 281121', lat: 27.5512, lng: 77.6410 },
    { title: 'Vrindavan Railway Station Area', address: 'Station Road, Vrindavan, Mathura, UP 281121', lat: 27.5750, lng: 77.6850 },
    { title: 'Govardhan Parikrama Marg', address: 'Near Dan Ghati Mandir, Govardhan, Mathura, UP 281502', lat: 27.4988, lng: 77.4647 },
    { title: 'Vrindopnishad Ashram', address: 'Parikrama Marg, Raman Reti, Vrindavan, UP 281121', lat: 27.5735, lng: 77.6620 }
  ];

  const matchedLocal = localVrindavanSpots.filter(spot => 
    spot.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
    spot.address.toLowerCase().includes(cleanQuery.toLowerCase())
  );

  try {
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery + ' Vrindavan Mathura')}&format=json&addressdetails=1&limit=5&countrycodes=in`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const osmResults = data.map(item => ({
        title: item.name || item.display_name.split(',')[0],
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));

      // Merge local curated spots first then OSM results deduplicated
      const combined = [...matchedLocal, ...osmResults.filter(o => !matchedLocal.some(m => m.title.toLowerCase() === o.title.toLowerCase()))].slice(0, 6);
      setLocalCache(cleanQuery, combined);
      return combined;
    }
  } catch {
    // Graceful fallback to matching local suggestions
  }

  return matchedLocal.slice(0, 5);
}
