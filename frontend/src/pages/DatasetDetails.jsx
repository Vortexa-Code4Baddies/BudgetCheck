import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Database,
  ArrowLeft,
  Play,
  Scale,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const DatasetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dataset, setDataset] = useState(null);
  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Pagination & filter state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [isValidFilter, setIsValidFilter] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);

  // Fetch dataset info
  const fetchDatasetInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/datasets/${id}`);
      if (res.data.success) {
        setDataset(res.data.dataset);
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load dataset details');
      navigate('/datasets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch paginated transactions
  const fetchTransactions = async () => {
    try {
      setTableLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        search,
        department,
        isValid: isValidFilter,
      });

      const res = await api.get(`/transactions/dataset/${id}?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.totalPages);
        setTotalRecords(res.data.total);
        if (res.data.departments?.length > 0) {
          setDepartmentsList(res.data.departments.filter(Boolean));
        }
      }
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetInfo();
  }, [id]);

  useEffect(() => {
    fetchTransactions();
  }, [id, page, search, department, isValidFilter]);

  const handleRunAnalysis = async () => {
    const toastId = toast.loading('Running audit intelligence algorithms...');
    try {
      const res = await api.post(`/datasets/${id}/analyze`);
      if (res.data.success) {
        toast.success(res.data.message || 'Analysis complete!', { id: toastId });
        navigate(`/findings?datasetId=${id}`);
      }
    } catch (err) {
      toast.error('Analysis failed', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
        <div className="h-96 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
      </div>
    );
  }

  if (!dataset) return null;

  const valSummary = dataset.validationSummary || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Datasets</span>
        </Link>
      </div>

      {/* Dataset Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{dataset.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                {dataset.analysisStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Source File: {dataset.originalFilename} • Period: {dataset.reportingPeriod || 'FY 2025-26'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Audit Screening</span>
            </button>

            <Link
              to={`/reconciliation?datasetId=${dataset._id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Reconcile Totals</span>
            </Link>

            <Link
              to={`/reports?datasetId=${dataset._id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate PDF</span>
            </Link>
          </div>
        </div>

        {/* Validation Metric Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
            <span className="text-sm font-extrabold text-slate-900">{dataset.totalRows}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Compliant Rows</span>
            <span className="text-sm font-extrabold text-emerald-600">{dataset.validRows}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Notice Rows</span>
            <span className="text-sm font-extrabold text-amber-600">{dataset.invalidRows}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recorded Total</span>
            <span className="text-sm font-extrabold text-slate-900">
              ₹{Number(dataset.totalRecordedAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Missing Fields</span>
            <span className="text-sm font-extrabold text-slate-700">{valSummary.missingFieldsCount || 0}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Flagged Findings</span>
            <span className="text-sm font-extrabold text-rose-600">{stats.findingsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for Transactions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search vendor, transaction ID, UTR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Departments</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={isValidFilter}
            onChange={(e) => {
              setIsValidFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Row Types</option>
            <option value="true">Fully Valid Rows</option>
            <option value="false">Flagged Quality Notices</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {transactions.length} of {totalRecords} records
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Row #</th>
                <th className="py-3 px-4">Txn ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tableLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-4 px-4 bg-slate-50/50"></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {t.sourceRowNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {t.transactionId || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{t.date || '—'}</td>
                    <td className="py-3 px-4 font-medium max-w-[140px] truncate">{t.department}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[140px] truncate">{t.category}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[160px] truncate">
                      {t.vendor}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(t.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                      {t.paymentReference || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Valid
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium cursor-help"
                          title={t.validationErrors?.map((e) => e.message).join(' | ')}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Notice
                        </span>
                      )}
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
