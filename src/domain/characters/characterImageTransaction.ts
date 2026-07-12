export type CharacterImageTransaction = {
  initialImageId?: string;
  currentImageId?: string;
  temporaryImageIds: string[];
};

type TransactionUpdate = {
  transaction: CharacterImageTransaction;
  cleanupImageIds: string[];
};

export const createCharacterImageTransaction = (
  initialImageId?: string,
): CharacterImageTransaction => ({
  initialImageId,
  currentImageId: initialImageId,
  temporaryImageIds: [],
});

export const stageCharacterImage = (
  transaction: CharacterImageTransaction,
  nextImageId?: string,
): TransactionUpdate => {
  const replacedTemporaryImageId = transaction.temporaryImageIds.includes(
    transaction.currentImageId ?? "",
  )
    ? transaction.currentImageId
    : undefined;
  const temporaryImageIds = transaction.temporaryImageIds.filter(
    (imageId) => imageId !== replacedTemporaryImageId,
  );

  if (nextImageId && nextImageId !== transaction.initialImageId) {
    temporaryImageIds.push(nextImageId);
  }

  return {
    transaction: {
      ...transaction,
      currentImageId: nextImageId,
      temporaryImageIds: Array.from(new Set(temporaryImageIds)),
    },
    cleanupImageIds:
      replacedTemporaryImageId && replacedTemporaryImageId !== nextImageId
        ? [replacedTemporaryImageId]
        : [],
  };
};

export const cancelCharacterImageTransaction = (
  transaction: CharacterImageTransaction,
): TransactionUpdate => ({
  transaction: createCharacterImageTransaction(transaction.initialImageId),
  cleanupImageIds: [...transaction.temporaryImageIds],
});

export const commitCharacterImageTransaction = (
  transaction: CharacterImageTransaction,
): TransactionUpdate => {
  const cleanupImageIds = transaction.temporaryImageIds.filter(
    (imageId) => imageId !== transaction.currentImageId,
  );

  if (
    transaction.initialImageId &&
    transaction.initialImageId !== transaction.currentImageId
  ) {
    cleanupImageIds.push(transaction.initialImageId);
  }

  return {
    transaction: createCharacterImageTransaction(transaction.currentImageId),
    cleanupImageIds: Array.from(new Set(cleanupImageIds)),
  };
};
