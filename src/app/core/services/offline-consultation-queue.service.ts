import { Injectable } from '@angular/core';
import { ConsultationRecordUpdateRequest } from './booking.service';

export interface ConsultationQueueEvent {
  id?: number;
  bookingId: string;
  createdAt: string;
  kind: 'draft' | 'complete';
  payload: ConsultationRecordUpdateRequest;
}

@Injectable({ providedIn: 'root' })
export class OfflineConsultationQueueService {
  private readonly dbName = 'clinic-consultation-queue';
  private readonly storeName = 'draft-events';
  private readonly dbPromise = this.openDb();

  async enqueue(event: ConsultationQueueEvent): Promise<void> {
    const db = await this.dbPromise;
    await this.request<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to write offline queue.'));
      tx.objectStore(this.storeName).add(event);
    });
  }

  async getLatest(bookingId: string): Promise<ConsultationQueueEvent | null> {
    const db = await this.dbPromise;
    return this.request<ConsultationQueueEvent | null>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const index = tx.objectStore(this.storeName).index('bookingId');
      const request = index.openCursor(IDBKeyRange.only(bookingId), 'prev');
      request.onerror = () => reject(request.error ?? new Error('Failed to read offline queue.'));
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? (cursor.value as ConsultationQueueEvent) : null);
      };
    });
  }

  async listPending(bookingId?: string): Promise<ConsultationQueueEvent[]> {
    const db = await this.dbPromise;
    return this.request<ConsultationQueueEvent[]>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const records: ConsultationQueueEvent[] = [];
      const request = bookingId ? store.index('bookingId').openCursor(IDBKeyRange.only(bookingId)) : store.openCursor();
      request.onerror = () => reject(request.error ?? new Error('Failed to read offline queue.'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(records);
          return;
        }

        records.push(cursor.value as ConsultationQueueEvent);
        cursor.continue();
      };
    });
  }

  async clear(bookingId?: string): Promise<void> {
    const db = await this.dbPromise;
    await this.request<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = bookingId ? store.index('bookingId').openCursor(IDBKeyRange.only(bookingId)) : store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear offline queue.'));

      if (bookingId) {
        request.onerror = () => reject(request.error ?? new Error('Failed to clear offline queue.'));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            return;
          }
          cursor.delete();
          cursor.continue();
        };
      }
    });
  }

  async flush(
    bookingId: string,
    syncFn: (payload: ConsultationRecordUpdateRequest) => Promise<void>
  ): Promise<void> {
    const latest = await this.getLatest(bookingId);
    if (!latest) {
      return;
    }

    await syncFn(latest.payload);
    await this.clear(bookingId);
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this browser.'));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        store.createIndex('bookingId', 'bookingId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to open offline queue database.'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  private request<T>(executor: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> {
    return new Promise<T>(executor);
  }
}

