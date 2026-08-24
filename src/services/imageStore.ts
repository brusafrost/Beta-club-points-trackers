/**
 * IndexedDB media & verification slip repository.
 * Bypasses the 5MB browser LocalStorage limit by storing photo slips in IndexedDB,
 * which provides 50MB-2GB+ storage per origin.
 */

const DB_NAME = 'BetaClubProofDB';
const DB_VERSION = 1;
const STORE_NAME = 'proofs';

class ImageStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public async saveProofImage(id: string, base64Data: string): Promise<void> {
    if (!base64Data || !id) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(base64Data, id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to store proof in IndexedDB:', e);
    }
  }

  public async getProofImage(id: string): Promise<string | null> {
    if (!id) return null;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  public async deleteProofImage(id: string): Promise<void> {
    if (!id) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to delete proof from IndexedDB:', e);
    }
  }

  public async getStorageEstimate(): Promise<{ usageMB: string; quotaMB: string; percent: string }> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
        const pct = estimate.quota ? (((estimate.usage || 0) / estimate.quota) * 100).toFixed(1) : '0';
        return { usageMB: `${usageMB} MB`, quotaMB: `${quotaMB} MB`, percent: `${pct}%` };
      } catch {
        // Fallback
      }
    }
    return { usageMB: '< 1 MB', quotaMB: 'Unlimited (IndexedDB)', percent: '< 1%' };
  }
}

export const ProofImageStore = new ImageStore();
