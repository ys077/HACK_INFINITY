# MODULE 21 — CAPACITOR ANDROID CONVERSION + BLE PROOF OF CONCEPT

## Overview

This report details the successful conversion of the Presenza React application into an Android mobile application using Capacitor, as well as the implementation of a Bluetooth Low Energy (BLE) Proof of Concept.

## 1. Capacitor Installation & Configuration

*   **Capacitor Core & CLI**: Installed `@capacitor/core` and `@capacitor/cli` into the existing Vite frontend.
*   **Android Platform**: Installed `@capacitor/android` and added the Android platform using `npx cap add android`.
*   **App ID**: Configured as `com.basixera.continuousattendance`.
*   **Web Directory**: Configured `webDir: 'dist'` in `capacitor.config.ts` to correctly bundle the Vite output.
*   **BLE Plugin**: Installed `@capacitor-community/bluetooth-le` for native BLE access on Android.

## 2. Phone Installation Procedure

1.  Open the Android project: `npx cap open android`
2.  Connect a physical Android phone via USB with **Developer Options** and **USB Debugging** enabled.
3.  Ensure Gradle has fully synced in Android Studio.
4.  Select the physical device in the deployment target dropdown.
5.  Click **Run 'app'** (Shift + F10) to install and launch the application on the phone.

## 3. LAN Configuration & Backend Connectivity Test

To test on a physical phone, the React application cannot use `localhost` for API calls, as that resolves to the phone itself. 

*   **Configuration**: Create a `.env` file in the `frontend` directory and set the API Base URL to the development laptop's local IP address.
    ```env
    VITE_API_BASE_URL=http://<YOUR_LAN_IP>:5000/api
    ```
*   **Backend Server**: Ensure the Node.js Express server is listening on `0.0.0.0` (all interfaces) and Windows Firewall allows incoming connections on port `5000`.
*   **Authentication & Socket.IO**: Both REST calls (JWT login) and real-time Socket.IO connections successfully route over the LAN to the backend, preserving the authoritative source of truth.

## 4. BLE Service Architecture & Permissions

*   **Plugin Used**: `@capacitor-community/bluetooth-le`
*   **Permissions**: The plugin's `BleClient.initialize()` method is used to automatically prompt the user for Bluetooth and Location/Nearby Devices permissions on Android.
*   **Service Structure**: 
    *   `ble.service.ts`: Exposes a robust event-based API (`BLE_AVAILABLE`, `SCAN_STARTED`, `DEVICE_FOUND`, `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`, etc.).
    *   `ble.types.ts`: Defines interfaces for devices and connection states.
    *   `ble.constants.ts`: Stores UUIDs and RSSI thresholds (`NEAR`, `UNCERTAIN`, `FAR`).

## 5. BLE Test Screen

A dedicated standalone test screen was created at `/student/bluetooth-test` (accessible from the Student Sidebar menu as "BLE Test (POC)").

*   **Capabilities**:
    *   Displays current Bluetooth status and scanning state.
    *   Starts and stops BLE scanning.
    *   Lists discovered devices dynamically with live RSSI values.
    *   Provides manual connection to discovered devices.
    *   Provides manual disconnection.
    *   Contains a live scrolling event log for debugging (e.g., connection lost events).

## 6. Testing Instructions (Phone A & Phone B)

### Phone A (Transmitter Setup)
1. Install a BLE simulator application (e.g., *nRF Connect for Mobile* or *LightBlue*).
2. Configure a new Advertiser.
3. Set the Local Name to `AUREX-ROOM-204`.
4. Add the Test Service UUID defined in `ble.constants.ts`.
5. Start broadcasting.

### Phone B (Scanner Setup)
1. Launch the Presenza Android application.
2. Log in as a Student.
3. Navigate to **BLE Test (POC)**.
4. Grant the requested Bluetooth permissions.
5. Click **START SCAN**.

### Expected Results
*   **Discovery Result**: Phone B should detect `AUREX-ROOM-204` and display its RSSI.
*   **Connection Result**: Tapping "CONNECT" should establish a BLE connection and display the Device ID and Status.
*   **Disconnect Test**: Stop broadcasting on Phone A (or walk out of range). Phone B's event log will record a `DEVICE_DISCONNECTED` event.
*   **Reconnect Test**: Start broadcasting again and rescan to re-establish the connection.

## 7. Known Limitations

*   **Background Scanning**: Capacitor's BLE plugin primarily operates in the foreground. True background BLE continuous scanning may require additional native Android foreground services in the future.
*   **RSSI Fluctuations**: RSSI values fluctuate rapidly. The UI displays raw values in this POC, but the production attendance engine will need to apply a smoothing algorithm (e.g., moving average) to prevent false disconnections.

## 8. Next Steps for Production BLE Integration

*   Replace the manual "CONNECT" button with automatic scanning and matching against expected Classroom Beacon UUIDs during an active Attendance Session.
*   Integrate the `ble.service.ts` events directly into the `StudentLiveSession.tsx` to automatically trigger the Continuous Presence Engine (`presenceService`) when a valid beacon is detected.
*   Implement RSSI smoothing and thresholding (`NEAR`, `UNCERTAIN`, `FAR`) to handle physical interference in real classrooms.
