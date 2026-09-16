/**
 * HitSoochi Semantic Search & Intelligent Recommendation Engine for Foody Vrinda
 * Ported from Flutter hit_soochi_service.dart with zero-latency local fallback
 */

const LOCAL_SATVIK_ONTOLOGY = {
  'sweet': {
    category: 'Sweets & Prasad',
    intent: 'PRASAD_SEEKER',
    recommendations: ['Kesariya Rabdi Kheer', 'Malpua with Rabdi', 'Makkhan Mishri Prasad'],
    boostKeywords: ['kheer', 'rabdi', 'sweet', 'mithai', 'prasad', 'bhog', 'malpua']
  },
  'burger': {
    category: 'Snacks',
    intent: 'QUICK_BITE',
    recommendations: ['Cheese With Satvik Burger', 'Crispy Paneer Burger'],
    boostKeywords: ['burger', 'paneer', 'cheese', 'snack']
  },
  'thali': {
    category: 'Thali & Meals',
    intent: 'FULL_MEAL',
    recommendations: ['Royal Vedic Thali', 'Brijwasi Special Thali', 'Paneer Makhani Meal'],
    boostKeywords: ['thali', 'meal', 'dal', 'paneer', 'roti', 'rice', 'bhog thali']
  },
  'pizza': {
    category: 'Snacks',
    intent: 'SNACK_PIZZA',
    recommendations: ['Paneer Satvik Pizza (10")', 'Garden Fresh Satvik Pizza'],
    boostKeywords: ['pizza', 'cheese', 'paneer', 'crust']
  },
  'prasad': {
    category: 'Sweets & Prasad',
    intent: 'SACRED_OFFERING',
    recommendations: ['Govind Bhog Basmati Rice', 'Kesariya Rabdi Kheer', 'Royal Vedic Thali'],
    boostKeywords: ['prasad', 'satvik', 'bhog', 'holy', 'pure']
  }
};

export class HitSoochiService {
  static baseUrl = import.meta.env.VITE_HITSOOCHI_URL || 'http://localhost:8000';

  /**
   * Curated Vedic search intents and popular cravings
   */
  static getCuratedSuggestions() {
    return [
      { title: 'Royal Vedic Thali', keyword: 'thali', type: 'meal' },
      { title: 'Satvik Burgers', keyword: 'burger', type: 'snack' },
      { title: 'Kesariya Rabdi Kheer', keyword: 'kheer', type: 'sweet' },
      { title: 'Satvik Paneer Pizza', keyword: 'pizza', type: 'snack' },
      { title: 'Govind Bhog Prasad', keyword: 'prasad', type: 'prasad' },
      { title: 'Paneer Makhani', keyword: 'paneer', type: 'curry' },
      { title: 'Basmati Rice & Bhog', keyword: 'rice', type: 'prasad' }
    ];
  }

  /**
   * Rank menu items by query relevance and Vedic semantic ontology
   */
  static rankItems(items = [], query = '') {
    if (!query || !items || items.length === 0) return items;
    const clean = query.trim().toLowerCase();

    // Check ontology keywords for semantic relevance boost
    let boostKeywords = [];
    for (const [key, val] of Object.entries(LOCAL_SATVIK_ONTOLOGY)) {
      if (clean.includes(key) || val.boostKeywords.some(kw => clean.includes(kw))) {
        boostKeywords = [...boostKeywords, ...val.boostKeywords, key];
      }
    }

    return [...items].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aDesc = (a.description || '').toLowerCase();
      const bDesc = (b.description || '').toLowerCase();

      // Score A
      let scoreA = 0;
      if (aName === clean) scoreA += 100;
      else if (aName.startsWith(clean)) scoreA += 50;
      else if (aName.includes(clean)) scoreA += 30;
      if (aCat.includes(clean)) scoreA += 20;
      if (aDesc.includes(clean)) scoreA += 10;
      if (boostKeywords.some(kw => aName.includes(kw) || aCat.includes(kw) || aDesc.includes(kw))) scoreA += 15;

      // Score B
      let scoreB = 0;
      if (bName === clean) scoreB += 100;
      else if (bName.startsWith(clean)) scoreB += 50;
      else if (bName.includes(clean)) scoreB += 30;
      if (bCat.includes(clean)) scoreB += 20;
      if (bDesc.includes(clean)) scoreB += 10;
      if (boostKeywords.some(kw => bName.includes(kw) || bCat.includes(kw) || bDesc.includes(kw))) scoreB += 15;

      return scoreB - scoreA;
    });
  }

  /**
   * Optimize query and extract domain intent
   */
  static async optimizeQuery(query) {
    const clean = (query || '').trim().toLowerCase();
    if (clean.length < 2) return null;

    // Check domain ontology match
    for (const [key, val] of Object.entries(LOCAL_SATVIK_ONTOLOGY)) {
      if (clean.includes(key) || val.boostKeywords.some(kw => clean.includes(kw))) {
        return {
          original: query,
          optimized: `${clean} pure satvik no-onion no-garlic`,
          intent: val.intent,
          category: val.category,
          recommendedDishes: val.recommendations,
          confidence: '0.94'
        };
      }
    }

    return {
      original: query,
      optimized: clean,
      intent: 'GENERAL_SEARCH',
      category: 'All',
      recommendedDishes: ['Royal Vedic Thali', 'Cheese With Satvik Burger'],
      confidence: '0.70'
    };
  }

  /**
   * Get dynamic suggestions with relevance scoring
   */
  static async getSuggestions(partial, limit = 5) {
    const clean = (partial || '').trim().toLowerCase();
    if (clean.length < 1) return [];

    const defaultSuggestions = [
      { text: 'Royal Vedic Thali', category: 'Thali & Meals', score: 0.98 },
      { text: 'Cheese With Satvik Burger', category: 'Snacks', score: 0.95 },
      { text: 'Kesariya Rabdi Kheer', category: 'Sweets & Prasad', score: 0.92 },
      { text: 'Paneer Satvik Pizza (10")', category: 'Snacks', score: 0.89 },
      { text: 'Govind Bhog Basmati Rice', category: 'Thali & Meals', score: 0.85 },
      { text: 'Paneer Makhani Meal', category: 'Thali & Meals', score: 0.82 }
    ];

    const filtered = defaultSuggestions.filter(s =>
      s.text.toLowerCase().includes(clean) ||
      s.category.toLowerCase().includes(clean)
    );

    return (filtered.length > 0 ? filtered : defaultSuggestions).slice(0, limit);
  }
}
