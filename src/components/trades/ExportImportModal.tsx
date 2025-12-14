/**
 * Export/Import Modal Component
 * Handles all export and import operations
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Upload, FileText, FileSpreadsheet, FileJson, FileText as FilePdfIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToJSON, exportReportToPDF } from '@/lib/export';
import { importFromCSV, importFromExcel, importFromJSON, type ImportResult } from '@/lib/import';
import type { Trade } from '@/types/Trading';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onImportComplete: (trades: Trade[]) => void;
}

type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  trades,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<Trade[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportToCSV(trades);
          break;
        case 'excel':
          exportToExcel(trades);
          break;
        case 'json':
          exportToJSON(trades);
          break;
        case 'pdf':
          // For PDF, we need to create a report element
          const reportElement = document.createElement('div');
          reportElement.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
              <h1>Reporte de Operaciones</h1>
              <p>Total de operaciones: ${trades.length}</p>
              <p>Operaciones cerradas: ${trades.filter(t => t.status === 'closed').length}</p>
              <p>Operaciones abiertas: ${trades.filter(t => t.status === 'open').length}</p>
            </div>
          `;
          document.body.appendChild(reportElement);
          await exportReportToPDF('Reporte de Operaciones', reportElement, 'reporte_operaciones', true);
          document.body.removeChild(reportElement);
          break;
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert(`Error al exportar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    setImportPreview([]);

    try {
      let result: ImportResult;

      if (file.name.endsWith('.csv')) {
        result = await importFromCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await importFromExcel(file);
      } else if (file.name.endsWith('.json')) {
        result = await importFromJSON(file);
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV, Excel o JSON.');
      }

      setImportResult(result);
      setImportPreview(result.trades.slice(0, 5)); // Preview first 5 trades
    } catch (error) {
      console.error('Error importing:', error);
      alert(`Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.trades.length > 0) {
      onImportComplete(importResult.trades);
      setImportResult(null);
      setImportPreview([]);
      onClose();
    }
  };

  const handleCancelImport = () => {
    setImportResult(null);
    setImportPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar / Importar Operaciones"
      size="lg"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Exportar
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'import'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Importar
          </button>
        </div>

        {/* Export Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Exporta tus operaciones en diferentes formatos
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || trades.length === 0}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-auto py-3"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-muted-foreground">Formato simple</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleExport('excel')}
                  disabled={isExporting || trades.length === 0}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-auto py-3"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">Excel</div>
                    <div className="text-xs text-muted-foreground">Con formato</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleExport('json')}
                  disabled={isExporting || trades.length === 0}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-auto py-3"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileJson className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-muted-foreground">Respaldo completo</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || trades.length === 0}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-auto py-3"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePdfIcon className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">PDF</div>
                    <div className="text-xs text-muted-foreground">Reporte</div>
                  </div>
                </Button>
              </div>

              {trades.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay operaciones para exportar
                </p>
              )}
            </motion.div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Importa operaciones desde CSV, Excel o JSON
              </p>

              {!importResult && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Selecciona un archivo</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Formatos soportados: CSV, Excel (.xlsx, .xls), JSON
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-import"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      variant="outline"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Seleccionar Archivo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    importResult.errors.length > 0
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      {importResult.errors.length > 0 ? (
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">
                          {importResult.trades.length} operación(es) importada(s)
                        </h4>
                        {importResult.errors.length > 0 && (
                          <div className="text-sm text-destructive mb-2">
                            {importResult.errors.length} error(es) encontrado(s)
                          </div>
                        )}
                        {importResult.warnings.length > 0 && (
                          <div className="text-sm text-yellow-600 mb-2">
                            {importResult.warnings.length} advertencia(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      <p className="text-sm font-medium">Errores:</p>
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <div key={idx} className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                          Fila {error.row}, {error.field}: {error.message}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ... y {importResult.errors.length - 10} error(es) más
                        </p>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {importPreview.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Vista previa (primeras 5 operaciones):</p>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left">Activo</th>
                                <th className="p-2 text-left">Tipo</th>
                                <th className="p-2 text-left">Precio Entrada</th>
                                <th className="p-2 text-left">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importPreview.map((trade) => (
                                <tr key={trade.id} className="border-t">
                                  <td className="p-2">{trade.asset}</td>
                                  <td className="p-2">{trade.positionType === 'long' ? 'Compra' : 'Venta'}</td>
                                  <td className="p-2">{trade.entryPrice}</td>
                                  <td className="p-2">{trade.status === 'open' ? 'Abierta' : 'Cerrada'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleCancelImport}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importResult.trades.length === 0}
                    >
                      Confirmar Importación ({importResult.trades.length})
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

