import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllCharacterImages, replaceCharacterImages, saveCharacterImageById } from "./imageStorage";

// Drive the actual IndexedDB event boundary: request success is earlier than
// transaction commit, and an abort can still occur between them.
const databaseHarness = () => {
  const put = { result: "photo", onsuccess: null as null | (() => void), onerror: null as null | (() => void) };
  const keys = { result: ["photo"], onsuccess: null as null | (() => void) };
  const values = { result: [new Blob(["photo"])], onsuccess: null as null | (() => void) };
  const store = { clear: vi.fn(), put: vi.fn(() => put), getAllKeys: vi.fn(() => keys), getAll: vi.fn(() => values) };
  const transaction = {
    error: null as Error | null,
    objectStore: vi.fn(() => store),
    oncomplete: null as null | (() => void),
    onerror: null as null | (() => void),
    onabort: null as null | (() => void),
    abort: vi.fn(),
  };
  const db = { transaction: vi.fn(() => transaction), close: vi.fn() };
  const opening = { result: db, onsuccess: null as null | (() => void) };
  vi.stubGlobal("indexedDB", { open: vi.fn(() => opening) });
  return { opening, db, transaction, put, keys, values, store };
};

afterEach(() => vi.unstubAllGlobals());

describe("image storage durability", () => {
  it("aborts the queued clear when a replacement write throws synchronously", async () => {
    const h = databaseHarness();
    h.store.put.mockImplementation(() => { throw new Error("Cannot clone image"); });
    const promise = replaceCharacterImages({ photo: new Blob(["photo"]) });
    const assertion = expect(promise).rejects.toThrow("Cannot clone image");
    h.opening.onsuccess?.();
    await assertion;
    expect(h.store.clear).toHaveBeenCalledOnce();
    expect(h.transaction.abort).toHaveBeenCalledOnce();
    expect(h.db.close).toHaveBeenCalledOnce();
  });

  it("does not report a successful save before the transaction commits", async () => {
    const h = databaseHarness();
    const saved = vi.fn();
    const promise = saveCharacterImageById("photo", new Blob(["photo"])).then(saved);
    h.opening.onsuccess?.();
    await Promise.resolve();
    h.put.onsuccess?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).not.toHaveBeenCalled();
    h.transaction.oncomplete?.();
    await promise;
    expect(saved).toHaveBeenCalledWith("photo");
    expect(h.db.close).toHaveBeenCalledOnce();
  });

  it("rejects an aborted transaction even after request success", async () => {
    const h = databaseHarness();
    const promise = saveCharacterImageById("photo", new Blob(["photo"]));
    const result = promise.then(() => "saved", () => "aborted");
    h.opening.onsuccess?.();
    await Promise.resolve();
    h.put.onsuccess?.();
    h.transaction.error = new Error("Disk full");
    h.transaction.onabort?.();
    expect(await result).toBe("aborted");
    expect(h.db.close).toHaveBeenCalledOnce();
  });

  it("reads keys and image values in the same snapshot", async () => {
    const h = databaseHarness();
    const promise = getAllCharacterImages();
    h.opening.onsuccess?.();
    await Promise.resolve();
    expect(h.store.getAllKeys).toHaveBeenCalledOnce();
    expect(h.store.getAll).toHaveBeenCalledOnce();
    h.transaction.oncomplete?.();
    expect(await promise).toEqual({ photo: h.values.result[0] });
    expect(h.db.transaction).toHaveBeenCalledOnce();
  });
});
