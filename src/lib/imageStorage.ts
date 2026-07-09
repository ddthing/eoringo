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

const withImageStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openImageDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

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

export const getAllCharacterImages = async () => {
  const keys = await withImageStore<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  const blobs = await withImageStore<Blob[]>("readonly", (store) => store.getAll());

  return Object.fromEntries(
    keys
      .map((key, index) => [String(key), blobs[index]] as const)
      .filter((entry): entry is readonly [string, Blob] => entry[1] instanceof Blob),
  );
};
