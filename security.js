// Output and persistence guards shared by the browser app and security tests.
(function (global) {
  const fallbackCafeImage = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const safeCafeId = (value) => /^[a-z0-9-]+$/.test(String(value)) ? String(value) : '';

  const safeCafeImage = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'images.unsplash.com' ? url.href : fallbackCafeImage;
    } catch {
      return fallbackCafeImage;
    }
  };

  const validFavorites = (value, validIds) => Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && validIds.has(id)))]
    : [];

  const api = Object.freeze({ escapeHtml, safeCafeId, safeCafeImage, validFavorites });
  global.KoshiSecurity = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
