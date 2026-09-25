import React, { useEffect, useState } from 'react';
import { bleService } from '../../services/ble/ble.service';
import type { BLEDevice, BLEEvent } from '../../services/ble/ble.types';

export default function BluetoothTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Initializing...');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, BLEDevice>>(new Map());
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);

  useEffect(() => {
    const log = (msg: string) => setLogs(prev => [...prev, msg].slice(-10)); // Keep last 10 logs

    const handleEvent = (event: BLEEvent, data?: any) => {
      log(`${event}${data ? ': ' + JSON.stringify(data) : ''}`);
      
      switch (event) {
        case 'BLE_AVAILABLE':
          setStatus('Available (Permission Granted)');
          break;
        case 'PERMISSION_DENIED':
          setStatus('Permission Denied');
          break;
        case 'SCAN_STARTED':
          setIsScanning(true);
          break;
        case 'SCAN_STOPPED':
          setIsScanning(false);
          break;
        case 'DEVICE_FOUND':
          if (data && (data as BLEDevice).name) {
            setDevices(prev => new Map(prev).set(data.deviceId, data));
          }
          break;
        case 'DEVICE_CONNECTED':
          setConnectedDevice(devices.get(data) || { deviceId: data });
          break;
        case 'DEVICE_DISCONNECTED':
          setConnectedDevice(null);
          break;
      }
    };

    const unsubscribe = bleService.subscribe(handleEvent);
    bleService.initialize();

    return () => {
      unsubscribe();
      bleService.stopScan();
      bleService.disconnect();
    };
  }, [devices]);

  const toggleScan = () => {
    if (isScanning) {
      bleService.stopScan();
    } else {
      setDevices(new Map());
      bleService.startScan();
    }
  };

  const connectDevice = (deviceId: string) => {
    bleService.stopScan();
    bleService.connect(deviceId);
  };

  const disconnectDevice = () => {
    bleService.disconnect();
  };

  return (
    <div className="p-6 max-w-md mx-auto surface rounded-lg shadow-sm">
      <h1 className="text-xl font-bold mb-4 text-center border-b pb-2">BLUETOOTH TEST</h1>
      
      <div className="space-y-4 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span>Bluetooth:</span>
          <span className="font-semibold text-primary">{status}</span>
        </div>
        
        <div className="flex justify-between border-b pb-2">
          <span>Scanning:</span>
          <span className="font-semibold">{isScanning ? 'Scanning...' : 'Not scanning'}</span>
        </div>

        <button 
          onClick={toggleScan}
          className="w-full bg-primary text-white py-2 rounded-md font-medium"
        >
          {isScanning ? 'STOP SCAN' : 'START SCAN'}
        </button>

        {!connectedDevice && Array.from(devices.values()).length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-2">DISCOVERED DEVICES</h2>
            <div className="space-y-3">
              {Array.from(devices.values()).map(device => (
                <div key={device.deviceId} className="p-3 border rounded-md">
                  <div className="font-semibold">{device.name || 'Unknown Device'}</div>
                  <div className="text-xs text-gray-500 mb-2">RSSI: {device.rssi} dBm</div>
                  <button 
                    onClick={() => connectDevice(device.deviceId)}
                    className="w-full bg-secondary text-on-surface py-1 rounded-md text-xs font-medium border"
                  >
                    CONNECT
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {connectedDevice && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-2">CONNECTED DEVICE</h2>
            <div className="p-4 border rounded-md bg-green-50 text-green-900 border-green-200">
              <div className="space-y-1">
                <div><span className="font-semibold">Name:</span> {connectedDevice.name || 'Unknown'}</div>
                <div><span className="font-semibold">Device ID:</span> {connectedDevice.deviceId}</div>
                <div><span className="font-semibold">RSSI:</span> {connectedDevice.rssi || 'N/A'} dBm</div>
                <div><span className="font-semibold">Status:</span> CONNECTED</div>
              </div>
              <button 
                onClick={disconnectDevice}
                className="w-full mt-4 bg-red-100 text-red-700 py-2 rounded-md font-medium border border-red-200"
              >
                DISCONNECT
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t">
          <h3 className="text-xs font-bold text-gray-500 mb-2">EVENT LOG</h3>
          <div className="bg-gray-900 text-green-400 p-2 rounded-md text-xs font-mono h-32 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            {logs.length === 0 && <div className="text-gray-600">Waiting for events...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
