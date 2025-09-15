// hook.js — executes in the page context
(function() {
  'use strict';
  
  if (location.pathname !== '/library') return;

  const TARGET = '/i/library/entitlements/search';
  
  // Fonction de logging (dans le contexte de la page)
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [HOOK-${level}] ${message}`;
    console.log(logMessage, data || '');
  }

  const post = (results) => {
    if (!results || !results.length) {
      log('WARN', 'No results to post');
      return;
    }
    
    log('INFO', 'Posting entitlements to content script', { count: results.length });
    window.postMessage({ type: 'FAB_ENTITLEMENTS_RESULTS', results }, '*');
  };
  
  log('INFO', 'Hook script initialized', { target: TARGET });

  // fetch patch
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    const resp = await origFetch(input, init);
    
    try {
      const url = typeof input === 'string' ? input : (input?.url || '');
      log('DEBUG', 'Fetch request', { url, status: resp.status });
      
      if (resp.ok && url.includes(TARGET) && resp.headers.get('content-type')?.includes('application/json')) {
        log('INFO', 'Target URL detected in fetch', { url });
        
        const clone = resp.clone();
        const json = await clone.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        
        log('INFO', 'Extracted results from fetch', { count: results.length });
        post(results);
      }
    } catch (error) {
      log('ERROR', 'Error processing fetch response', { error: error.message, url });
    }
    
    return resp;
  };

  // XHR patch
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__fab_url = url;
    this.__fab_method = method;
    log('DEBUG', 'XHR open', { method, url });
    return origOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        const url = String(this.__fab_url || '');
        const method = this.__fab_method || 'GET';
        
        log('DEBUG', 'XHR load', { method, url, status: this.status });
        
        if (this.status >= 200 && this.status < 300 && url.includes(TARGET)) {
          log('INFO', 'Target URL detected in XHR', { url });
          
          const ct = this.getResponseHeader('content-type') || '';
          if (ct.includes('application/json')) {
            const json = JSON.parse(this.responseText);
            const results = Array.isArray(json?.results) ? json.results : [];
            
            log('INFO', 'Extracted results from XHR', { count: results.length });
            post(results);
          } else {
            log('WARN', 'XHR response not JSON', { contentType: ct });
          }
        }
      } catch (error) {
        log('ERROR', 'Error processing XHR response', { error: error.message, url: this.__fab_url });
      }
    });
    
    this.addEventListener('error', function() {
      log('ERROR', 'XHR error', { url: this.__fab_url, status: this.status });
    });
    
    return origSend.apply(this, arguments);
  };
  
  log('INFO', 'Hook patches applied successfully');
})();

