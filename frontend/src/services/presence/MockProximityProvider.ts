import { PresenceProvider, PresenceSignal } from './PresenceProvider';

export class MockProximityProvider implements PresenceProvider {
  private intervalId: NodeJS.Timeout | null = null;
  private inRange: boolean = true;
  private listener: ((signal: PresenceSignal) => void) | null = null;

  async initialize(): Promise<boolean> {
    // In a real app, this would request Bluetooth/GPS permissions
    return true;
  }

  startMonitoring(onSignalChange: (signal: PresenceSignal) => void): void {
    this.listener = onSignalChange;
    this.intervalId = setInterval(() => {
      if (this.listener) {
        this.listener({
          provider: 'MockProximity',
          inRange: this.inRange,
          timestamp: new Date()
        });
      }
    }, 5000); // Check every 5 seconds
  }

  async getPresenceSignal(): Promise<PresenceSignal> {
    return {
      provider: 'MockProximity',
      inRange: this.inRange,
      timestamp: new Date()
    };
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.listener = null;
  }

  // Developer tool to simulate wandering out of range
  simulateOutOfRange(outOfRange: boolean) {
    this.inRange = !outOfRange;
  }
}
