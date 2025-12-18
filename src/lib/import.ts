/**
 * Import utilities for trading data
 * Supports CSV and Excel imports with validation
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Trade, PositionType, TradeStatus, EmotionType } from '@/types/Trading';
import { generateId } from './utils';
import { useTradingModeStore } from '@/store/tradingModeStore';

/**
 * Validation errors
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  trades: Trade[];
  errors: ImportError[];
  warnings: string[];
}

/**
 * Validate and parse a single trade row
 */
function parseTradeRow(row: Record<string, any>, rowIndex: number): { trade: Trade | null; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const now = new Date().toISOString();

  // Required fields
  const asset = row['Activo'] || row['asset'];
  const entryPrice = parseFloat(row['Precio Entrada'] || row['entryPrice']);
  const positionSize = parseFloat(row['Tamaño Posición'] || row['positionSize']);
  const entryDate = row['Fecha Entrada'] || row['entryDate'];

  if (!asset) {
    errors.push({ row: rowIndex, field: 'asset', message: 'Activo es requerido' });
  }
  if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
    errors.push({ row: rowIndex, field: 'entryPrice', message: 'Precio de entrada debe ser un número positivo' });
  }
  if (!positionSize || isNaN(positionSize) || positionSize <= 0) {
    errors.push({ row: rowIndex, field: 'positionSize', message: 'Tamaño de posición debe ser un número positivo' });
  }
  if (!entryDate) {
    errors.push({ row: rowIndex, field: 'entryDate', message: 'Fecha de entrada es requerida' });
  }

  if (errors.length > 0) {
    return { trade: null, errors };
  }

  // Parse position type
  const positionTypeStr = (row['Tipo'] || row['positionType'] || 'long').toString().toLowerCase();
  const positionType: PositionType = positionTypeStr.includes('compra') || positionTypeStr === 'long' ? 'long' : 'short';

  // Parse status
  const statusStr = (row['Estado'] || row['status'] || 'closed').toString().toLowerCase();
  const status: TradeStatus = statusStr.includes('abierta') || statusStr === 'open' ? 'open' : 'closed';

  // Parse optional fields
  const exitPrice = row['Precio Salida'] || row['exitPrice'] ? parseFloat(row['Precio Salida'] || row['exitPrice']) : null;
  const exitDate = row['Fecha Salida'] || row['exitDate'] || null;
  const leverage = row['Apalancamiento'] || row['leverage'] ? parseFloat(row['Apalancamiento'] || row['leverage']) : null;
  const stopLoss = row['Stop Loss'] || row['stopLoss'] ? parseFloat(row['Stop Loss'] || row['stopLoss']) : null;
  const takeProfit = row['Take Profit'] || row['takeProfit'] ? parseFloat(row['Take Profit'] || row['takeProfit']) : null;
  const pnl = row['PnL'] || row['pnl'] ? parseFloat(row['PnL'] || row['pnl']) : null;
  const riskReward = row['Risk/Reward'] || row['riskReward'] ? parseFloat(row['Risk/Reward'] || row['riskReward']) : null;
  const notes = row['Notas'] || row['notes'] || '';

  // Parse tags
  const tagsStr = row['Tags'] || row['tags'] || '';
  const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0) : [];

  // Parse journal
  const parseEmotion = (emotionStr: string | null | undefined): EmotionType | null => {
    if (!emotionStr) return null;
    const emotions: EmotionType[] = ['confiado', 'ansioso', 'temeroso', 'emocionado', 'neutral', 'frustrado', 'euforico', 'deprimido'];
    const normalized = emotionStr.toString().toLowerCase().trim();
    return emotions.find(e => e === normalized) || null;
  };

  const journal = {
    preTrade: {
      technicalAnalysis: row['Análisis Técnico'] || '',
      marketSentiment: row['Sentimiento de Mercado'] || '',
      entryReasons: row['Razones de Entrada'] || '',
      emotion: parseEmotion(row['Emoción Pre-Operación']),
    },
    duringTrade: {
      marketChanges: row['Cambios de Mercado'] || '',
      stopLossAdjustments: row['Ajustes SL'] || '',
      takeProfitAdjustments: row['Ajustes TP'] || '',
      emotion: parseEmotion(row['Emoción Durante']),
    },
    postTrade: {
      whatWentWell: row['Qué Salió Bien'] || '',
      whatWentWrong: row['Qué Salió Mal'] || '',
      lessonsLearned: row['Lecciones Aprendidas'] || '',
      emotion: parseEmotion(row['Emoción Post-Operación']),
    },
  };

  // Use existing ID or generate new one
  const id = row['ID'] || row['id'] || generateId();
  const createdAt = row['Fecha Creación'] || row['createdAt'] || entryDate || now;
  const updatedAt = row['Fecha Actualización'] || row['updatedAt'] || now;

  // Get current trading mode (default to simulation if not available)
  const currentMode = useTradingModeStore.getState?.()?.mode || 'simulation';

  const trade: Trade = {
    id,
    asset,
    positionType,
    entryPrice,
    exitPrice,
    positionSize,
    leverage,
    stopLoss,
    takeProfit,
    entryDate: entryDate.includes('T') ? entryDate : `${entryDate}T00:00:00.000Z`,
    exitDate: exitDate ? (exitDate.includes('T') ? exitDate : `${exitDate}T00:00:00.000Z`) : null,
    notes,
    screenshots: [],
    videos: [],
    tags,
    journal,
    status,
    pnl,
    riskReward,
    createdAt: createdAt.includes('T') ? createdAt : `${createdAt}T00:00:00.000Z`,
    updatedAt: updatedAt.includes('T') ? updatedAt : `${updatedAt}T00:00:00.000Z`,
    mode: (row['Modo'] || row['mode'] || currentMode) as 'simulation' | 'demo' | 'live', // Use current mode or mode from file
  };

  return { trade, errors: [] };
}

