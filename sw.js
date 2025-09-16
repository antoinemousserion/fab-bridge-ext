// sw.js — MV3 service worker (module)
const DB_NAME = 'fab-bridge';
const DB_VERSION = 1;
const STORE = 'entitlements';

let _db;

function openDB() {
  if (_db) return Promise.resolve(_db);
  
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (event) => {
      const db = req.result;
      
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'uid' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    
    req.onsuccess = () => { 
      _db = req.result; 
      resolve(_db); 
    };
    
    req.onerror = () => {
      reject(req.error);
    };
  });
}

async function putMany(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
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
        errorCount++;
      }
    });
    
    tx.oncomplete = () => {
      resolve(savedCount);
    };
    
    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

async function getAll() {
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
        resolve(res);
      }
    };
    
    req.onerror = () => {
      reject(req.error);
    };
  });
}

async function clearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    const st = tx.objectStore(STORE);
    const req = st.clear();
    
    req.onsuccess = () => {
      resolve(true);
    };
    
    req.onerror = () => {
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
    // Ignorer les erreurs
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === 'SAVE_ENTITLEMENTS') {
        const items = Array.isArray(msg.items) ? msg.items : [];
        if (items.length === 0) {
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
        
      } else {
        sendResponse({ ok: false, error: 'unknown_message_type' });
      }
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  })().catch(err => {
    sendResponse({ ok: false, error: String(err) });
  });
  
  return true; // keep channel open for async
});

// Initialisation du service worker
