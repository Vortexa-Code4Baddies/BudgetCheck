import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Trash2,
  Table,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const UploadData = () => {
  const [step, setStep] = useState(1); // 1: Select file, 2: Column Mapping & Preview, 3: Saving
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Parsed metadata from backend
  const [parsedData, setParsedData] = useState(null);

  // Mapping state
  const [datasetName, setDatasetName] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('FY 2025-26 Q4');
  const [notes, setNotes] = useState('');
  const [columnMapping, setColumnMapping] = useState({
    transactionId: '',
    date: '',
    department: '',
    category: '',
    description: '',
    vendor: '',
    amount: '',
    paymentReference: '',
    status: '',
  });

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv') && !selected.name.toLowerCase().endsWith('.txt')) {
        toast.error('Please upload a valid CSV file (.csv)');
        return;
      }
      setFile(selected);
      setDatasetName(selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith('.csv') && !dropped.name.toLowerCase().endsWith('.txt')) {
        toast.error('Please upload a valid CSV file (.csv)');
        return;
      }
      setFile(dropped);
      setDatasetName(dropped.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Parsing CSV buffer and normalizing headers...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setParsedData(res.data);
        setColumnMapping(res.data.suggestedMapping || {});
        setStep(2);
        toast.success(`Parsed ${res.data.totalRows} rows successfully!`, { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error parsing CSV file', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!datasetName.trim()) {
      toast.error('Please provide a name for this dataset');
      return;
    }

    if (!columnMapping.amount) {
      toast.error('Please map the Amount column. Financial analysis requires an expenditure amount.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Validating records and storing in database...');

    try {
      const payload = {
        name: datasetName.trim(),
        originalFilename: parsedData.originalFilename,
        columnMapping,
        records: parsedData.allRecords,
        reportingPeriod,
        notes,
      };

      const res = await api.post('/datasets/save', payload);

      if (res.data.success) {
        toast.success('Dataset validated and saved successfully!', { id: toastId });
        navigate(`/datasets/${res.data.dataset._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save dataset', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const standardFields = [
    { key: 'transactionId', label: 'Transaction ID / Voucher No', req: true },
    { key: 'amount', label: 'Expenditure Amount (INR)', req: true },
    { key: 'date', label: 'Transaction Date', req: true },
    { key: 'department', label: 'Department / Ministry', req: false },
    { key: 'category', label: 'Budget Category / Head', req: false },
    { key: 'vendor', label: 'Payee / Vendor / Contractor', req: false },
    { key: 'paymentReference', label: 'Payment Reference (RTGS/UTR)', req: false },
    { key: 'description', label: 'Item / Purpose Description', req: false },
    { key: 'status', label: 'Transaction Status', req: false },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Expenditure Dataset</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest raw municipal or state treasury CSV files with custom column mapping and integrity checks
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-teal-600' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}>1</div>
          <span>Upload CSV File</span>
        </div>
        <div className="w-10 h-px bg-slate-200"></div>
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-teal-600' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}>2</div>
          <span>Column Mapping & Preview</span>
        </div>
        <div className="w-10 h-px bg-slate-200"></div>
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-teal-600' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}>3</div>
          <span>Audit Validation & Storage</span>
        </div>
      </div>

      {/* STEP 1: FILE SELECTOR */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-10 text-center transition bg-slate-50/50 hover:bg-teal-50/20 cursor-pointer"
            onClick={() => document.getElementById('csvFileInput').click()}
          >
            <input
              id="csvFileInput"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Select or Drag & Drop Public Expenditure CSV
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Supports UTF-8, UTF-8 BOM, quoted strings, and multi-line records (Max. 10 MB)
            </p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition">
              Browse Local Files
            </span>
          </div>

          {file && (
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-teal-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-900">{file.name}</div>
                  <div className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleUploadAndParse}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <span>{uploading ? 'Analyzing CSV Structure...' : 'Proceed to Column Mapping'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & PREVIEW */}
      {step === 2 && parsedData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Map CSV Columns to Standard Fields</h3>
                <p className="text-xs text-slate-500">
                  Fiscora automatically mapped candidate headers. Review and adjust associations below.
                </p>
              </div>
              <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                {parsedData.totalRows} records detected
              </div>
            </div>

            {/* Dataset Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none"
                  placeholder="e.g. State Treasury Q4 Capital Works 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reporting Period / Fiscal Quarter
                </label>
                <input
                  type="text"
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none"
                  placeholder="e.g. FY 2025-26 Q4"
                />
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {standardFields.map((field) => (
                <div key={field.key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      {field.label} {field.req && <span className="text-rose-500">*</span>}
                    </span>
                  </div>

                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none font-medium"
                  >
                    <option value="">-- (Not Mapped) --</option>
                    {parsedData.rawHeaders.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Raw Data Preview Table */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-teal-600" />
                  Initial Records Sample Preview (First {parsedData.preview?.length || 0} rows)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      {parsedData.rawHeaders.map((hdr) => (
                        <th key={hdr} className="py-2.5 px-3 whitespace-nowrap">
                          {hdr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {parsedData.preview?.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{i + 1}</td>
                        {parsedData.rawHeaders.map((hdr) => (
                          <td key={hdr} className="py-2 px-3 whitespace-nowrap text-slate-800">
                            {row[hdr] !== undefined ? String(row[hdr]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Back to File Selection
              </button>

              <button
                onClick={handleConfirmAndSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Processing Records...' : 'Save & Validate Dataset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
