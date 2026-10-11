import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Receipt,
  IndianRupee,
  Scale,
  Copy,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  UploadCloud,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/metrics');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLoadDemo = async () => {
    setDemoLoading(true);
    const toastId = toast.loading('Loading demonstration dataset...');
    try {
      const res = await api.post('/demo/load');
      toast.success(res.data.message, { id: toastId });
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to load demo dataset', { id: toastId });
    } finally {
      setDemoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white p-5 rounded-xl border border-slate-200 animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const { summary, charts, recentActivity } = data || {
    summary: {},
    charts: {},
    recentActivity: {},
  };

  const hasData = summary?.totalDatasets > 0;

  const severityColors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#16a34a',
  };

  const statusColors = {
    'Pending Review': '#f59e0b',
    'Under Investigation': '#3b82f6',
    'Confirmed Issue': '#ef4444',
    Dismissed: '#6b7280',
    Resolved: '#10b981',
  };

  const formatINR = (val) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-7">
      {/* Welcome / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Intelligence Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time public spending reconciliation, anomaly detection, and verification oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasData && (
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>{demoLoading ? 'Loading Sample...' : 'Load Demo State Dataset'}</span>
            </button>
          )}

          <Link
            to="/upload"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New CSV</span>
          </Link>
        </div>
      </div>

      {/* Empty State Banner if no datasets */}
      {!hasData && (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Expenditure Datasets Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Upload public accounts CSV files to identify duplicate payments, reconcile against treasury budgets, and detect spending anomalies.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load 40-Record Demo Dataset (with Duplicates & Outliers)</span>
            </button>
            <Link
              to="/upload"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition"
            >
              Upload Custom CSV File
            </Link>
          </div>
        </div>
      )}

      {/* 6 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Datasets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Datasets</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.totalDatasets || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-teal-600 font-semibold">{summary?.datasetsAnalyzed || 0}</span> analyzed
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transactions</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.totalTransactions?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Normalized rows</div>
        </div>

        {/* Total Recorded Expenditure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Recorded Spend</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatINR(summary?.totalRecordedExpenditure)}</div>
          <div className="text-[11px] text-teal-600 font-medium mt-1">Zero float drift (Paise)</div>
        </div>

        {/* Reconciliation Discrepancies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Recon Variances</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{summary?.reconciliationDiscrepancies || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requiring audit review</div>
        </div>

        {/* Duplicate Candidates */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Potential Dups</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{summary?.potentialDuplicates || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Exact & near-date tuples</div>
        </div>

        {/* Findings Awaiting Review */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-600">{summary?.findingsAwaitingReview || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Of {summary?.totalFindings || 0} total findings</div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Spending Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expenditure by Department</h3>
              <p className="text-xs text-slate-500">Calculated from verified transaction records</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
              Top Departments
            </span>
          </div>

          <div className="h-68">
            {charts?.spendingByDepartment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.spendingByDepartment} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Disbursed']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No departmental transactions available to graph
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Spending Trajectory</h3>
              <p className="text-xs text-slate-500">Temporal cash disbursement curve across fiscal cycle</p>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>

          <div className="h-68">
            {charts?.monthlySpending?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlySpending} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Disbursement']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="expenditure" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Temporal records insufficient for trend analysis
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Findings Breakdown & Reconciliation Benchmarking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Findings by Severity (Donut Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Findings by Severity</h3>
          <p className="text-xs text-slate-500 mb-4">Risk prioritization breakdown</p>

          <div className="h-56">
            {charts?.findingsBySeverity?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.findingsBySeverity}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {charts.findingsBySeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={severityColors[entry.severity] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active findings flagged
              </div>
            )}
          </div>
        </div>

        {/* Findings by Review Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Review Center Progress</h3>
          <p className="text-xs text-slate-500 mb-4">Human verification workflow status</p>

          <div className="h-56">
            {charts?.findingsByStatus?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.findingsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {charts.findingsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No items in review pipeline
              </div>
            )}
          </div>
        </div>

        {/* Official vs Recorded Reconciliation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Reconciliation Comparison</h3>
              <p className="text-xs text-slate-500">Official Treasury Allocation vs Recorded Spend</p>
            </div>
            <Link to="/reconciliation" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              Details →
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-3">
            {charts?.reconciliationComparison?.length > 0 ? (
              charts.reconciliationComparison.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-semibold text-slate-800">
                    <span>{r.department}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      r.status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                    <div>
                      Official: <span className="font-semibold text-slate-900">₹{Number(r.official).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      Recorded: <span className="font-semibold text-slate-900">₹{Number(r.recorded).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Difference (Official - Recorded):{' '}
                    <span className={`font-semibold ${r.difference !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{Number(r.difference).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400">
                <Scale className="w-8 h-8 text-slate-300 mb-2" />
                No reconciliation runs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Audit Findings</h3>
            <p className="text-xs text-slate-500">Latest flagged duplicate candidates & statistical irregularities</p>
          </div>
          <Link to="/findings" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
            <span>View All Findings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3 px-6">Finding ID</th>
                <th className="py-3 px-6">Title & Summary</th>
                <th className="py-3 px-6">Amount Involved</th>
                <th className="py-3 px-6">Severity</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentActivity?.recentFindings?.length > 0 ? (
                recentActivity.recentFindings.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-900">{f.findingId}</td>
                    <td className="py-3.5 px-6 max-w-md">
                      <div className="font-semibold text-slate-900 truncate">{f.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{f.explanation}</div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {f.amountInvolved ? `₹${Number(f.amountInvolved).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                        f.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        f.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-slate-600 font-medium">{f.reviewStatus}</span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/findings?id=${f._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                      >
                        <span>Investigate</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No findings recorded. Upload expenditure data to run analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
