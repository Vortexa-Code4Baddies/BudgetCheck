import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const AuditHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 25,
        search,
        action,
        entityType,
      });

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      }
    } catch (err) {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, action, entityType]);

  const actionColors = {
    USER_LOGIN: 'bg-blue-100 text-blue-800',
    USER_REGISTER: 'bg-emerald-100 text-emerald-800',
    DATASET_UPLOAD: 'bg-teal-100 text-teal-800',
    DATASET_ANALYSIS: 'bg-purple-100 text-purple-800',
    RECONCILIATION_RUN: 'bg-amber-100 text-amber-800',
    FINDING_STATUS_CHANGE: 'bg-rose-100 text-rose-800',
    REPORT_GENERATED: 'bg-indigo-100 text-indigo-800',
    DATASET_DELETE: 'bg-red-100 text-red-800',
    DEMO_DATASET_LOAD: 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail & System History</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable append-only record of administrative events, data modifications, and reviewer decisions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, user, or entity..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Actions</option>
            <option value="DATASET_UPLOAD">Dataset Upload</option>
            <option value="DATASET_ANALYSIS">Analysis Run</option>
            <option value="RECONCILIATION_RUN">Reconciliation Run</option>
            <option value="FINDING_STATUS_CHANGE">Review Status Change</option>
            <option value="REPORT_GENERATED">Report Generated</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="DATASET_DELETE">Dataset Deletion</option>
          </select>

          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Entity Types</option>
            <option value="Dataset">Dataset</option>
            <option value="Finding">Finding</option>
            <option value="Reconciliation">Reconciliation</option>
            <option value="Report">Report</option>
            <option value="Auth">Auth</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">{total} logged events</div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4 bg-slate-50/50"></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {l.actorName}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          actionColors[l.action] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {l.entityType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 text-right whitespace-nowrap">
                      {l.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
