import { BleClient } from '@capacitor-community/bluetooth-le';

export const checkBLEPermissions = async (): Promise<boolean> => {
  try {
    const isEnabled = await BleClient.isEnabled();
    if (!isEnabled) {
      console.warn('[BLE] Bluetooth is not enabled.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[BLE] Permission check failed:', error);
    return false;
  }
};

export const requestBLEPermissions = async (): Promise<boolean> => {
  try {
    // BleClient.initialize() automatically requests permissions on Android.
    await BleClient.initialize();
    console.log('[BLE] Permissions granted and initialized.');
    return true;
  } catch (error) {
    console.error('[BLE] Permission request failed:', error);
    return false;
  }
};
