/**
 * Trade OCR and Parsing Utilities
 * Extracts trade data from images using OCR and deterministic parsing
 */

import Tesseract from 'tesseract.js';

/**
 * Trade data extracted from OCR
 */
export interface ExtractedTradeData {
  asset?: string;
  positionType?: 'long' | 'short';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryDate?: string; // ISO date string
  exitPrice?: number;
  exitDate?: string; // ISO date string
  pnl?: number;
  positionSize?: number;
  leverage?: number;
  timeframe?: string;
  // Metadata
  confidence: number; // 0-1, overall confidence in extraction
  detectedFields: string[]; // List of fields that were detected
}

/**
 * Known trading symbols for validation
 */
const KNOWN_SYMBOLS = [
  // Forex majors
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  // Forex minors
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCHF', 'GBPCHF',
  // Indices
  'SPX500', 'NAS100', 'US30', 'UK100', 'GER40', 'JPN225',
  // Crypto
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT',
];

/**
 * Normalize text from OCR
 */
function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\.\-]/g, ' '); // Remove special chars except dots, dashes
}

/**
 * Extract asset symbol from text
 */
function extractAsset(text: string): string | undefined {
  const normalized = normalizeText(text);
  
  // Try to find known symbols
  for (const symbol of KNOWN_SYMBOLS) {
    if (normalized.includes(symbol)) {
      return symbol;
    }
  }
  
  // Try pattern matching for forex pairs (6 chars: XXXYYY)
  const forexPattern = /\b([A-Z]{6})\b/;
  const match = normalized.match(forexPattern);
  if (match) {
    const candidate = match[1];
    // Basic validation: should be 3+3 chars
    if (candidate.length === 6) {
      return candidate;
    }
  }
  
  return undefined;
}

/**
 * Extract position type (Buy/Sell/Long/Short)
 * Also handles TradingView format: "Posición larga" / "Posición corta"
 */
function extractPositionType(text: string): 'long' | 'short' | undefined {
  const normalized = normalizeText(text);
  
  // TradingView Spanish format
  if (normalized.includes('POSICION LARGA') || normalized.includes('POSICIÓN LARGA')) {
    return 'long';
  }
  if (normalized.includes('POSICION CORTA') || normalized.includes('POSICIÓN CORTA')) {
    return 'short';
  }
  
  // Standard formats
  if (normalized.includes('BUY') || normalized.includes('LONG') || normalized.includes('COMPRA')) {
    return 'long';
  }
  if (normalized.includes('SELL') || normalized.includes('SHORT') || normalized.includes('VENTA')) {
    return 'short';
  }
  
  return undefined;
}

/**
 * Extract price value (handles various formats)
 * Enhanced to handle TradingView format with "Precio" field after section headers
 */
