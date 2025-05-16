(async () => {
  const CACHE_TTL = 60 * 1000;
  const issuerEl = document.getElementById('issuer');
  const validEl  = document.getElementById('valid');
  const typeEl   = document.getElementById('type');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.[0]?.url) throw new Error('No active tab');

    const urlObj = new URL(tabs[0].url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Unsupported protocol');
    }

    const domain   = urlObj.hostname;
    const cacheKey = `sslcache_${domain}`;

    const stored = await chrome.storage.local.get(cacheKey);
    let data;
    if (stored[cacheKey] && Date.now() - stored[cacheKey].fetchedAt < CACHE_TTL) {
      data = stored[cacheKey].data;
    } else {
      const res  = await fetch(
        `https://getssl.pro/sslcheck-api?domain=${encodeURIComponent(domain)}`,
        { headers: { 'X-API-Key': '__API_KEY__' } }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      data = json;
      await chrome.storage.local.set({ [cacheKey]: { fetchedAt: Date.now(), data } });
    }

    issuerEl.textContent = data.issuer;
    validEl .textContent = `${data.valid_from} ～ ${data.valid_to}`;
    typeEl  .textContent = data.type;

  } catch (e) {
    console.error('popup error:', e);
    issuerEl.textContent = 'ERR';
    validEl .textContent = '-';
    typeEl  .textContent = '-';
  }
})();
