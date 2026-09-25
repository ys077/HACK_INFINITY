export interface BLEDevice {
  deviceId: string;
  name?: string;
  rssi?: number;
}

export interface BLEConnectionState {
  connected: boolean;
  device?: BLEDevice;
}

export type BLEEvent = 
  | 'BLE_AVAILABLE'
  | 'BLE_UNAVAILABLE'
  | 'SCAN_STARTED'
  | 'SCAN_STOPPED'
  | 'DEVICE_FOUND'
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'SIGNAL_UPDATED'
  | 'BLE_ERROR'
  | 'PERMISSION_DENIED';
