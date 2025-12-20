import { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxImages = 10,
  maxSizeMB = 5,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndProcessFile = useCallback(async (file: File): Promise<string> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} no es una imagen válida`);
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      throw new Error(`${file.name} es demasiado grande (máx. ${maxSizeMB}MB)`);
    }

    // Try to upload to Supabase Storage first
    try {
      const { getSupabaseUser } = await import('@/lib/supabase');
      const { uploadFile } = await import('@/lib/supabaseStorageFiles');
      const user = await getSupabaseUser();
      
      if (user?.id) {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `screenshot_${timestamp}_${randomStr}.${extension}`;
        const path = `trades/${filename}`;
        
        const { url, error } = await uploadFile(file, path, user.id);
        
        if (url && !error) {
          return url; // Return Supabase Storage URL
        }
        // If upload fails, fallback to base64
        console.warn('Failed to upload to Supabase Storage, using base64 fallback:', error);
      }
    } catch (error) {
      console.warn('Supabase Storage not available, using base64 fallback:', error);
    }

    // Fallback to base64 for offline/local storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error(`Error al leer ${file.name}`));
      };
      reader.readAsDataURL(file);
    });
  }, [maxSizeMB]);

  const processFiles = useCallback(async (files: File[]) => {
    setError(null);
    setIsLoading(true);

    // Check max images limit
    if (files.length + images.length > maxImages) {
      setError(`Puedes subir máximo ${maxImages} imágenes`);
      setIsLoading(false);
      return;
    }

    try {
      const promises = files.map(file => validateAndProcessFile(file));
      const results = await Promise.all(promises);
      onChange([...images, ...results]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar las imágenes');
    } finally {
      setIsLoading(false);
    }
  }, [images, onChange, maxImages, validateAndProcessFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      processFiles(files);
    } else {
      setError('Por favor arrastra solo archivos de imagen');
    }
  }, [processFiles]);

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    setError(null);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>Screenshots / Gráficos</Label>
      <p className="text-xs text-muted-foreground">
        Sube gráficos, análisis técnico o capturas de pantalla (máx. {maxSizeMB}MB por imagen, {maxImages} imágenes)
      </p>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-24 object-cover rounded-md border border-border hover:border-primary/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                aria-label="Eliminar imagen"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                Imagen {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Procesando imágenes...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, GIF, WebP (máx. {maxSizeMB}MB c/u)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {images.length}/{maxImages} imágenes subidas
              </p>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
        disabled={isLoading}
      />

      {/* Alternative upload button */}
      {images.length > 0 && images.length < maxImages && !isDragging && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClickUpload}
          disabled={isLoading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isLoading ? 'Procesando...' : `Agregar Más Imágenes (${images.length}/${maxImages})`}
        </Button>
      )}
    </div>
  );
};
