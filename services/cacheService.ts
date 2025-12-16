import { KOLAnalysis, Language } from '../types';

const CACHE_PREFIX = 'kol_analysis_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  data: KOLAnalysis;
  timestamp: number;
}

/**
 * Build cache key including language
 */
const buildCacheKey = (handle: string, language: Language = 'en'): string => {
  return `${CACHE_PREFIX}${handle.toLowerCase()}_${language}`;
};

/**
 * Check if cached data exists and is still valid (< 24 hours old)
 */
export const getCachedAnalysis = (handle: string, language: Language = 'en'): KOLAnalysis | null => {
  try {
    const key = buildCacheKey(handle, language);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const cachedData: CachedData = JSON.parse(cached);
    const now = Date.now();
    const age = now - cachedData.timestamp;

    // Check if cache is expired
    if (age > CACHE_DURATION_MS) {
      console.log(`Cache expired for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      localStorage.removeItem(key);
      return null;
    }

    console.log(`Cache hit for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return cachedData.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Store analysis result in cache
 */
export const setCachedAnalysis = (handle: string, data: KOLAnalysis, language: Language = 'en'): void => {
  try {
    const key = buildCacheKey(handle, language);
    const cachedData: CachedData = {
      data,
      timestamp: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(cachedData));
    console.log(`Cached analysis for ${handle}`);
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

/**
 * Clear specific handle from cache
 */
export const clearCachedAnalysis = (handle: string, language: Language = 'en'): void => {
  try {
    const key = buildCacheKey(handle, language);
    localStorage.removeItem(key);
    console.log(`Cleared cache for ${handle}`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear all cached analyses (useful for debugging or manual refresh)
 */
export const clearAllCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared all cached analyses');
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

/**
 * Get cache age in minutes for a specific handle
 */
export const getCacheAge = (handle: string, language: Language = 'en'): number | null => {
  try {
    const key = buildCacheKey(handle, language);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const cachedData: CachedData = JSON.parse(cached);
    const now = Date.now();
    const ageMinutes = Math.round((now - cachedData.timestamp) / 1000 / 60);

    return ageMinutes;
  } catch (error) {
    console.error('Error getting cache age:', error);
    return null;
  }
};
