// popup.js — Interface popup de l'extension
(function() {
  'use strict';
  
  // Éléments DOM
  const elements = {
    status: document.getElementById('status'),
    totalItems: document.getElementById('totalItems'),
    lastUpdate: document.getElementById('lastUpdate'),
    refreshBtn: document.getElementById('refreshBtn'),
    viewAllBtn: document.getElementById('viewAllBtn'),
    exportBtn: document.getElementById('exportBtn'),
    copyBtn: document.getElementById('copyBtn'),
    clearBtn: document.getElementById('clearBtn'),
    loading: document.getElementById('loading'),
    errorContainer: document.getElementById('errorContainer'),
    recentItems: document.getElementById('recentItems'),
    emptyState: document.getElementById('emptyState'),
  };
  
  // État de l'application
  let currentData = [];
  let isLoading = false;
  
  
  // Afficher une erreur
  function showError(message) {
    elements.errorContainer.innerHTML = `
      <div class="error">
        <strong>Erreur:</strong> ${message}
      </div>
    `;
  }
  
  // Masquer les erreurs
  function hideError() {
    elements.errorContainer.innerHTML = '';
  }
  
  // Afficher le loading
  function showLoading() {
    isLoading = true;
    elements.loading.style.display = 'block';
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.textContent = 'Chargement...';
  }
  
  // Masquer le loading
  function hideLoading() {
    isLoading = false;
    elements.loading.style.display = 'none';
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.textContent = 'Actualiser';
  }
  
  // Mettre à jour le statut de connexion
  function updateStatus(connected) {
    if (connected) {
      elements.status.textContent = 'Connecté';
      elements.status.className = 'status connected';
    } else {
      elements.status.textContent = 'Déconnecté';
      elements.status.className = 'status disconnected';
    }
  }
  
  // Formater la date
  function formatDate(dateString) {
    if (!dateString) return 'Jamais';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return 'À l\'instant';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'Inconnu';
    }
  }
  
  // Rendre un élément
  function renderItem(item) {
    const uid = item.uid || item.id || 'N/A';
    const title = item.listing?.title || item.title || 'Sans titre';
    const price = item.listing?.startingPrice?.price ?? item.startingPrice?.price ?? '';
    const currency = item.listing?.startingPrice?.currencyCode ?? item.startingPrice?.currencyCode ?? '';
    const createdAt = item.createdAt || '';
    
    return `
      <div class="item">
        <div class="item-title">${title}</div>
        <div class="item-meta">
          UID: ${uid}${price ? ` • ${price} ${currency}` : ''}${createdAt ? ` • ${formatDate(createdAt)}` : ''}
        </div>
      </div>
    `;
  }
  
  // Mettre à jour l'affichage des données
  function updateDisplay(data) {
    currentData = data || [];
    
    // Mettre à jour les statistiques
    elements.totalItems.textContent = currentData.length;
    
    // Trouver la date de création la plus récente
    const lastCreated = currentData
      .map(item => item.createdAt)
      .filter(Boolean)
      .sort()
      .pop();
    elements.lastUpdate.textContent = formatDate(lastCreated);
    
    // Mettre à jour la liste des éléments récents (max 5)
    const recentItems = currentData.slice(0, 5);
    const itemsHtml = recentItems.map(renderItem).join('');
    
    if (recentItems.length === 0) {
      elements.emptyState.style.display = 'block';
      elements.recentItems.querySelector('.recent-title').style.display = 'none';
    } else {
      elements.emptyState.style.display = 'none';
      elements.recentItems.querySelector('.recent-title').style.display = 'block';
      elements.recentItems.querySelector('.recent-title').textContent = 
        `Éléments récents (${recentItems.length}${currentData.length > 5 ? ` sur ${currentData.length}` : ''})`;
    }
    
    // Remplacer le contenu de la liste
    const listContainer = elements.recentItems;
    const existingItems = listContainer.querySelectorAll('.item');
    existingItems.forEach(item => item.remove());
    
    if (itemsHtml) {
      listContainer.insertAdjacentHTML('beforeend', itemsHtml);
    }
    
  }
  
  // Charger les données depuis le service worker
  async function loadData() {
    if (isLoading) return;
    
    showLoading();
    hideError();
    
    try {
      
      const response = await chrome.runtime.sendMessage({ type: 'GET_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        throw new Error(response?.error || 'Erreur de communication avec le service worker');
      }
      
      updateStatus(true);
      updateDisplay(response.data);
      
      
    } catch (error) {
      updateStatus(false);
      showError(`Impossible de charger les données: ${error.message}`);
      updateDisplay([]);
    } finally {
      hideLoading();
    }
  }
  
  // Vider toutes les données
  async function clearData() {
    if (isLoading) return;
    
    if (!confirm('Êtes-vous sûr de vouloir vider toutes les données capturées ?')) {
      return;
    }
    
    showLoading();
    hideError();
    
    try {
      
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        throw new Error(response?.error || 'Erreur lors de la suppression');
      }
      
      updateDisplay([]);
      
    } catch (error) {
      showError(`Impossible de vider les données: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  // Ouvrir step-on.dev dans un nouvel onglet
  function openStepOn() {
    chrome.tabs.create({ url: 'https://step-on.dev' });
  }
  
  // Exporter les données en JSON
  function exportToJSON() {
    if (currentData.length === 0) {
      showError('Aucune donnée à exporter');
      return;
    }
    
    
    try {
      // Créer l'objet d'export avec métadonnées
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          source: 'Fab Bridge Extension',
          itemCount: currentData.length
        },
        entitlements: currentData
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
      
      hideError();
      
    } catch (error) {
      showError('Erreur lors de l\'export JSON: ' + error.message);
    }
  }
  
  // Copier les données JSON dans le presse-papier
  async function copyToClipboard() {
    if (currentData.length === 0) {
      showError('Aucune donnée à copier');
      return;
    }
    
    try {
      // Créer l'objet d'export avec métadonnées
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          source: 'Fab Bridge Extension',
          itemCount: currentData.length
        },
        entitlements: currentData
      };
      
      // Convertir en JSON formaté
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Copier dans le presse-papier
      await navigator.clipboard.writeText(jsonString);
      
      // Afficher un message de succès temporaire
      const originalText = elements.copyBtn.textContent;
      elements.copyBtn.textContent = 'Copié !';
      elements.copyBtn.style.background = '#1a4d1a';
      elements.copyBtn.style.borderColor = '#4ade80';
      
      setTimeout(() => {
        elements.copyBtn.textContent = originalText;
        elements.copyBtn.style.background = '';
        elements.copyBtn.style.borderColor = '';
      }, 2000);
      
      hideError();
      
    } catch (error) {
      showError('Erreur lors de la copie: ' + error.message);
    }
  }
  
  
  
  
  
  // Vérifier la connexion au service worker
  async function checkConnection() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PING' });
      updateStatus(response && response.ok);
    } catch (error) {
      updateStatus(false);
    }
  }
  
  // Écouter les messages du service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ENTITLEMENTS_UPDATED') {
      loadData(); // Recharger les données
    }
  });
  
  // Événements
  elements.refreshBtn.addEventListener('click', loadData);
  elements.clearBtn.addEventListener('click', clearData);
  elements.viewAllBtn.addEventListener('click', openStepOn);
  elements.exportBtn.addEventListener('click', exportToJSON);
  elements.copyBtn.addEventListener('click', copyToClipboard);
  
  // Initialisation
  checkConnection();
  loadData();
  
  // Recharger les données toutes les 30 secondes
  setInterval(() => {
    if (!isLoading) {
      loadData();
    }
  }, 30000);
  
})();
