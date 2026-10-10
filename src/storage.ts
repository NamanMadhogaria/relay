export type Recording = {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  blob: Blob;
  microphone: boolean;
  camera?: boolean;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('relay-recordings', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('recordings', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Relay tabs and try again.'));
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordings', mode);
    const request = action(tx.objectStore('recordings'));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? request.error ?? new Error('Local storage failed.'));
    };
    tx.onerror = () => {
      /* onabort settles the promise */
    };
  });
}

export const listRecordings = () =>
  transaction('readonly', (store) => store.getAll() as IDBRequest<Recording[]>);
export const saveRecording = (recording: Recording) =>
  transaction('readwrite', (store) => store.put(recording));
export const deleteRecording = (id: string) =>
  transaction('readwrite', (store) => store.delete(id));
