/**
 * Export utilities for trading data
 * Supports CSV, Excel, JSON, and PDF exports
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Trade } from '@/types/Trading';

/**
 * Flatten trade data for CSV/Excel export
 */
function flattenTrade(trade: Trade): Record<string, any> {
  return {
    'ID': trade.id,
    'Activo': trade.asset,
    'Tipo': trade.positionType === 'long' ? 'Compra' : 'Venta',
    'Precio Entrada': trade.entryPrice,
    'Precio Salida': trade.exitPrice || '',
    'Tamaño Posición': trade.positionSize,
    'Apalancamiento': trade.leverage || '',
    'Stop Loss': trade.stopLoss || '',
    'Take Profit': trade.takeProfit || '',
    'Fecha Entrada': new Date(trade.entryDate).toLocaleDateString('es-ES'),
    'Fecha Salida': trade.exitDate ? new Date(trade.exitDate).toLocaleDateString('es-ES') : '',
    'Estado': trade.status === 'open' ? 'Abierta' : 'Cerrada',
    'PnL': trade.pnl || '',
    'Risk/Reward': trade.riskReward ? trade.riskReward.toFixed(2) : '',
    'Tags': trade.tags.join(', '),
    'Notas': trade.notes,
    // Journal fields
    'Análisis Técnico': trade.journal?.preTrade?.technicalAnalysis || '',
    'Sentimiento de Mercado': trade.journal?.preTrade?.marketSentiment || '',
    'Razones de Entrada': trade.journal?.preTrade?.entryReasons || '',
    'Emoción Pre-Operación': trade.journal?.preTrade?.emotion || '',
    'Cambios de Mercado': trade.journal?.duringTrade?.marketChanges || '',
    'Ajustes SL': trade.journal?.duringTrade?.stopLossAdjustments || '',
    'Ajustes TP': trade.journal?.duringTrade?.takeProfitAdjustments || '',
    'Emoción Durante': trade.journal?.duringTrade?.emotion || '',
    'Qué Salió Bien': trade.journal?.postTrade?.whatWentWell || '',
    'Qué Salió Mal': trade.journal?.postTrade?.whatWentWrong || '',
    'Lecciones Aprendidas': trade.journal?.postTrade?.lessonsLearned || '',
    'Emoción Post-Operación': trade.journal?.postTrade?.emotion || '',
    'Screenshots': trade.screenshots.length,
    'Videos': trade.videos.length,
    'Fecha Creación': new Date(trade.createdAt).toLocaleDateString('es-ES'),
    'Fecha Actualización': new Date(trade.updatedAt).toLocaleDateString('es-ES'),
  };
}

/**
 * Export trades to CSV
 */
export function exportToCSV(trades: Trade[], filename: string = 'operaciones'): void {
  const flattened = trades.map(flattenTrade);
  const csv = Papa.unparse(flattened, {
    header: true,
    delimiter: ',',
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export trades to Excel with professional formatting
 */
export function exportToExcel(trades: Trade[], filename: string = 'operaciones'): void {
  const flattened = trades.map(flattenTrade);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(flattened);
  
  // Set column widths
  const colWidths = [
    { wch: 36 }, // ID
    { wch: 12 }, // Activo
    { wch: 8 },  // Tipo
    { wch: 12 }, // Precio Entrada
    { wch: 12 }, // Precio Salida
    { wch: 14 }, // Tamaño Posición
    { wch: 12 }, // Apalancamiento
    { wch: 10 }, // Stop Loss
    { wch: 12 }, // Take Profit
    { wch: 12 }, // Fecha Entrada
    { wch: 12 }, // Fecha Salida
    { wch: 10 }, // Estado
    { wch: 12 }, // PnL
    { wch: 12 }, // Risk/Reward
    { wch: 20 }, // Tags
    { wch: 30 }, // Notas
    { wch: 25 }, // Análisis Técnico
    { wch: 25 }, // Sentimiento
    { wch: 25 }, // Razones
    { wch: 18 }, // Emoción Pre
    { wch: 25 }, // Cambios
    { wch: 15 }, // Ajustes SL
    { wch: 15 }, // Ajustes TP
    { wch: 18 }, // Emoción Durante
    { wch: 30 }, // Qué Salió Bien
    { wch: 30 }, // Qué Salió Mal
    { wch: 30 }, // Lecciones
    { wch: 20 }, // Emoción Post
    { wch: 12 }, // Screenshots
    { wch: 10 }, // Videos
    { wch: 12 }, // Fecha Creación
    { wch: 12 }, // Fecha Actualización
  ];
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Operaciones');
  
  // Write file
  const excelFilename = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, excelFilename);
}

/**
 * Export trades to JSON
 */
export function exportToJSON(trades: Trade[], filename: string = 'operaciones'): void {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    trades,
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export chart as image (PNG/JPG)
 */
export async function exportChartAsImage(
  elementId: string,
  filename: string = 'grafico',
  format: 'png' | 'jpg' = 'png',
  quality: number = 1.0
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL(`image/${format}`, quality);
    const link = document.createElement('a');
    
    link.setAttribute('href', imgData);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.${format}`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error('Failed to export chart as image');
  }
}

/**
 * Export report to PDF with charts
 */
export async function exportReportToPDF(
  title: string,
  content: HTMLElement,
  filename: string = 'reporte',
  includeCharts: boolean = true
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  // Add title
  pdf.setFontSize(20);
  pdf.text(title, margin, 30);
  
  // Add date
  pdf.setFontSize(10);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, margin, 40);
  pdf.setTextColor(0, 0, 0);
  
  let yPosition = 50;
  
  // Convert content to canvas if it includes charts
  if (includeCharts) {
    try {
      const canvas = await html2canvas(content, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        height: content.scrollHeight,
        width: content.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Error converting content to image:', error);
      // Fallback: add text content only
      pdf.setFontSize(12);
      pdf.text('Error al incluir gráficos en el PDF', margin, yPosition);
      yPosition += 10;
    }
  } else {
    // Add text content only
    pdf.setFontSize(12);
    const text = content.innerText || content.textContent || '';
    const lines = pdf.splitTextToSize(text, contentWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 7;
    });
  }
  
  // Save PDF
  pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Create automatic backup to JSON
 */
export function createBackup(trades: Trade[]): string {
  const data = {
    backupDate: new Date().toISOString(),
    version: '1.0',
    trades,
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Save backup to localStorage
 */
export function saveBackupToLocalStorage(trades: Trade[]): void {
  const backup = createBackup(trades);
  const backupKey = `trading_backup_${new Date().toISOString().split('T')[0]}`;
  
  try {
    localStorage.setItem(backupKey, backup);
    
    // Keep only last 30 days of backups
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(k => k.startsWith('trading_backup_')).sort();
    
    if (backupKeys.length > 30) {
      const keysToRemove = backupKeys.slice(0, backupKeys.length - 30);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Error saving backup to localStorage:', error);
    // If localStorage is full, try to clear old backups
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(k => k.startsWith('trading_backup_')).sort();
    if (backupKeys.length > 0) {
      // Remove oldest 10 backups
      backupKeys.slice(0, 10).forEach(key => localStorage.removeItem(key));
      // Try again
      try {
        localStorage.setItem(backupKey, backup);
      } catch (retryError) {
        console.error('Failed to save backup after cleanup:', retryError);
      }
    }
  }
}

