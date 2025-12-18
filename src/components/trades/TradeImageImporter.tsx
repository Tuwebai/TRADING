/**
 * Trade Image Importer Component
 * Allows users to upload an image and extract trade data using OCR
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { extractTradeFromImage, imageToBase64, type ExtractedTradeData } from '@/lib/tradeOCR';
import type { TradeFormData } from '@/types/Trading';

interface TradeImageImporterProps {
  onDataExtracted: (formData: Partial<TradeFormData>, imageBase64: string) => void;
  onCancel: () => void;
}

export const TradeImageImporter: React.FC<TradeImageImporterProps> = ({
  onDataExtracted,
  onCancel,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTradeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Por favor, usa una imagen menor a 10MB.');
      return;
    }

    setError(null);
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessImage = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      // Extract trade data from image
      const extracted = await extractTradeFromImage(imageFile);
      console.log('Extracted trade data:', extracted);
      setExtractedData(extracted);

      // Convert image to base64 for storage
      const imageBase64 = await imageToBase64(imageFile);

      // Convert extracted data to TradeFormData format
      const formData: Partial<TradeFormData> = {};

      if (extracted.asset) {
        formData.asset = extracted.asset;
      }
      if (extracted.positionType) {
        formData.positionType = extracted.positionType;
      }
      if (extracted.entryPrice !== undefined) {
        formData.entryPrice = extracted.entryPrice;
      }
      if (extracted.stopLoss !== undefined) {
        formData.stopLoss = extracted.stopLoss;
      }
      if (extracted.takeProfit !== undefined) {
        formData.takeProfit = extracted.takeProfit;
      }
      if (extracted.exitPrice !== undefined) {
        formData.exitPrice = extracted.exitPrice;
      }
      if (extracted.entryDate) {
        formData.entryDate = extracted.entryDate;
      }
      if (extracted.exitDate) {
        formData.exitDate = extracted.exitDate;
      }
      if (extracted.positionSize !== undefined) {
        formData.positionSize = extracted.positionSize;
      }
      if (extracted.leverage !== undefined) {
        formData.leverage = extracted.leverage;
      }

      // Call callback with extracted data and image
      onDataExtracted(formData, imageBase64);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen. Por favor, intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageFile(null);
    setExtractedData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Sube una imagen de tu trade (MT4, MT5, TradingView, broker) y extraeremos los datos automáticamente.
      </div>

      {!imagePreview ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="trade-image-upload"
          />
          <label
            htmlFor="trade-image-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Haz clic para seleccionar una imagen</p>
              <p className="text-sm text-muted-foreground mt-1">
                PNG, JPG, JPEG hasta 10MB
              </p>
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={imagePreview}
                alt="Trade screenshot preview"
                className="max-h-64 mx-auto rounded"
              />
            </div>
            {!isProcessing && !extractedData && (
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 p-1 rounded-full bg-background border shadow-sm hover:bg-muted"
                title="Cambiar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Procesando imagen...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error al procesar</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Puedes continuar completando el formulario manualmente.
                </p>
              </div>
            </div>
          )}

          {/* Extracted Data Summary */}
          {extractedData && !isProcessing && (
            <div className="space-y-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-700 dark:text-green-400">
                  Datos extraídos ({extractedData.detectedFields.length} campos)
                </p>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Campos detectados: {extractedData.detectedFields.join(', ')}
              </div>
              {extractedData.confidence < 0.5 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ Confianza baja en la extracción. Por favor, revisa los datos.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isProcessing && (
            <div className="flex gap-2">
              <Button
                onClick={handleProcessImage}
                disabled={!imageFile}
                className="flex-1"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Extraer Datos
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
              >
                Cambiar Imagen
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Button */}
      <div className="flex justify-end">
        <Button onClick={onCancel} variant="ghost" size="sm">
          Cancelar
        </Button>
      </div>
    </div>
  );
};

