// cs_fab.js — runs only on https://*.fab.com/library*
(function init() {
  'use strict';
  
  
  
  if (location.pathname !== '/library') {
    return;
  }


  // Inject hook into the page context to patch fetch/XHR
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('hook.js');
  s.onerror = (error) => {
  };
  
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => {
    s.remove();
  };

  // Listen to results from page and forward to the service worker for storage
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const data = ev.data;
    
    if (!data || data.type !== 'FAB_ENTITLEMENTS_RESULTS') return;
    
    const items = Array.isArray(data.results) ? data.results : [];
    
    if (!items.length) {
      return;
    }
    
    // Envoyer au service worker
    chrome.runtime.sendMessage({ type: 'SAVE_ENTITLEMENTS', items })
      .then(response => {
        if (response && response.ok) {
        } else {
        }
      })
      .catch(error => {
      });
  }, { passive: true });
  
})();
