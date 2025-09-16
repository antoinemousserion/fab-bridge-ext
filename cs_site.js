// cs_site.js — UI on https://*.step-on.dev/*
(function() {
  'use strict';
  
  
  
  // Fonction pour afficher l'image en popup
  function showImagePopup(imageUrl) {
    // Supprimer l'ancien popup s'il existe
    const existingPopup = document.getElementById('fab-image-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.id = 'fab-image-popup';
    Object.assign(popup.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '2147483648',
      cursor: 'pointer'
    });
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;
    
    popup.appendChild(img);
    document.body.appendChild(popup);
    
    // Fermer le popup au clic
    popup.addEventListener('click', () => {
      popup.remove();
    });
    
    // Empêcher la propagation du clic sur l'image
    img.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Fermer avec Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        popup.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }
  
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
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        const errorMsg = response?.error || 'Erreur de communication';
        alert('Fab Bridge error: ' + errorMsg);
        return;
      }
      
      const data = Array.isArray(response.data) ? response.data : [];
      renderPanel(data);
      
    } catch (error) {
      alert('Fab Bridge error: ' + error.message);
    }
  });

  function renderPanel(items) {
    
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
    
    // Ajouter des styles CSS personnalisés pour la scrollbar
    const style = document.createElement('style');
    style.setAttribute('data-fab-bridge', 'true');
    style.textContent = `
      #fab-bridge-panel::-webkit-scrollbar {
        width: 8px;
      }
      #fab-bridge-panel::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
      }
      #fab-bridge-panel::-webkit-scrollbar-thumb {
        background: #404040;
        border-radius: 4px;
        border: 1px solid #2a2a2a;
      }
      #fab-bridge-panel::-webkit-scrollbar-thumb:hover {
        background: #525252;
      }
      #fab-bridge-panel::-webkit-scrollbar-corner {
        background: #1a1a1a;
      }
    `;
    document.head.appendChild(style);
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
      const uid = it.listing.uid || it.id || '';
      const title = it.listing?.title || it.title || '(no title)';
      const createdAt = it.createdAt || '';
      const seller = it.listing?.user?.sellerName || '';

      const card = document.createElement('div');
      card.style.cssText = 'border-top:1px solid #222; padding:8px 0; display:flex; gap:8px; align-items:center;';

      // thumbnail if present - sélectionner l'image avec la plus grande taille
      let thumbUrl = null;
      const thumbs = it.listing?.thumbnails?.[0]?.images;
      if (Array.isArray(thumbs) && thumbs.length) {
        // Trier par taille décroissante et prendre la première (plus grande)
        const sortedThumbs = thumbs.sort((a, b) => (b.size || 0) - (a.size || 0));
        thumbUrl = sortedThumbs[0].url;
      }
      if (thumbUrl) {
        const img = document.createElement('img');
        img.src = thumbUrl;
        img.width = 80; img.height = 60;
        img.style.objectFit = 'cover'; 
        img.style.borderRadius = '6px';
        img.style.cursor = 'pointer';
        img.loading = 'lazy';
        
        // Ajouter l'événement de clic pour ouvrir le popup
        img.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showImagePopup(thumbUrl);
        });
        
        card.appendChild(img);
      }

      // Formater la date en dd/mm/yyyy
      let formattedDate = '';
      if (createdAt) {
        try {
          const date = new Date(createdAt);
          formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (e) {
          formattedDate = createdAt; // Fallback si la date ne peut pas être parsée
        }
      }

      const meta = document.createElement('div');
      meta.style.flex = '1 1 auto';
      
      // Construire l'URL Fab.com avec l'UID
      const fabUrl = `https://www.fab.com/listings/${uid}`;
      
      meta.innerHTML = `
        <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:360px;">
          <a href="${fabUrl}" target="_blank" rel="noopener noreferrer" 
             style="color: #eaeaea; text-decoration: none; font-weight: bold; transition: color 0.2s ease;"
             onmouseover="this.style.color='#3b82f6'" 
             onmouseout="this.style.color='#eaeaea'">
            ${title}
          </a>
        </div>
        <div style="opacity:.6; font-size:11px; margin-top:2px;">${uid}</div>
        ${seller ? `<div style="opacity:.7; font-size:12px; margin-top:2px;">by ${seller}</div>` : ''}
        ${formattedDate ? `<div style="opacity:.7; font-size:12px; margin-top:2px;">${formattedDate}</div>` : ''}
      `;
      card.appendChild(meta);
      list.appendChild(card);
    });

    document.documentElement.appendChild(wrap);
    
    // Gestion des événements
    wrap.querySelector('#fab-close').onclick = () => {
      wrap.remove();
      // Nettoyer les styles CSS
      const existingStyle = document.querySelector('style[data-fab-bridge]');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
    
    wrap.querySelector('#fab-export').onclick = () => {
      exportToJSON(items);
    };
    
    wrap.querySelector('#fab-clear').onclick = async () => {
      if (!confirm('Êtes-vous sûr de vouloir vider toutes les données capturées ?')) {
        return;
      }
      
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ENTITLEMENTS' });
        
        if (response && response.ok) {
          wrap.remove();
          alert('Fab Bridge: données supprimées');
        } else {
          alert('Fab Bridge error: ' + (response?.error || 'Erreur inconnue'));
        }
      } catch (error) {
        alert('Fab Bridge error: ' + error.message);
      }
    };
  }
  
  // Fonction d'export JSON
  function exportToJSON(items) {
    
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
      
      
      // Afficher une notification de succès
      showNotification('Export JSON réussi !', 'success');
      
    } catch (error) {
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
  
})();
