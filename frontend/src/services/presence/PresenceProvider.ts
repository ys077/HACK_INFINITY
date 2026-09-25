export interface PresenceSignal {
  provider: string;
  inRange: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PresenceProvider {
  /**
   * Initialize the proximity provider (e.g., request permissions).
   */
  initialize(): Promise<boolean>;

  /**
   * Start monitoring proximity.
   */
  startMonitoring(onSignalChange: (signal: PresenceSignal) => void): void;

  /**
   * Get the immediate presence signal.
   */
  getPresenceSignal(): Promise<PresenceSignal>;

  /**
   * Stop monitoring proximity.
   */
  stopMonitoring(): void;
}
