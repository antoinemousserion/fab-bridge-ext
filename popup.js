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
    clearBtn: document.getElementById('clearBtn'),
    loading: document.getElementById('loading'),
    errorContainer: document.getElementById('errorContainer'),
    recentItems: document.getElementById('recentItems'),
    emptyState: document.getElementById('emptyState'),
    debugBtn: document.getElementById('debugBtn'),
    debugPanel: document.getElementById('debugPanel'),
    logsContainer: document.getElementById('logsContainer'),
    clearLogsBtn: document.getElementById('clearLogsBtn')
  };
  
  // État de l'application
  let currentData = [];
  let isLoading = false;
  
  // Fonction de logging
  function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage, data || '');
    
    // Envoyer au service worker pour logging centralisé
    chrome.runtime.sendMessage({
      type: 'LOG',
      level,
      message,
      data: data ? JSON.stringify(data) : null
    }).catch(() => {}); // Ignorer les erreurs de logging
  }
  
  // Afficher une erreur
  function showError(message) {
    elements.errorContainer.innerHTML = `
      <div class="error">
        <strong>Erreur:</strong> ${message}
      </div>
    `;
    log('ERROR', 'Popup error', { message });
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
    
    log('INFO', 'Display updated', { itemCount: currentData.length });
  }
  
  // Charger les données depuis le service worker
  async function loadData() {
    if (isLoading) return;
    
    showLoading();
    hideError();
    
    try {
      log('INFO', 'Loading data from service worker');
      
      const response = await chrome.runtime.sendMessage({ type: 'GET_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        throw new Error(response?.error || 'Erreur de communication avec le service worker');
      }
      
      updateStatus(true);
      updateDisplay(response.data);
      
      log('INFO', 'Data loaded successfully', { count: response.data?.length || 0 });
      
    } catch (error) {
      log('ERROR', 'Failed to load data', { error: error.message });
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
      log('INFO', 'Clearing all data');
      
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ENTITLEMENTS' });
      
      if (!response || !response.ok) {
        throw new Error(response?.error || 'Erreur lors de la suppression');
      }
      
      updateDisplay([]);
      log('INFO', 'Data cleared successfully');
      
    } catch (error) {
      log('ERROR', 'Failed to clear data', { error: error.message });
      showError(`Impossible de vider les données: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  // Ouvrir step-on.dev dans un nouvel onglet
  function openStepOn() {
    log('INFO', 'Opening step-on.dev');
    chrome.tabs.create({ url: 'https://step-on.dev' });
  }
  
  // Exporter les données en JSON
  function exportToJSON() {
    if (currentData.length === 0) {
      showError('Aucune donnée à exporter');
      return;
    }
    
    log('INFO', 'Exporting data to JSON', { itemCount: currentData.length });
    
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
      
      log('INFO', 'JSON export completed successfully');
      hideError();
      
    } catch (error) {
      log('ERROR', 'Failed to export JSON', { error: error.message });
      showError('Erreur lors de l\'export JSON: ' + error.message);
    }
  }
  
  // Afficher/masquer le panel de debug
  function toggleDebugPanel() {
    const isVisible = elements.debugPanel.style.display !== 'none';
    elements.debugPanel.style.display = isVisible ? 'none' : 'block';
    elements.debugBtn.textContent = isVisible ? 'Debug Logs' : 'Masquer Logs';
    
    if (!isVisible) {
      loadDebugLogs();
    }
  }
  
  // Charger les logs de debug
  async function loadDebugLogs() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });
      
      if (response && response.ok) {
        const logs = response.logs || [];
        displayDebugLogs(logs);
      } else {
        elements.logsContainer.innerHTML = '<div style="color: #f87171;">Erreur lors du chargement des logs</div>';
      }
    } catch (error) {
      log('ERROR', 'Failed to load debug logs', { error: error.message });
      elements.logsContainer.innerHTML = '<div style="color: #f87171;">Erreur: ' + error.message + '</div>';
    }
  }
  
  // Afficher les logs de debug
  function displayDebugLogs(logs) {
    if (logs.length === 0) {
      elements.logsContainer.innerHTML = '<div style="color: #888;">Aucun log disponible</div>';
      return;
    }
    
    const logsHtml = logs
      .slice(-50) // Afficher les 50 derniers logs
      .map(log => {
        const level = log.level || 'INFO';
        const levelColor = {
          'ERROR': '#f87171',
          'WARN': '#fbbf24',
          'INFO': '#60a5fa',
          'DEBUG': '#a78bfa'
        }[level] || '#ccc';
        
        const time = new Date(log.timestamp).toLocaleTimeString('fr-FR');
        const data = log.data ? ' ' + JSON.stringify(log.data) : '';
        
        return `<div style="margin-bottom: 4px; border-left: 3px solid ${levelColor}; padding-left: 8px;">
          <span style="color: #888;">[${time}]</span>
          <span style="color: ${levelColor}; font-weight: bold;">[${level}]</span>
          <span style="color: #eaeaea;">${log.message}</span>
          <span style="color: #888;">${data}</span>
        </div>`;
      })
      .join('');
    
    elements.logsContainer.innerHTML = logsHtml;
    elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;
  }
  
  // Vider les logs de debug
  async function clearDebugLogs() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
      
      if (response && response.ok) {
        elements.logsContainer.innerHTML = '<div style="color: #4ade80;">Logs supprimés</div>';
        log('INFO', 'Debug logs cleared');
      } else {
        elements.logsContainer.innerHTML = '<div style="color: #f87171;">Erreur lors de la suppression</div>';
      }
    } catch (error) {
      log('ERROR', 'Failed to clear debug logs', { error: error.message });
      elements.logsContainer.innerHTML = '<div style="color: #f87171;">Erreur: ' + error.message + '</div>';
    }
  }
  
  // Vérifier la connexion au service worker
  async function checkConnection() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PING' });
      updateStatus(response && response.ok);
    } catch (error) {
      log('ERROR', 'Service worker connection failed', { error: error.message });
      updateStatus(false);
    }
  }
  
  // Écouter les messages du service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ENTITLEMENTS_UPDATED') {
      log('INFO', 'Received update notification', { count: message.count });
      loadData(); // Recharger les données
    }
  });
  
  // Événements
  elements.refreshBtn.addEventListener('click', loadData);
  elements.clearBtn.addEventListener('click', clearData);
  elements.viewAllBtn.addEventListener('click', openStepOn);
  elements.exportBtn.addEventListener('click', exportToJSON);
  elements.debugBtn.addEventListener('click', toggleDebugPanel);
  elements.clearLogsBtn.addEventListener('click', clearDebugLogs);
  
  // Initialisation
  log('INFO', 'Popup initialized');
  checkConnection();
  loadData();
  
  // Recharger les données toutes les 30 secondes
  setInterval(() => {
    if (!isLoading) {
      loadData();
    }
  }, 30000);
  
})();
