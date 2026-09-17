const DB_NAME = "ff14-daily-board-images";
const STORE_NAME = "character-images";
const DB_VERSION = 1;

const openImageDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runImageTransaction = async <T>(
  mode: IDBTransactionMode,
  enqueue: (store: IDBObjectStore) => () => T,
) => {
  const db = await openImageDb();

  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction | undefined;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      db.close();
      reject(error);
    };
    try {
      transaction = db.transaction(STORE_NAME, mode);
      transaction.onerror = () => fail(transaction?.error ?? new Error("Image transaction failed."));
      transaction.onabort = () => fail(transaction?.error ?? new Error("Image transaction aborted."));
      const readResult = enqueue(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => {
        if (settled) return;
        try {
          const result = readResult();
          settled = true;
          db.close();
          resolve(result);
        } catch (error) {
          fail(error);
        }
      };
    } catch (error) {
      // A synchronous enqueue failure must not commit earlier queued writes.
      try { transaction?.abort(); } catch { /* Already inactive. */ }
      fail(error);
    }
  });
};

const withImageStore = <T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) =>
  runImageTransaction(mode, (store) => {
    const request = callback(store);
    return () => request.result;
  });

const createImageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `character-image-${crypto.randomUUID()}`;
  }

  return `character-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const saveCharacterImage = async (blob: Blob) => {
  const imageId = createImageId();
  await withImageStore("readwrite", (store) => store.put(blob, imageId));

  return imageId;
};

export const saveCharacterImageById = async (imageId: string, blob: Blob) =>
  withImageStore<IDBValidKey>("readwrite", (store) => store.put(blob, imageId));

export const getCharacterImage = async (imageId: string) =>
  withImageStore<Blob | undefined>("readonly", (store) => store.get(imageId));

export const deleteCharacterImage = async (imageId: string) =>
  withImageStore<undefined>("readwrite", (store) => store.delete(imageId));

export const clearCharacterImages = async () =>
  withImageStore<undefined>("readwrite", (store) => store.clear());

export const replaceCharacterImages = (images: Record<string, Blob>) =>
  runImageTransaction("readwrite", (store) => {
    store.clear();
    Object.entries(images).forEach(([imageId, blob]) => store.put(blob, imageId));
    return () => undefined;
  });

export const getAllCharacterImages = () =>
  runImageTransaction("readonly", (store) => {
    const keys = store.getAllKeys();
    const blobs = store.getAll();
    return () => Object.fromEntries(
      keys.result
        .map((key, index) => [String(key), blobs.result[index]] as const)
        .filter((entry): entry is readonly [string, Blob] => entry[1] instanceof Blob),
    );
  });
