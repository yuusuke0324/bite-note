declare global {
  var __TEST_DB_NAME__: string | undefined;

  // Session Management - Custom Event Types
  interface SessionExpiredDetail {
    lastActivityAt: number;
    elapsedTime: number;
  }

  interface WindowEventMap {
    session_expired: CustomEvent<SessionExpiredDetail>;
  }

  interface Window {
    __sessionStore?: {
      getState: () => {
        isSessionExpiredModalOpen: boolean;
        sessionStatus: string;
        unsavedDataCount: number;
      };
    };
    sessionServiceStarted?: boolean;
  }
}

export {};
