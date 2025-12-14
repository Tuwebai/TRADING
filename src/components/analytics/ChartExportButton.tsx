/**
 * Chart Export Button Component
 * Adds export functionality to charts
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from 'lucide-react';
import { exportChartAsImage } from '@/lib/export';

interface ChartExportButtonProps {
  chartId: string;
  filename?: string;
  className?: string;
}

export const ChartExportButton: React.FC<ChartExportButtonProps> = ({
  chartId,
  filename = 'grafico',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'png' | 'jpg') => {
    setIsExporting(true);
    try {
      await exportChartAsImage(chartId, filename, format);
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert(`Error al exportar gráfico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport('png')}
        disabled={isExporting}
        title="Exportar como PNG"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-2">PNG</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport('jpg')}
        disabled={isExporting}
        title="Exportar como JPG"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-2">JPG</span>
      </Button>
    </div>
  );
};