/**
 * Import from CSV file
 */
export async function importFromCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        const trades: Trade[] = [];
        const errors: ImportError[] = [];
        const warnings: string[] = [];

        result.data.forEach((row: any, index: number) => {
          const { trade, errors: rowErrors } = parseTradeRow(row, index + 2); // +2 because header is row 1 and 0-indexed
          
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else if (trade) {
            trades.push(trade);
          } else {
            warnings.push(`Fila ${index + 2}: No se pudo parsear la operación`);
          }
        });

        resolve({ trades, errors, warnings });
      } catch (error) {
        reject(new Error(`Error al leer el archivo CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Import from Excel file
 */
export async function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const trades: Trade[] = [];
        const errors: ImportError[] = [];
        const warnings: string[] = [];

        rows.forEach((row: any, index: number) => {
          const { trade, errors: rowErrors } = parseTradeRow(row, index + 2); // +2 because header is row 1 and 0-indexed
          
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else if (trade) {
            trades.push(trade);
          } else {
            warnings.push(`Fila ${index + 2}: No se pudo parsear la operación`);
          }
        });

        resolve({ trades, errors, warnings });
      } catch (error) {
        reject(new Error(`Error al leer el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import from JSON file
 */
export async function importFromJSON(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        
        // Support both direct array and wrapped format
        const tradesArray = Array.isArray(data) ? data : (data.trades || []);
        
        const trades: Trade[] = [];
        const errors: ImportError[] = [];
        const warnings: string[] = [];

        tradesArray.forEach((tradeData: any, index: number) => {
          try {
            // Validate required fields
            if (!tradeData.asset || !tradeData.entryPrice || !tradeData.positionSize || !tradeData.entryDate) {
              errors.push({
                row: index + 1,
                field: 'validation',
                message: 'Faltan campos requeridos (asset, entryPrice, positionSize, entryDate)',
              });
              return;
            }

            // Get current trading mode (default to simulation if not available)
            const currentMode = useTradingModeStore.getState?.()?.mode || 'simulation';
            
            // Ensure all required fields exist
            const trade: Trade = {
              mode: (tradeData.mode || currentMode) as 'simulation' | 'demo' | 'live', // Use mode from data or current mode
              id: tradeData.id || generateId(),
              asset: tradeData.asset,
              positionType: tradeData.positionType || 'long',
              entryPrice: tradeData.entryPrice,
              exitPrice: tradeData.exitPrice || null,
              positionSize: tradeData.positionSize,
              leverage: tradeData.leverage || null,
              stopLoss: tradeData.stopLoss || null,
              takeProfit: tradeData.takeProfit || null,
              entryDate: tradeData.entryDate,
              exitDate: tradeData.exitDate || null,
              notes: tradeData.notes || '',
              screenshots: tradeData.screenshots || [],
              videos: tradeData.videos || [],
              tags: tradeData.tags || [],
              journal: tradeData.journal || {
                preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
                duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
                postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
              },
              status: tradeData.status || 'closed',
              pnl: tradeData.pnl || null,
              riskReward: tradeData.riskReward || null,
              createdAt: tradeData.createdAt || new Date().toISOString(),
              updatedAt: tradeData.updatedAt || new Date().toISOString(),
            };

            trades.push(trade);
          } catch (error) {
            warnings.push(`Operación ${index + 1}: ${error instanceof Error ? error.message : 'Error al parsear'}`);
          }
        });

        resolve({ trades, errors, warnings });
      } catch (error) {
        reject(new Error(`Error al leer el archivo JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

