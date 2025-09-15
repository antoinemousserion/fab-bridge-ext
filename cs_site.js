// cs_site.js — UI on https://*.step-on.dev/*
(function() {
  'use strict';
  
  // Fonction de logging
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CS-SITE-${level}] ${message}`;
    console.log(logMessage, data || '');
    
    // Envoyer au service worker pour logging centralisé
    chrome.runtime.sendMessage({
      type: 'LOG',
      level,
      message,
      data: data ? JSON.stringify(data) : null
    }).catch(() => {}); // Ignorer les erreurs de logging
  }
  
  log('INFO', 'Site content script initialized', { url: location.href });
  
  const btn = document.createElement('button');
  btn.textContent = 'Fab Library';
  btn.id = 'fab-bridge-btn';
  Object.assign(btn.style, {
    position: 'fixed', right: '16px', bottom: '16px',
    zIndex: 2147483647, padding: '10px 12px', cursor: 'pointer',
    borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: '13px', fontWeight: '500'
  });
  document.documentElement.appendChild(btn);

  btn.addEventListener('click', async () => {
    log('INFO', 'Fab Library button clicked');
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        const errorMsg = response?.error || 'Erreur de communication';
        log('ERROR', 'Failed to get entitlements', { error: errorMsg });
        alert('Fab Bridge error: ' + errorMsg);
        return;
      }
      
      const data = Array.isArray(response.data) ? response.data : [];
      log('INFO', 'Retrieved entitlements', { count: data.length });
      renderPanel(data);
      
    } catch (error) {
      log('ERROR', 'Error getting entitlements', { error: error.message });
      alert('Fab Bridge error: ' + error.message);
    }
  });

  function renderPanel(items) {
    log('INFO', 'Rendering panel', { itemCount: items.length });
    
    // Supprimer l'ancien panel s'il existe
    const existingPanel = document.getElementById('fab-bridge-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    const wrap = document.createElement('div');
    wrap.id = 'fab-bridge-panel';
    Object.assign(wrap.style, {
      position: 'fixed', right: '16px', bottom: '60px', width: '520px',
      maxHeight: '70vh', overflow: 'auto', background: '#0b0b0b', color: '#eaeaea',
      padding: '12px', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,.45)',
      zIndex: 2147483647, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial', fontSize: '13px'
    });
    wrap.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div><strong>Fab entitlements</strong> <span style="opacity:.7">(${items.length})</span></div>
        <div style="display:flex; gap:8px;">
          <button id="fab-export" style="padding:4px 8px; background:#3b82f6; border:1px solid #3b82f6; color:#fff; border-radius:4px; cursor:pointer;">Export JSON</button>
          <button id="fab-clear" style="padding:4px 8px; background:#dc2626; border:1px solid #dc2626; color:#fff; border-radius:4px; cursor:pointer;">Clear</button>
          <button id="fab-close" style="padding:4px 8px; background:#444; border:1px solid #444; color:#fff; border-radius:4px; cursor:pointer;">Close</button>
        </div>
      </div>
      <div id="fab-list"></div>
    `;
    const list = wrap.querySelector('#fab-list');

    items.forEach(it => {
      // Display a compact card using fields available in sample schema
      const uid = it.uid || it.id || '';
      const title = it.listing?.title || it.title || '(no title)';
      const price = it.listing?.startingPrice?.price ?? it.startingPrice?.price ?? '';
      const currency = it.listing?.startingPrice?.currencyCode ?? it.startingPrice?.currencyCode ?? '';
      const createdAt = it.createdAt || '';
      const seller = it.listing?.user?.sellerName || '';

      const card = document.createElement('div');
      card.style.cssText = 'border-top:1px solid #222; padding:8px 0; display:flex; gap:8px; align-items:center;';

      // thumbnail if present
      let thumbUrl = null;
      const thumbs = it.listing?.thumbnails?.[0]?.images;
      if (Array.isArray(thumbs) && thumbs.length) thumbUrl = thumbs[0].url;
      if (thumbUrl) {
        const img = document.createElement('img');
        img.src = thumbUrl;
        img.width = 64; img.height = 36;
        img.style.objectFit = 'cover'; img.loading = 'lazy';
        card.appendChild(img);
      }

      const meta = document.createElement('div');
      meta.style.flex = '1 1 auto';
      meta.innerHTML = `
        <div style="display:flex; gap:6px; align-items:center; justify-content:space-between;">
          <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:360px;"><strong>${title}</strong></div>
          <div style="opacity:.8">${price ? (price + ' ' + currency) : ''}</div>
        </div>
        <div style="opacity:.7; font-size:12px">uid: ${uid}${seller ? ' • ' + seller : ''}${createdAt ? ' • ' + createdAt : ''}</div>
      `;
      card.appendChild(meta);
      list.appendChild(card);
    });

    document.documentElement.appendChild(wrap);
    
    // Gestion des événements
    wrap.querySelector('#fab-close').onclick = () => {
      log('INFO', 'Panel closed');
      wrap.remove();
    };
    
    wrap.querySelector('#fab-export').onclick = () => {
      exportToJSON(items);
    };
    
    wrap.querySelector('#fab-clear').onclick = async () => {
      if (!confirm('Êtes-vous sûr de vouloir vider toutes les données capturées ?')) {
        return;
      }
      
      log('INFO', 'Clearing entitlements');
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ENTITLEMENTS' });
        
        if (response && response.ok) {
          log('INFO', 'Entitlements cleared successfully');
          wrap.remove();
          alert('Fab Bridge: données supprimées');
        } else {
          log('ERROR', 'Failed to clear entitlements', { error: response?.error });
          alert('Fab Bridge error: ' + (response?.error || 'Erreur inconnue'));
        }
      } catch (error) {
        log('ERROR', 'Error clearing entitlements', { error: error.message });
        alert('Fab Bridge error: ' + error.message);
      }
    };
  }
  
  // Fonction d'export JSON
  function exportToJSON(items) {
    log('INFO', 'Exporting data to JSON', { itemCount: items.length });
    
    try {
      // Créer l'objet d'export avec métadonnées
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          source: 'Fab Bridge Extension',
          itemCount: items.length
        },
        entitlements: items
      };
      
      // Convertir en JSON formaté
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Créer un blob et télécharger
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement temporaire
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `fab-entitlements-${new Date().toISOString().split('T')[0]}.json`;
      
      // Déclencher le téléchargement
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Nettoyer l'URL
      URL.revokeObjectURL(url);
      
      log('INFO', 'JSON export completed successfully');
      
      // Afficher une notification de succès
      showNotification('Export JSON réussi !', 'success');
      
    } catch (error) {
      log('ERROR', 'Failed to export JSON', { error: error.message });
      showNotification('Erreur lors de l\'export JSON: ' + error.message, 'error');
    }
  }
  
  // Fonction pour afficher des notifications
  function showNotification(message, type = 'info') {
    // Supprimer l'ancienne notification si elle existe
    const existingNotification = document.getElementById('fab-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'fab-notification';
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#1a4d1a' : type === 'error' ? '#4d1a1a' : '#1a1a1a';
    const textColor = type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#eaeaea';
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: bgColor,
      color: textColor,
      padding: '12px 16px',
      borderRadius: '6px',
      border: `1px solid ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#444'}`,
      zIndex: '2147483648',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '13px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });
    
    document.body.appendChild(notification);
    
    // Supprimer la notification après 3 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
  
  log('INFO', 'Site content script setup complete');
})();
