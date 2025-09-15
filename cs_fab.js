// cs_fab.js — runs only on https://*.fab.com/library*
(function init() {
  'use strict';
  
  // Fonction de logging
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CS-FAB-${level}] ${message}`;
    console.log(logMessage, data || '');
    
    // Envoyer au service worker pour logging centralisé
    chrome.runtime.sendMessage({
      type: 'LOG',
      level,
      message,
      data: data ? JSON.stringify(data) : null
    }).catch(() => {}); // Ignorer les erreurs de logging
  }
  
  log('INFO', 'Content script initialized', { url: location.href, pathname: location.pathname });
  
  if (location.pathname !== '/library') {
    log('INFO', 'Not on library page, skipping initialization');
    return;
  }

  log('INFO', 'On library page, injecting hook script');

  // Inject hook into the page context to patch fetch/XHR
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('hook.js');
  s.onerror = (error) => {
    log('ERROR', 'Failed to load hook script', { error: error.message });
  };
  
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => {
    log('INFO', 'Hook script loaded successfully');
    s.remove();
  };

  // Listen to results from page and forward to the service worker for storage
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const data = ev.data;
    
    if (!data || data.type !== 'FAB_ENTITLEMENTS_RESULTS') return;
    
    const items = Array.isArray(data.results) ? data.results : [];
    log('INFO', 'Received entitlements from page', { count: items.length });
    
    if (!items.length) {
      log('WARN', 'No items in results');
      return;
    }
    
    // Envoyer au service worker
    chrome.runtime.sendMessage({ type: 'SAVE_ENTITLEMENTS', items })
      .then(response => {
        if (response && response.ok) {
          log('INFO', 'Entitlements saved successfully', { saved: response.saved });
        } else {
          log('ERROR', 'Failed to save entitlements', { error: response?.error });
        }
      })
      .catch(error => {
        log('ERROR', 'Error sending entitlements to service worker', { error: error.message });
      });
  }, { passive: true });
  
  log('INFO', 'Content script setup complete');
})();
