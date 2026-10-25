import type { AttachmentRecord, Workspace, WorkspaceRepository } from '../types';

const DATABASE_VERSION = 1;
const WORKSPACE_STORE = 'workspace';
const ATTACHMENT_STORE = 'attachments';
const WORKSPACE_KEY = 'current';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Browser storage request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Browser storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage transaction was aborted.'));
  });
}

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(private readonly databaseName = 'openbench-prototype') {}

  private open(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(WORKSPACE_STORE)) database.createObjectStore(WORKSPACE_STORE);
          if (!database.objectStoreNames.contains(ATTACHMENT_STORE)) database.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('OpenBench could not open IndexedDB.'));
        request.onblocked = () => reject(new Error('OpenBench storage is blocked by another tab. Close other tabs and retry.'));
      });
    }
    return this.databasePromise;
  }

  async load(): Promise<Workspace | null> {
    const database = await this.open();
    const transaction = database.transaction(WORKSPACE_STORE, 'readonly');
    const value = await requestResult(transaction.objectStore(WORKSPACE_STORE).get(WORKSPACE_KEY));
    return (value as Workspace | undefined) ?? null;
  }

  async save(workspace: Workspace): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(WORKSPACE_STORE, 'readwrite');
    transaction.objectStore(WORKSPACE_STORE).put(workspace, WORKSPACE_KEY);
    await transactionComplete(transaction);
  }

  async reset(workspace: Workspace): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction([WORKSPACE_STORE, ATTACHMENT_STORE], 'readwrite');
    transaction.objectStore(WORKSPACE_STORE).clear();
    transaction.objectStore(ATTACHMENT_STORE).clear();
    transaction.objectStore(WORKSPACE_STORE).put(workspace, WORKSPACE_KEY);
    await transactionComplete(transaction);
  }

  async saveAttachment(record: AttachmentRecord): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(ATTACHMENT_STORE, 'readwrite');
    transaction.objectStore(ATTACHMENT_STORE).put(record);
    await transactionComplete(transaction);
  }

  async loadAttachment(id: string): Promise<AttachmentRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(ATTACHMENT_STORE, 'readonly');
    const value = await requestResult(transaction.objectStore(ATTACHMENT_STORE).get(id));
    return (value as AttachmentRecord | undefined) ?? null;
  }

  async deleteAttachment(id: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(ATTACHMENT_STORE, 'readwrite');
    transaction.objectStore(ATTACHMENT_STORE).delete(id);
    await transactionComplete(transaction);
  }
}
