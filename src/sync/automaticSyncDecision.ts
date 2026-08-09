export type AutomaticSyncDecision =
  | "hydrate-remote"
  | "migrate-local"
  | "enable-empty"
  | "manual-choice";

export const decideAutomaticSync = ({
  remoteDocumentCount,
  hasMeaningfulLocalData,
  isGuestLink,
}: {
  remoteDocumentCount: number;
  hasMeaningfulLocalData: boolean;
  isGuestLink: boolean;
}): AutomaticSyncDecision => {
  if (remoteDocumentCount > 0) {
    return hasMeaningfulLocalData ? "manual-choice" : "hydrate-remote";
  }

  if (hasMeaningfulLocalData && isGuestLink) {
    return "migrate-local";
  }

  return hasMeaningfulLocalData ? "manual-choice" : "enable-empty";
};
