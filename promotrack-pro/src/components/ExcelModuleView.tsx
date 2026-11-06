import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Database,
  FileCheck,
  Layers,
  Users,
  TrendingUp,
  X
} from 'lucide-react';
import { ExcelImportRow, Store, UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface ExcelModuleViewProps {
  stores: Store[];
  currentUser: UserProfile;
  language: Language;
  onRefreshData: () => void;
  onNavigateTab: (tab: 'dashboard' | 'stores' | 'promotions' | 'tracking' | 'tasks') => void;
}

export const ExcelModuleView: React.FC<ExcelModuleViewProps> = ({
  stores,
  currentUser,
  language,
  onRefreshData,
  onNavigateTab
}) => {
  const t = translations[language];

  // Active tab inside Excel center: 'import' | 'export'
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Import workflow states
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ExcelImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

  // Execution summary state
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // File drop/selection handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    setFileName(file.name);
    setIsParsing(true);
    setImportSummary(null);

    try {
      const result = await dataService.parseExcelFile(file);
      setParsedRows(result.rows);
      setHeaders(result.headers);
      setErrors(result.errors);
      setWarnings(result.warnings);
      triggerHaptic('success');
    } catch (err: any) {
      triggerHaptic('warning');
      setErrors([err.message || 'Error parsing workbook. Please verify the file is a valid Excel document.']);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute batch import
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;

    triggerHaptic('success');
    const res = dataService.batchImportStores(parsedRows, duplicateStrategy);
    if (res.success) {
      setImportSummary({
        total: parsedRows.length,
        imported: res.importedCount,
        updated: res.updatedCount,
        skipped: res.skippedCount
      });
      onRefreshData();
    }
  };

  const resetImport = () => {
    triggerHaptic('light');
    setFileName('');
    setParsedRows([]);
    setHeaders([]);
    setErrors([]);
    setWarnings([]);
    setImportSummary(null);
  };

  const handleDownloadTemplate = () => {
    triggerHaptic('medium');
    window.location.href = `${import.meta.env.BASE_URL}templates/store_import_template.xlsx`;
  };

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const duplicateRowsCount = parsedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.excelCenterTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.excelCenterSubtitle}
          </p>
        </div>

        {/* Tab Switcher with tactile animation */}
        <div className="glass-card p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('import');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.importTab}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('export');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.exportTab}
          </motion.button>
        </div>
      </div>

      {/* TAB 1: IMPORT STORES */}
      {activeTab === 'import' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Admin Role Permission Notice */}
          {currentUser.role !== 'admin' ? (
            <div className="glass-panel p-6 rounded-3xl text-center space-y-2 border-amber-500/30">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Admin Privileges Required
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Only Administrator accounts can import new retail store data via Excel. Please switch to the Admin persona using the top user profile switcher.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Upload Dropzone & Template Download */}
              <div className="glass-panel p-4 sm:p-6 rounded-3xl shadow-sm space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Step 1: Select File (.xlsx, .xls, .csv)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Columns: Store Code, Store Name, Channel, Sub Channel, Assigned Sales
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleDownloadTemplate}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.downloadTemplate}</span>
                  </motion.button>
                </div>

                {!parsedRows.length && !importSummary ? (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-900/30 active:scale-98">
                    <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 mb-2" />
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-center">
                      {isParsing ? t.parsingWorkbook : t.uploadPrompt}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {t.supportedFormats}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      disabled={isParsing}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate max-w-[200px]">
                        {fileName}
                      </span>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={resetImport}
                      className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{language === 'lo' ? 'ເລືອກໄຟລ໌ໃໝ່' : 'New File'}</span>
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Errors & Warnings */}
              {errors.length > 0 && (
                <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>File Validation Errors:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step 2: Data Preview & Duplicate Options */}
              {parsedRows.length > 0 && !importSummary && (
                <div className="glass-panel p-4 sm:p-6 rounded-3xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {t.previewTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.totalRowsDetected}: <strong>{parsedRows.length}</strong> | {t.validRows}: <strong className="text-emerald-600">{validRowsCount}</strong>
                        {duplicateRowsCount > 0 && (
                          <span className="ml-2 text-amber-600 font-bold">({duplicateRowsCount} duplicates)</span>
                        )}
                      </p>
                    </div>

                    {/* Duplicate Strategy Radio */}
                    <div className="flex items-center gap-3 text-xs bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 pl-1">
                        Duplicates:
                      </span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="dupStrategy"
                          checked={duplicateStrategy === 'skip'}
                          onChange={() => {
                            triggerHaptic('light');
                            setDuplicateStrategy('skip');
                          }}
                          className="text-emerald-600"
                        />
                        <span>Skip</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="dupStrategy"
                          checked={duplicateStrategy === 'update'}
                          onChange={() => {
                            triggerHaptic('light');
                            setDuplicateStrategy('update');
                          }}
                          className="text-emerald-600"
                        />
                        <span>Update</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto max-h-64 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Store Code</th>
                          <th className="py-2.5 px-3">Store Name</th>
                          <th className="py-2.5 px-3">Channel</th>
                          <th className="py-2.5 px-3">Sub Channel</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {parsedRows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className={row.isValid ? '' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                            <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold">{row.storeCode}</td>
                            <td className="py-2 px-3">{row.storeName}</td>
                            <td className="py-2 px-3">{row.channel}</td>
                            <td className="py-2 px-3">{row.subChannel}</td>
                            <td className="py-2 px-3">
                              {row.isDuplicate ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Duplicate ({duplicateStrategy})
                                </span>
                              ) : row.isValid ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Valid
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  {row.errors?.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Execution Action Button */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={handleExecuteImport}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{t.proceedImport}</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Step 3: Success Summary Dialog */}
              {importSummary && (
                <div className="glass-panel p-5 sm:p-6 rounded-3xl shadow-md border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.importSuccessSummary}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {language === 'lo' ? 'ຖານຂໍ້ມູນຮ້ານຄ້າໄດ້ຖືກອັບເດດຮຽບຮ້ອຍແລ້ວ' : 'The store database has been updated and synchronized.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border text-center">
                      <span className="text-[10px] text-slate-400">Total Rows</span>
                      <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">{importSummary.total}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border text-center">
                      <span className="text-[10px] text-emerald-600 font-bold">New Stores</span>
                      <p className="text-base sm:text-lg font-black text-emerald-600">{importSummary.imported}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border text-center">
                      <span className="text-[10px] text-blue-600 font-bold">Updated</span>
                      <p className="text-base sm:text-lg font-black text-blue-600">{importSummary.updated}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border text-center">
                      <span className="text-[10px] text-slate-400">Skipped</span>
                      <p className="text-base sm:text-lg font-black text-slate-600 dark:text-slate-400">{importSummary.skipped}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={resetImport}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      {language === 'lo' ? 'ນຳເຂົ້າໄຟລ໌ອື່ນ' : 'Import Another File'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onNavigateTab('stores')}
                      className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      {language === 'lo' ? 'ເບິ່ງລາຍຊື່ຮ້ານ' : 'View Stores'}
                    </motion.button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* TAB 2: EXPORT REPORTS */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Card 1: Export Stores */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.exportStoresBtn}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Full workbook export of retail outlets, channels, assigned sales reps, contact numbers, and cities.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('medium');
                dataService.exportStoresToExcel();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Stores (.xlsx)</span>
            </motion.button>
          </motion.div>

          {/* Card 2: Export Promotion Tracking Results */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.exportPromotionResultsBtn}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Store-by-store promotion order records, order dates, amounts in LAK, follow-up dates, and field remarks.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('medium');
                dataService.exportPromotionResultsToExcel();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Promotion Orders (.xlsx)</span>
            </motion.button>
          </motion.div>

          {/* Card 3: Export Follow-up Tasks */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.exportTasksBtn}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                All assigned follow-up tasks with due dates, priority tags, completion statuses, and store associations.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('medium');
                dataService.exportTasksToExcel();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Tasks (.xlsx)</span>
            </motion.button>
          </motion.div>

          {/* Card 4: Export Sales Representative Performance */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.exportPerformanceBtn}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Aggregated sales KPI report comparing each representative's assigned stores, conversion rate, and revenue.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('medium');
                dataService.exportPerformanceReportToExcel();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Performance (.xlsx)</span>
            </motion.button>
          </motion.div>

        </div>
      )}

    </div>
  );
};
