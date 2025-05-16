const CACHE_TTL = 60 * 1000;

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateBadge();
});

function applyBadge(data) {
  const expiry = new Date(data.valid_to);
  const diffDays = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
  let text, color;

  if (diffDays < 0)      { text = '✖';   color = 'red'; }
  else if (diffDays < 7) { text = ''+diffDays; color = 'orange'; }
  else                   { text = ''+diffDays; color = 'green'; }

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function setErrorBadge() {
  chrome.action.setBadgeText({ text: 'ERR' });
  chrome.action.setBadgeBackgroundColor({ color: 'gray' });
}

async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.[0]?.url) {
      console.warn('DBG: No active tab or URL');
      return setErrorBadge();
    }

    const urlObj = new URL(tabs[0].url);
    console.log('DBG: Active tab URL:', tabs[0].url);

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.log('DBG: Unsupported protocol:', urlObj.protocol);
      return setErrorBadge();
    }

    const domain = urlObj.hostname;
    console.log('DBG: Checking domain:', domain);

    // ローカル環境スキップ
    const isLocalhost = domain === 'localhost';
    const isIP        = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
    if (isLocalhost || isIP) {
      // ローカルまたはIP直打ちは「L」で示す
      chrome.action.setBadgeText({ text: 'L' });
      chrome.action.setBadgeBackgroundColor({ color: 'blue' });
      return;
    }

    const cacheKey = `sslcache_${domain}`;

    // キャッシュ確認
    const stored = await chrome.storage.local.get(cacheKey);
    const record = stored[cacheKey];
    if (record && Date.now() - record.fetchedAt < CACHE_TTL) {
      console.log('DBG: Using cached data for', domain);
      applyBadge(record.data);
      return;
    }

    const apiUrl = `https://getssl.pro/sslcheck-api?domain=${encodeURIComponent(domain)}`;
    console.log('DBG: Fetching API URL:', apiUrl);

    const res  = await fetch(apiUrl, { headers: { 'X-API-Key': '__API_KEY__' } });
    const data = await res.json();
    console.log('DBG: Fetch status:', res.status, 'Response:', data);

    if (data.error) throw new Error(data.error);

    await chrome.storage.local.set({ [cacheKey]: { fetchedAt: Date.now(), data } });

    applyBadge(data);

  } catch (e) {
    console.error('updateBadge error:', e);
    setErrorBadge();
  }
}
