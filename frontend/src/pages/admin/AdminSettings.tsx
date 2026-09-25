import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AdminSettings = () => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    systemTimezone: 'UTC',
    allowLateJoins: true,
    lateJoinThreshold: '15',
    requireDeviceVerification: true,
    conflictStrictness: 'MEDIUM',
    auditLogRetention: '90',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setSettings(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    setSuccess(false);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure global platform behavior and security rules.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Settings successfully saved.
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* Section: Attendance Rules */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Attendance Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Timezone</label>
                <select 
                  name="systemTimezone"
                  value={settings.systemTimezone}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Late Join Threshold (minutes)</label>
                <input 
                  type="number" 
                  name="lateJoinThreshold"
                  value={settings.lateJoinThreshold}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="allowLateJoins"
                  name="allowLateJoins"
                  checked={settings.allowLateJoins}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-600"
                />
                <label htmlFor="allowLateJoins" className="text-sm font-medium text-gray-700">Allow Late Joins</label>
              </div>
            </div>
          </section>

          {/* Section: Security */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Security & Verification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="requireDeviceVerification"
                  name="requireDeviceVerification"
                  checked={settings.requireDeviceVerification}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-600"
                />
                <label htmlFor="requireDeviceVerification" className="text-sm font-medium text-gray-700">Enforce Cryptographic Device Verification</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conflict Detection Strictness</label>
                <select 
                  name="conflictStrictness"
                  value={settings.conflictStrictness}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="LOW">Low (Basic checks only)</option>
                  <option value="MEDIUM">Medium (Recommended)</option>
                  <option value="HIGH">High (Aggressive flagging)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Compliance */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Compliance & Audit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audit Log Retention (Days)</label>
                <select 
                  name="auditLogRetention"
                  value={settings.auditLogRetention}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year</option>
                  <option value="9999">Indefinite (Tamper-Evident)</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-colors",
              saving ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
            )}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
