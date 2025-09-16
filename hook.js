// hook.js — executes in the page context
(function() {
  'use strict';
  
  if (location.pathname !== '/library') return;

  const TARGET = '/i/library/entitlements/search';
  

  const post = (results) => {
    if (!results || !results.length) {
      return;
    }
    
    window.postMessage({ type: 'FAB_ENTITLEMENTS_RESULTS', results }, '*');
  };
  

  // fetch patch
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    const resp = await origFetch(input, init);
    
    try {
      const url = typeof input === 'string' ? input : (input?.url || '');
      
      if (resp.ok && url.includes(TARGET) && resp.headers.get('content-type')?.includes('application/json')) {
        
        const clone = resp.clone();
        const json = await clone.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        
        post(results);
      }
    } catch (error) {
    }
    
    return resp;
  };

  // XHR patch
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__fab_url = url;
    this.__fab_method = method;
    return origOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        const url = String(this.__fab_url || '');
        const method = this.__fab_method || 'GET';
        
        
        if (this.status >= 200 && this.status < 300 && url.includes(TARGET)) {
          
          const ct = this.getResponseHeader('content-type') || '';
          if (ct.includes('application/json')) {
            const json = JSON.parse(this.responseText);
            const results = Array.isArray(json?.results) ? json.results : [];
            
            post(results);
          } else {
          }
        }
      } catch (error) {
      }
    });
    
    this.addEventListener('error', function() {
    });
    
    return origSend.apply(this, arguments);
  };
  
})();

