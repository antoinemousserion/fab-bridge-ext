// sw.js — MV3 service worker (module)
const DB_NAME = 'fab-bridge';
const DB_VERSION = 1;
const STORE = 'entitlements';

let _db;

// Fonction de logging centralisée
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [SW-${level}] ${message}`;
  console.log(logMessage, data || '');
  
  // Stocker les logs récents (max 100 entrées) dans chrome.storage.local
  try {
    chrome.storage.local.get(['fab-bridge-logs'], (result) => {
      const logs = result['fab-bridge-logs'] || [];
      logs.push({ timestamp, level, message, data });
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      chrome.storage.local.set({ 'fab-bridge-logs': logs });
    });
  } catch (e) {
    console.error('Failed to store log:', e);
  }
}
function openDB() {
  if (_db) return Promise.resolve(_db);
  
  log('INFO', 'Opening IndexedDB', { dbName: DB_NAME, version: DB_VERSION });
  
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (event) => {
      log('INFO', 'Database upgrade needed', { oldVersion: event.oldVersion, newVersion: event.newVersion });
      const db = req.result;
      
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'uid' });
        log('INFO', 'Created entitlements store');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
        log('INFO', 'Created meta store');
      }
    };
    
    req.onsuccess = () => { 
      _db = req.result; 
      log('INFO', 'Database opened successfully');
      resolve(_db); 
    };
    
    req.onerror = () => {
      log('ERROR', 'Failed to open database', { error: req.error?.message });
      reject(req.error);
    };
  });
}

async function putMany(items) {
  if (!Array.isArray(items) || items.length === 0) {
    log('WARN', 'putMany called with invalid items', { items });
    return 0;
  }
  
  log('INFO', 'Saving entitlements to database', { count: items.length });
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    const st = tx.objectStore(STORE);
    
    let savedCount = 0;
    let errorCount = 0;
    
    items.forEach((item, index) => {
      try {
        // Ajouter un timestamp si pas présent
        if (!item.savedAt) {
          item.savedAt = new Date().toISOString();
        }
        st.put(item);
        savedCount++;
      } catch (error) {
        log('ERROR', `Failed to save item ${index}`, { error: error.message, item });
        errorCount++;
      }
    });
    
    tx.oncomplete = () => {
      log('INFO', 'Entitlements saved successfully', { saved: savedCount, errors: errorCount });
      resolve(savedCount);
    };
    
    tx.onerror = () => {
      log('ERROR', 'Transaction failed', { error: tx.error?.message });
      reject(tx.error);
    };
  });
}

async function getAll() {
  log('INFO', 'Retrieving all entitlements from database');
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readonly');
    const st = tx.objectStore(STORE);
    const res = [];
    const req = st.openCursor();
    
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { 
        res.push(cursor.value); 
        cursor.continue(); 
      } else {
        log('INFO', 'Retrieved entitlements from database', { count: res.length });
        resolve(res);
      }
    };
    
    req.onerror = () => {
      log('ERROR', 'Failed to retrieve entitlements', { error: req.error?.message });
      reject(req.error);
    };
  });
}

async function clearAll() {
  log('INFO', 'Clearing all entitlements from database');
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    const st = tx.objectStore(STORE);
    const req = st.clear();
    
    req.onsuccess = () => {
      log('INFO', 'All entitlements cleared successfully');
      resolve(true);
    };
    
    req.onerror = () => {
      log('ERROR', 'Failed to clear entitlements', { error: req.error?.message });
      reject(req.error);
    };
  });
}

// Notifier les popups ouverts des mises à jour
async function notifyUpdate(type, data) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type, ...data });
      } catch (e) {
        // Ignorer les erreurs (onglet fermé, pas de content script, etc.)
      }
    }
  } catch (e) {
    log('ERROR', 'Failed to notify tabs', { error: e.message });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log('INFO', 'Received message', { type: msg?.type, sender: sender?.tab?.url });
  
  (async () => {
    try {
      if (msg?.type === 'SAVE_ENTITLEMENTS') {
        const items = Array.isArray(msg.items) ? msg.items : [];
        if (items.length === 0) {
          log('WARN', 'No items to save');
          sendResponse({ ok: true, saved: 0 });
          return;
        }
        
        const count = await putMany(items);
        
        // Notifier les popups de la mise à jour
        await notifyUpdate('ENTITLEMENTS_UPDATED', { count });
        
        sendResponse({ ok: true, saved: count });
        
      } else if (msg?.type === 'GET_ENTITLEMENTS') {
        const data = await getAll();
        sendResponse({ ok: true, data });
        
      } else if (msg?.type === 'CLEAR_ENTITLEMENTS') {
        await clearAll();
        
        // Notifier les popups de la suppression
        await notifyUpdate('ENTITLEMENTS_CLEARED');
        
        sendResponse({ ok: true });
        
      } else if (msg?.type === 'PING') {
        sendResponse({ ok: true, timestamp: Date.now() });
        
      } else if (msg?.type === 'LOG') {
        // Logs depuis les content scripts ou popup
        log(msg.level || 'INFO', msg.message, msg.data ? JSON.parse(msg.data) : null);
        sendResponse({ ok: true });
        
      } else if (msg?.type === 'GET_LOGS') {
        // Récupérer les logs pour le debugging
        chrome.storage.local.get(['fab-bridge-logs'], (result) => {
          const logs = result['fab-bridge-logs'] || [];
          sendResponse({ ok: true, logs });
        });
        return true; // async response
        
      } else if (msg?.type === 'CLEAR_LOGS') {
        // Vider les logs
        chrome.storage.local.remove(['fab-bridge-logs'], () => {
          sendResponse({ ok: true });
        });
        return true; // async response
        
      } else {
        log('WARN', 'Unknown message type', { type: msg?.type });
        sendResponse({ ok: false, error: 'unknown_message_type' });
      }
    } catch (error) {
      log('ERROR', 'Message handler error', { error: error.message, type: msg?.type });
      sendResponse({ ok: false, error: String(error) });
    }
  })().catch(err => {
    log('ERROR', 'Unhandled message error', { error: err.message });
    sendResponse({ ok: false, error: String(err) });
  });
  
  return true; // keep channel open for async
});

// Initialisation du service worker
log('INFO', 'Service worker started');
