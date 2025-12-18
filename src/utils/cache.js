// Simple in-memory cache for API calls
class APICache {
  constructor(defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  generateKey(url, options = {}) {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a singleton instance
export const apiCache = new APICache();

// Cache configuration for different types of requests
export const CACHE_CONFIG = {
  DOMAINS: 2 * 60 * 1000, // 2 minutes
  CAMPAIGNS: 5 * 60 * 1000, // 5 minutes
  CAMPAIGN_DETAILS: 10 * 60 * 1000, // 10 minutes
  DEFAULT: 5 * 60 * 1000, // 5 minutes
};

// Enhanced fetch with caching
export const cachedFetch = async (
  url,
  options = {},
  cacheTTL = CACHE_CONFIG.DEFAULT
) => {
  const method = options.method || "GET";

  // Only cache GET requests
  if (method !== "GET") {
    return fetch(url, options);
  }

  const cacheKey = apiCache.generateKey(url, options);

  // Try to get from cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return {
      ok: true,
      json: () => Promise.resolve(cachedData),
      status: 200,
      fromCache: true,
    };
  }

  // If not in cache, make the request
  try {
    const response = await fetch(url, options);

    if (response.ok) {
      const data = await response.json();
      // Cache the successful response
      apiCache.set(cacheKey, data, cacheTTL);

      // Return response with cached data
      return {
        ok: true,
        json: () => Promise.resolve(data),
        status: response.status,
        fromCache: false,
      };
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

// Utility to invalidate cache entries
export const invalidateCache = {
  domains: () => {
    for (const [key] of apiCache.cache.entries()) {
      if (key.includes("api/v1") && !key.includes("campaigns")) {
        apiCache.delete(key);
      }
    }
  },

  campaigns: () => {
    for (const [key] of apiCache.cache.entries()) {
      if (key.includes("campaigns")) {
        apiCache.delete(key);
      }
    }
  },

  all: () => {
    apiCache.clear();
  },
};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  apiCache.cleanup();
}, 5 * 60 * 1000);
























