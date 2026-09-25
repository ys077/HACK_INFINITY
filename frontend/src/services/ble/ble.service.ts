import { BleClient } from '@capacitor-community/bluetooth-le';
import type { ScanResult } from '@capacitor-community/bluetooth-le';
import type { BLEDevice, BLEEvent } from './ble.types';
import { requestBLEPermissions } from './ble.permissions';

type BLEEventHandler = (event: BLEEvent, data?: any) => void;

class BLEService {
  private eventHandlers: Set<BLEEventHandler> = new Set();
  private isScanning = false;
  private connectedDeviceId: string | null = null;

  public subscribe(handler: BLEEventHandler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: BLEEvent, data?: any) {
    console.log(`[BLE] ${event}`, data || '');
    this.eventHandlers.forEach(handler => handler(event, data));
  }

  public async initialize() {
    const granted = await requestBLEPermissions();
    if (granted) {
      this.emit('BLE_AVAILABLE');
      return true;
    } else {
      this.emit('PERMISSION_DENIED');
      return false;
    }
  }

  public async startScan() {
    if (this.isScanning) return;
    
    try {
      this.isScanning = true;
      this.emit('SCAN_STARTED');
      
      await BleClient.requestLEScan(
        { }, // Scan all devices for testing. For production, specify services: [BLE_CONSTANTS.TEST_SERVICE_UUID]
        (result: ScanResult) => {
          this.emit('DEVICE_FOUND', {
            deviceId: result.device.deviceId,
            name: result.device.name || result.localName || 'Unknown Device',
            rssi: result.rssi
          } as BLEDevice);
        }
      );

      // Stop scan automatically after 10 seconds for this POC
      setTimeout(async () => {
        if (this.isScanning) {
          await this.stopScan();
        }
      }, 10000);

    } catch (error) {
      console.error('[BLE] Scan error:', error);
      this.isScanning = false;
      this.emit('BLE_ERROR', error);
    }
  }

  public async stopScan() {
    if (!this.isScanning) return;
    try {
      await BleClient.stopLEScan();
      this.isScanning = false;
      this.emit('SCAN_STOPPED');
    } catch (error) {
      console.error('[BLE] Stop scan error:', error);
      this.emit('BLE_ERROR', error);
    }
  }

  public async connect(deviceId: string) {
    try {
      await BleClient.connect(deviceId, (disconnectedId) => {
        if (this.connectedDeviceId === disconnectedId) {
          this.connectedDeviceId = null;
          this.emit('DEVICE_DISCONNECTED', disconnectedId);
        }
      });
      
      this.connectedDeviceId = deviceId;
      this.emit('DEVICE_CONNECTED', deviceId);
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      this.emit('BLE_ERROR', error);
      throw error;
    }
  }

  public async disconnect() {
    if (!this.connectedDeviceId) return;
    
    try {
      const id = this.connectedDeviceId;
      this.connectedDeviceId = null;
      await BleClient.disconnect(id);
      this.emit('DEVICE_DISCONNECTED', id);
    } catch (error) {
      console.error('[BLE] Disconnect error:', error);
      this.emit('BLE_ERROR', error);
    }
  }
}

export const bleService = new BLEService();
