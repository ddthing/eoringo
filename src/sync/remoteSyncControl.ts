export type RemoteSyncController = {
  pause: () => Promise<void>;
};

let activeController: RemoteSyncController | null = null;

export const registerRemoteSyncController = (controller: RemoteSyncController) => {
  activeController = controller;

  return () => {
    if (activeController === controller) {
      activeController = null;
    }
  };
};

export const pauseRemoteSync = async () => {
  await activeController?.pause();
};
