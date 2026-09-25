import { useState, useEffect } from 'react';
import { auditApi, type AuditLog, type AuditVerificationResult } from '../../services/auditApi';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [verifyResult, setVerifyResult] = useState<AuditVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [filters, setFilters] = useState({
    action: '',
    entityType: ''
  });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const data = await auditApi.getLogs({
        page,
        limit: 25,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined
      });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const result = await auditApi.verifyChain();
      setVerifyResult(result);
    } catch (err: any) {
      setError('Verification failed to execute');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit & Security Logs</h1>
          <p className="text-gray-500 mt-1">Tamper-evident system activity traceability.</p>
        </div>
        
        <button
          onClick={verifyChain}
          disabled={verifying}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 font-medium"
        >
          {verifying ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
          Verify Full Chain
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {verifyResult && (
        <div className={cn("p-4 rounded-xl border", verifyResult.verified ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
          <div className="flex items-start gap-3">
            {verifyResult.verified ? (
              <ShieldCheck className="w-6 h-6 text-green-600 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-red-600 mt-0.5" />
            )}
            <div>
              <h3 className={cn("font-bold", verifyResult.verified ? "text-green-900" : "text-red-900")}>
                {verifyResult.verified ? "Audit Chain Verified" : "Audit Chain Compromised"}
              </h3>
              <p className={cn("text-sm mt-1", verifyResult.verified ? "text-green-700" : "text-red-700")}>
                {verifyResult.checkedRecords} records checked.
              </p>
              {!verifyResult.verified && verifyResult.error && (
                <div className="mt-3 p-3 bg-red-100 rounded text-xs text-red-900 font-mono">
                  <div><strong>Error Type:</strong> {verifyResult.error.type}</div>
                  <div><strong>Record ID:</strong> {verifyResult.error.recordId}</div>
                  {verifyResult.error.expectedPreviousHash && (
                    <div><strong>Expected Previous Hash:</strong> {verifyResult.error.expectedPreviousHash}</div>
                  )}
                  {verifyResult.error.actualPreviousHash && (
                    <div><strong>Actual Previous Hash:</strong> {verifyResult.error.actualPreviousHash}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Action</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="DEVICE_REGISTERED">DEVICE_REGISTERED</option>
            <option value="DEVICE_REVOKED">DEVICE_REVOKED</option>
            <option value="SESSION_STARTED">SESSION_STARTED</option>
            <option value="SESSION_ENDED">SESSION_ENDED</option>
            <option value="PRESENCE_JOINED">PRESENCE_JOINED</option>
            <option value="CONFLICT_DETECTED">CONFLICT_DETECTED</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Entity Type</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={filters.entityType}
            onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="StudentDevice">StudentDevice</option>
            <option value="AttendanceSession">AttendanceSession</option>
            <option value="AttendanceConflict">AttendanceConflict</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Actor Role</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Entity Type</th>
                <th className="px-6 py-4 font-medium">Entity ID</th>
                <th className="px-6 py-4 font-medium">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No logs found matching criteria.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold tracking-wide",
                        log.actorRole === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        log.actorRole === 'FACULTY' ? 'bg-blue-100 text-blue-700' :
                        log.actorRole === 'STUDENT' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 text-gray-600">{log.entityType}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.entityId.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      {log.integrity.verified ? (
                         <div className="flex items-center gap-1 text-green-600">
                           <ShieldCheck className="w-4 h-4" />
                           <span className="text-xs font-medium uppercase">Verified</span>
                         </div>
                      ) : (
                         <div className="flex items-center gap-1 text-red-600">
                           <ShieldAlert className="w-4 h-4" />
                           <span className="text-xs font-medium uppercase">Tampered</span>
                         </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{logs.length}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAudit;
