import { afterEach, describe, expect, it } from "vitest";
import { useAllowanceStore } from "../stores/allowance/useAllowanceStore";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import {
  captureStoreDocument,
  captureStoreDocuments,
  hydrateStoreDocuments,
} from "./storeSyncAdapter";
import type { RemoteDocument } from "./documentRepository";

const originalMemo = useWeeklyMemoStore.getState().memosByCharacter;
const originalAllowance = {
  value: useAllowanceStore.getState().value,
  lastAccrualKey: useAllowanceStore.getState().lastAccrualKey,
};

afterEach(() => {
  useWeeklyMemoStore.setState({ memosByCharacter: originalMemo });
  useAllowanceStore.setState(originalAllowance);
});

describe("store sync adapters", () => {
  it("captures only the persisted domain subset", () => {
    useWeeklyMemoStore.setState({ memosByCharacter: { character: "safe memo" } });

    const memo = captureStoreDocuments().find(
      (document) => document.documentType === "memo",
    );

    expect(memo).toEqual({
      documentType: "memo",
      characterId: null,
      payload: { memosByCharacter: { character: "safe memo" } },
      schemaVersion: 1,
    });
    expect(memo).not.toHaveProperty("setMemo");
  });

  it("captures one requested document without traversing every persisted document", () => {
    useWeeklyMemoStore.setState({ memosByCharacter: { character: "single document" } });

    expect(captureStoreDocument("memo")).toEqual({
      documentType: "memo",
      characterId: null,
      payload: { memosByCharacter: { character: "single document" } },
      schemaVersion: 1,
    });
  });

  it("hydrates validated documents without replacing store actions", () => {
    const beforeAction = useAllowanceStore.getState().setValue;
    const document = {
      id: "00000000-0000-4000-8000-000000000001",
      documentType: "allowance",
      characterId: null,
      payload: { value: 42, lastAccrualKey: "2026-08-02T00:00:00.000+09:00" },
      schemaVersion: 1,
      revision: 2,
      updatedAt: "2026-08-02T08:00:00.000Z",
    } satisfies RemoteDocument;

    hydrateStoreDocuments([document]);

    expect(useAllowanceStore.getState()).toMatchObject(document.payload);
    expect(useAllowanceStore.getState().setValue).toBe(beforeAction);
  });

  it("rejects duplicate or character-scoped documents before mutating stores", () => {
    const before = useWeeklyMemoStore.getState().memosByCharacter;
    const document = {
      id: "00000000-0000-4000-8000-000000000001",
      documentType: "memo",
      characterId: "00000000-0000-4000-8000-000000000002",
      payload: { memosByCharacter: { character: "remote" } },
      schemaVersion: 1,
      revision: 1,
      updatedAt: "2026-08-02T08:00:00.000Z",
    } satisfies RemoteDocument;

    expect(() => hydrateStoreDocuments([document])).toThrow("account-scoped");
    expect(useWeeklyMemoStore.getState().memosByCharacter).toEqual(before);
  });
});
