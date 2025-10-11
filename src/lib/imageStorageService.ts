
'use client';

const DB_NAME = 'ContentForgeAvatarDB';
const STORE_NAME = 'avatars';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("IndexedDB can only be used in the browser."));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(new Error('Failed to open IndexedDB.'));
      dbPromise = null; 
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

export async function saveAvatarToDb(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await getDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ id, dataUrl });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to save avatar to IndexedDB:", error);
    // Gracefully fail - the app can continue without avatars if IndexedDB fails
  }
}

export async function getAvatarFromDb(id: string): Promise<string | null> {
  try {
    const db = await getDb();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.dataUrl : null);
      };
      request.onerror = () => {
        console.error("Failed to get avatar from IndexedDB:", request.error);
        resolve(null); // Resolve with null on error to not break the UI
      };
    });
  } catch (error) {
    console.error("Failed to initialize DB for getting avatar:", error);
    return null;
  }
}

export async function removeAvatarFromDb(id: string): Promise<void> {
  try {
    const db = await getDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
     return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error("Failed to delete avatar from IndexedDB:", transaction.error);
        resolve(); // Still resolve to not block deletion flow
      };
    });
  } catch (error) {
     console.error("Failed to initialize DB for removing avatar:", error);
  }
}