function extractPrice(text: string, keywords: string[]): number | undefined {
  const normalized = normalizeText(text);
  
  // Strategy 1: Try direct patterns with keywords
  for (const keyword of keywords) {
    // Escape special regex characters in keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Look for pattern: KEYWORD NUMBER (direct)
    const directPattern = new RegExp(`${escapedKeyword}\\s*[:=]?\\s*([\\d,]+\\.?\\d*)`, 'i');
    const directMatch = normalized.match(directPattern);
    if (directMatch && directMatch[1]) {
      const value = parseFloat(directMatch[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1000000) { // Sanity check
        console.log(`Found price with keyword "${keyword}":`, value);
        return value;
      }
    }
  }
  
  // Strategy 2: For TradingView format - find keyword, then look for "Precio" in next section
  for (const keyword of keywords) {
    const keywordIndex = normalized.indexOf(keyword);
    if (keywordIndex !== -1) {
      // Look in a larger window (200 chars) to catch "Precio" field after section header
      const searchWindow = normalized.substring(keywordIndex, keywordIndex + 200);
      
      // Try to find "PRECIO" followed by number (most common TradingView format)
      const precioPatterns = [
        /PRECIO\s*[:=]\s*([\d,]+\.?\d*)/i,
        /PRECIO\s+([\d,]+\.?\d*)/i,
        /PRICE\s*[:=]\s*([\d,]+\.?\d*)/i,
      ];
      
      for (const pattern of precioPatterns) {
        const precioMatch = searchWindow.match(pattern);
        if (precioMatch && precioMatch[1]) {
          const value = parseFloat(precioMatch[1].replace(/,/g, ''));
          if (!isNaN(value) && value > 0 && value < 1000000) {
            console.log(`Found price with keyword "${keyword}" -> Precio:`, value);
            return value;
          }
        }
      }
      
      // Strategy 3: Find any decimal number (price-like) after the keyword
      // Look for patterns like 1.12345 (common price format)
      const pricePattern = /([\d]{1,6}\.[\d]{2,6})/;
      const priceMatch = searchWindow.match(pricePattern);
      if (priceMatch && priceMatch[1]) {
        const value = parseFloat(priceMatch[1]);
        if (!isNaN(value) && value > 0 && value < 1000000) {
          // Verify it looks like a price (has decimal point with 2-6 decimal places)
          const decimalPart = priceMatch[1].split('.')[1];
          if (decimalPart && decimalPart.length >= 2 && decimalPart.length <= 6) {
            console.log(`Found price-like number with keyword "${keyword}":`, value);
            return value;
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | undefined {
  const normalized = normalizeText(text);
  
  // Try common date patterns
  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/, // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/, // YYYY/MM/DD
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      try {
        // Try to parse as date
        let dateStr = match[0].replace(/[\/\-]/g, '-');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue trying
      }
    }
  }
  
  return undefined;
}

/**
 * Extract PnL from text
 */
function extractPnL(text: string): number | undefined {
  const normalized = normalizeText(text);
  
  // Look for PnL, Profit, Loss, Result patterns
  const keywords = ['PNL', 'PROFIT', 'LOSS', 'RESULT', 'RESULTADO', 'PL'];
  
  for (const keyword of keywords) {
    const patterns = [
      new RegExp(`${keyword}\\s*[:=]?\\s*([+-]?[\\d,]+\\.?\\d*)`, 'i'),
      new RegExp(`${keyword}\\s+([+-]?[\\d,]+\\.?\\d*)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) {
          return value;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Parse OCR text to extract trade data
 */
export function parseTradeText(ocrText: string): ExtractedTradeData {
  // Log raw OCR text for debugging
  console.log('Raw OCR Text:', ocrText);
  
  const normalized = normalizeText(ocrText);
  console.log('Normalized Text:', normalized);
  
  const detectedFields: string[] = [];
  let confidence = 0;
  
  const result: ExtractedTradeData = {
    confidence: 0,
    detectedFields: [],
  };
  
  // Extract asset
  const asset = extractAsset(normalized);
  if (asset) {
    result.asset = asset;
    detectedFields.push('asset');
    confidence += 0.2;
  }
  
  // Extract position type
  const positionType = extractPositionType(normalized);
  if (positionType) {
    result.positionType = positionType;
    detectedFields.push('positionType');
    confidence += 0.15;
  }
  
  // Extract entry price - TradingView uses "PRECIO DE ENTRADA"
  // Be careful: "PRECIO DE ENTRADA" should come before lot size to avoid confusion
  let entryPrice = extractPrice(normalized, [
    'PRECIO DE ENTRADA', 'ENTRY PRICE', 'PRECIO ENTRADA'
  ]);
  
  // If not found with specific keywords, try general ones but verify it's not a lot size
  if (!entryPrice) {
    const candidatePrice = extractPrice(normalized, [
      'ENTRY', 'ENTRADA', 'PRICE', 'PRECIO', 'OPEN', 'OPENED'
    ]);
    // Verify it looks like a price (has decimals, reasonable range)
    if (candidatePrice && candidatePrice > 0.1 && candidatePrice < 1000000) {
      const priceStr = candidatePrice.toString();
      // Prices usually have 2-6 decimal places
      const decimals = priceStr.split('.')[1]?.length || 0;
      if (decimals >= 2) {
        entryPrice = candidatePrice;
      }
    }
  }
  
  if (entryPrice) {
    result.entryPrice = entryPrice;
    detectedFields.push('entryPrice');
    confidence += 0.2;
  }
  
  // Extract stop loss - TradingView uses "NIVEL DE STOP" with "TICKS" and "Precio" fields
  // Pattern in OCR: "TICKS 136 - PRECIO 1.16972" (after NIVEL DE STOP section)
  let stopLoss = extractPrice(normalized, [
    'NIVEL DE STOP', 'STOP LEVEL', 'NIVEL STOP', 
    'STOP LOSS', 'STOP', 'SL', 'STOPLOSS',
    'PARADA', 'PERDIDA', 'PERDIDAS'
  ]);
  
  // If not found with keywords, try TradingView-specific pattern: TICKS followed by PRECIO
  if (!stopLoss && entryPrice) {
    // Find all TICKS-PRECIO patterns
    const allTicksPrecio = [...normalized.matchAll(/TICKS\s+\d+\s+[-\s]*PRECIO\s+([\d,]+\.?\d*)/gi)];
    console.log('Found TICKS-PRECIO patterns for SL:', allTicksPrecio.length);
    
    for (const match of allTicksPrecio) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1000000) {
        // For long positions: SL should be below entry price
        // For short positions: SL should be above entry price
        const isLong = positionType === 'long' || (!positionType && value < entryPrice);
        const shouldBeSL = isLong ? value < entryPrice : value > entryPrice;
        
        if (shouldBeSL) {
          stopLoss = value;
          console.log('Found stop loss via TICKS-PRECIO (price-based logic):', stopLoss);
          break;
        }
      }
    }
  }
  
  // Fallback: Look for "PRECIO" that appears after "TICKS"
  if (!stopLoss) {
    const ticksIndex = normalized.indexOf('TICKS');
    if (ticksIndex !== -1) {
      const afterTicks = normalized.substring(ticksIndex, ticksIndex + 100);
      const precioMatch = afterTicks.match(/PRECIO\s+([\d,]+\.?\d*)/i);
      if (precioMatch && precioMatch[1]) {
        const value = parseFloat(precioMatch[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 1000000) {
          // If we have entry price, verify it makes sense as SL
          if (!entryPrice || (entryPrice > value && positionType !== 'short')) {
            stopLoss = value;
            console.log('Found stop loss after TICKS (first match):', stopLoss);
          }
        }
      }
    }
  }
  
  // Last resort: Look for "NIVEL DE STOP" section
  if (!stopLoss) {
    const stopSectionPattern = /(?:NIVEL\s+DE\s+STOP|STOP\s+LEVEL|NIVEL\s+STOP)[\s\S]{0,200}?PRECIO\s*[:=]?\s*([\d,]+\.?\d*)/i;
    const stopSectionMatch = normalized.match(stopSectionPattern);
    if (stopSectionMatch && stopSectionMatch[1]) {
      const value = parseFloat(stopSectionMatch[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1000000) {
        stopLoss = value;
        console.log('Found stop loss via section pattern:', stopLoss);
      }
    }
  }
  
  if (stopLoss) {
    result.stopLoss = stopLoss;
    detectedFields.push('stopLoss');
    confidence += 0.15;
  }
  
  // Extract take profit - TradingView uses "NIVEL DE BENEFICIO" with "TICKS" and "Precio" fields
  // Pattern similar to stop loss: "TICKS [number] ... PRECIO [price]"
  let takeProfit = extractPrice(normalized, [
    'NIVEL DE BENEFICIO', 'PROFIT LEVEL', 'NIVEL BENEFICIO',
    'TAKE PROFIT', 'TP', 'TAKEPROFIT', 'PROFIT TARGET', 'TARGET',
    'BENEFICIO', 'BENEFICIOS', 'GANANCIA', 'GANANCIAS'
  ]);
  
  // If not found with keywords, find all TICKS-PRECIO patterns and use the one that's not SL
  if (!takeProfit && entryPrice) {
    const allTicksPrecio = [...normalized.matchAll(/TICKS\s+\d+\s+[-\s]*PRECIO\s+([\d,]+\.?\d*)/gi)];
    console.log('Checking TICKS-PRECIO patterns for TP:', allTicksPrecio.length);
    
    // Also search for any "PRECIO" that appears after "BENEFICIO" or "PROFIT" keywords
    const benefitioIndex = normalized.search(/\b(?:BENEFICIO|PROFIT|GANANCIA)\b/i);
    if (benefitioIndex !== -1) {
      const afterBeneficio = normalized.substring(benefitioIndex, benefitioIndex + 150);
      const precioAfterBeneficio = afterBeneficio.match(/PRECIO\s+([\d,]+\.?\d*)/i);
      if (precioAfterBeneficio && precioAfterBeneficio[1]) {
        const value = parseFloat(precioAfterBeneficio[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 1000000) {
          // Make sure it's not the same as stop loss or entry price
          if ((!stopLoss || Math.abs(value - stopLoss) > 0.001) && 
              Math.abs(value - entryPrice) > 0.001) {
            // For long: TP should be > entry, for short: TP should be < entry
            const isLong = positionType === 'long' || (!positionType && value > entryPrice);
            const shouldBeTP = isLong ? value > entryPrice : value < entryPrice;
            if (shouldBeTP) {
              takeProfit = value;
              console.log('Found take profit after BENEFICIO keyword:', takeProfit);
            }
          }
        }
      }
    }
    
    // Check all TICKS-PRECIO patterns
    for (const match of allTicksPrecio) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1000000) {
        // Skip if this is the stop loss we already found
        if (stopLoss && Math.abs(value - stopLoss) < 0.001) {
          continue;
        }
        
        // Skip if it's the entry price
        if (Math.abs(value - entryPrice) < 0.001) {
          continue;
        }
        
        // For long positions: TP should be above entry price
        // For short positions: TP should be below entry price
        const isLong = positionType === 'long' || (!positionType && value > entryPrice);
        const shouldBeTP = isLong ? value > entryPrice : value < entryPrice;
        
        if (shouldBeTP) {
          takeProfit = value;
          console.log('Found take profit via TICKS-PRECIO (price-based logic):', takeProfit);
          break;
        }
      }
    }
    
    // If we found SL but not TP, and there are multiple TICKS-PRECIO, use the other one
    if (!takeProfit && stopLoss && allTicksPrecio.length >= 2) {
      for (const match of allTicksPrecio) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && Math.abs(value - stopLoss) > 0.001 && 
            Math.abs(value - entryPrice) > 0.001) {
          // Use the one that's higher than entry (for long) or lower (for short)
          const isLong = positionType === 'long' || (!positionType && value > entryPrice);
          if (isLong ? value > entryPrice : value < entryPrice) {
            takeProfit = value;
            console.log('Found take profit via TICKS-PRECIO (remaining match):', takeProfit);
            break;
          }
        }
      }
    }
    
    // Last resort: if we have entry and SL, look for any price between them or above entry (for long)
    if (!takeProfit && entryPrice && stopLoss) {
      const isLong = positionType === 'long' || (!positionType && stopLoss < entryPrice);
      // For long: look for prices > entry, for short: look for prices < entry
      const allPrices = [...normalized.matchAll(/([\d]{1,6}\.[\d]{2,6})/g)];
      for (const match of allPrices) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0 && value < 1000000) {
          // Skip if it's entry, SL, or already found
          if (Math.abs(value - entryPrice) < 0.001 || 
              Math.abs(value - stopLoss) < 0.001) {
            continue;
          }
          
          const shouldBeTP = isLong ? value > entryPrice : value < entryPrice;
          if (shouldBeTP) {
            // Verify it's a reasonable TP (not too far from entry)
            const distance = Math.abs(value - entryPrice);
            const slDistance = Math.abs(entryPrice - stopLoss);
            if (distance <= slDistance * 5) { // TP shouldn't be more than 5x the SL distance
              takeProfit = value;
              console.log('Found take profit via price search (fallback):', takeProfit);
              break;
            }
          }
        }
      }
    }
  }
  
  // Look for "NIVEL DE BENEFICIO" section
  if (!takeProfit) {
    const profitSectionPattern = /(?:NIVEL\s+DE\s+BENEFICIO|PROFIT\s+LEVEL|NIVEL\s+BENEFICIO)[\s\S]{0,200}?PRECIO\s*[:=]?\s*([\d,]+\.?\d*)/i;
    const profitSectionMatch = normalized.match(profitSectionPattern);
    if (profitSectionMatch && profitSectionMatch[1]) {
      const value = parseFloat(profitSectionMatch[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1000000) {
        // Make sure it's not the same as stop loss
        if ((!stopLoss || Math.abs(value - stopLoss) > 0.001) &&
            (!entryPrice || Math.abs(value - entryPrice) > 0.001)) {
          takeProfit = value;
          console.log('Found take profit via section pattern:', takeProfit);
        }
      }
    }
  }
  
  if (takeProfit) {
    result.takeProfit = takeProfit;
    detectedFields.push('takeProfit');
    confidence += 0.15;
  }
  
  // Extract exit price - Also check if trade is closed (has exit price from TP/SL execution)
  // In TradingView, if TP or SL was hit, the exit price would be the TP or SL price
  // But we'll also look for explicit exit price fields
  let exitPrice = extractPrice(normalized, [
    'PRECIO DE SALIDA', 'EXIT PRICE', 'PRECIO SALIDA',
    'EXIT', 'SALIDA', 'CLOSE', 'CLOSED', 'CLOSING PRICE'
  ]);
  
  // If exit price not found but we have TP or SL, and the trade appears to be closed,
  // try to extract the execution price
  if (!exitPrice) {
    // Look for patterns indicating a closed trade with execution price
    const closedPatterns = [
      /(?:CERRADO|CLOSED).*?PRECIO\s*[:=]?\s*([\d,]+\.?\d*)/i,
      /(?:EJECUTADO|EXECUTED).*?PRECIO\s*[:=]?\s*([\d,]+\.?\d*)/i,
    ];
    
    for (const pattern of closedPatterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          exitPrice = value;
          break;
        }
      }
    }
  }
  
  if (exitPrice) {
    result.exitPrice = exitPrice;
    detectedFields.push('exitPrice');
    confidence += 0.1;
  }
  
  // Extract date
  const entryDate = extractDate(normalized);
  if (entryDate) {
    result.entryDate = entryDate;
    detectedFields.push('entryDate');
    confidence += 0.05;
  }
  
  // Extract PnL
  const pnl = extractPnL(normalized);
  if (pnl !== undefined) {
    result.pnl = pnl;
    detectedFields.push('pnl');
    confidence += 0.1;
  }
  
  // Extract position size - TradingView uses "TAMAÑO DEL LOTE" or "TAMAIIO DEL LOTE" (OCR may miss ñ)
  // Be careful not to confuse with prices - lot size is usually a small integer (1, 2, 0.5, etc.)
  let positionSize: number | undefined;
  
  // First try to find "TAMAÑO DEL LOTE" or "TAMAIIO DEL LOTE" followed by a number
  const lotSizePattern = /(?:TAMA[ÑI]IO\s+DEL\s+LOTE|LOT\s+SIZE|TAMA[ÑI]IO\s+LOTE)\s*[:=]?\s*([\d,]+\.?\d*)/i;
  const lotSizeMatch = normalized.match(lotSizePattern);
  if (lotSizeMatch && lotSizeMatch[1]) {
    const value = parseFloat(lotSizeMatch[1].replace(/,/g, ''));
    // Lot size is usually a small number (0.01 to 100)
    if (!isNaN(value) && value > 0 && value <= 1000) {
      positionSize = value;
      console.log('Found position size via TAMAÑO DEL LOTE:', positionSize);
    }
  }
  
  // Fallback: look for "LOTE" followed by a small number
  if (!positionSize) {
    const loteIndex = normalized.search(/\b(?:LOTE|LOT)\b/i);
    if (loteIndex !== -1) {
      const afterLote = normalized.substring(loteIndex + 4, loteIndex + 20);
      // Look for a number that's likely a lot size (not a price with many decimals)
      const lotMatch = afterLote.match(/(\d+(?:\.\d{1,2})?)\b/);
      if (lotMatch) {
        const value = parseFloat(lotMatch[1]);
        // Lot size should be reasonable (0.01 to 1000)
        if (!isNaN(value) && value > 0 && value <= 1000) {
          // Make sure it's not a price (prices usually have more decimals or are larger)
          if (value < 100 || (value.toString().split('.')[1]?.length || 0) <= 2) {
            positionSize = value;
            console.log('Found position size via LOTE:', positionSize);
          }
        }
      }
    }
  }
  
  if (positionSize) {
    result.positionSize = positionSize;
    detectedFields.push('positionSize');
    confidence += 0.05;
  }
  
  // Extract leverage
  const leverageMatch = normalized.match(/\b(\d+)x?\b.*(?:LEVERAGE|LEVER|LEV)/i);
  if (leverageMatch) {
    const leverage = parseInt(leverageMatch[1]);
    if (!isNaN(leverage) && leverage > 0) {
      result.leverage = leverage;
      detectedFields.push('leverage');
      confidence += 0.05;
    }
  }
  
  // Clamp confidence to 0-1
  result.confidence = Math.min(confidence, 1);
  result.detectedFields = detectedFields;
  
  return result;
}

/**
 * Perform OCR on an image
 */
export async function performOCR(imageFile: File | Blob): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        // Log progress if needed
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Error al procesar la imagen. Por favor, intenta con una imagen más clara.');
  }
}

/**
 * Extract trade data from an image
 */
export async function extractTradeFromImage(imageFile: File | Blob): Promise<ExtractedTradeData> {
  try {
    // Perform OCR
    const ocrText = await performOCR(imageFile);
    console.log('=== OCR EXTRACTION DEBUG ===');
    console.log('Raw OCR Text:', ocrText);
    console.log('Text Length:', ocrText.length);
    
    // Parse the text
    const extractedData = parseTradeText(ocrText);
    console.log('Final Extracted Data:', extractedData);
    console.log('Detected Fields:', extractedData.detectedFields);
    console.log('Confidence:', extractedData.confidence);
    console.log('=== END DEBUG ===');
    
    return extractedData;
  } catch (error) {
    console.error('Extraction Error:', error);
    throw error;
  }
}

/**
 * Convert image to base64 for storage
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

