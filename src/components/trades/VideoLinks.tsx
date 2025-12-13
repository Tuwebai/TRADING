import { useState, useCallback } from 'react';
import { Plus, X, Video, AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface VideoLinksProps {
  videos: string[];
  onChange: (videos: string[]) => void;
}

interface VideoValidationResult {
  isValid: boolean;
  error?: string;
  type?: 'youtube' | 'vimeo' | 'url' | 'local';
}

const validateVideoUrl = (url: string): VideoValidationResult => {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'La URL no puede estar vacía' };
  }

  // YouTube URLs
  const youtubePatterns = [
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/,
  ];
  if (youtubePatterns.some(pattern => pattern.test(trimmed))) {
    return { isValid: true, type: 'youtube' };
  }

  // Vimeo URLs
  const vimeoPatterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/(\d+)/,
    /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
  ];
  if (vimeoPatterns.some(pattern => pattern.test(trimmed))) {
    return { isValid: true, type: 'vimeo' };
  }

  // Generic URL validation
  try {
    const urlObj = new URL(trimmed);
    // Allow http, https, and file:// for local files
    if (!['http:', 'https:', 'file:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Protocolo no soportado. Usa http://, https:// o file://' };
    }
    
    // Check if it's a local file path (file://)
    if (urlObj.protocol === 'file:') {
      return { isValid: true, type: 'local' };
    }
    
    // Check if URL has a valid domain
    if (!urlObj.hostname) {
      return { isValid: false, error: 'URL inválida' };
    }

    return { isValid: true, type: 'url' };
  } catch {
    // Try to validate as local file path (without protocol)
    if (trimmed.startsWith('/') || trimmed.match(/^[A-Za-z]:/)) {
      return { isValid: true, type: 'local' };
    }
    return { isValid: false, error: 'URL inválida. Verifica el formato' };
  }
};

const getVideoTypeLabel = (type?: string): string => {
  switch (type) {
    case 'youtube':
      return 'YouTube';
    case 'vimeo':
      return 'Vimeo';
    case 'local':
      return 'Archivo Local';
    case 'url':
      return 'URL Externa';
    default:
      return 'Video';
  }
};

export const VideoLinks: React.FC<VideoLinksProps> = ({ videos, onChange }) => {
  const [newVideo, setNewVideo] = useState('');
  const [validation, setValidation] = useState<VideoValidationResult>({ isValid: false });
  const [showValidation, setShowValidation] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewVideo(value);
    
    if (value.trim()) {
      const result = validateVideoUrl(value);
      setValidation(result);
      setShowValidation(true);
    } else {
      setShowValidation(false);
      setValidation({ isValid: false });
    }
  }, []);

  const handleAddVideo = useCallback(() => {
    const trimmed = newVideo.trim();
    
    if (!trimmed) {
      return;
    }

    const result = validateVideoUrl(trimmed);
    
    if (!result.isValid) {
      setShowValidation(true);
      return;
    }

    // Normalize YouTube URL
    let normalizedUrl = trimmed;
    if (result.type === 'youtube') {
      const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      if (match) {
        normalizedUrl = `https://www.youtube.com/watch?v=${match[1]}`;
      }
    }

    if (!videos.includes(normalizedUrl)) {
      onChange([...videos, normalizedUrl]);
      setNewVideo('');
      setShowValidation(false);
      setValidation({ isValid: false });
    } else {
      setValidation({ isValid: false, error: 'Este video ya está agregado' });
      setShowValidation(true);
    }
  }, [newVideo, videos, onChange]);

  const handleRemoveVideo = useCallback((index: number) => {
    onChange(videos.filter((_, i) => i !== index));
  }, [videos, onChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVideo();
    }
  }, [handleAddVideo]);

  const getVideoId = (url: string, type?: string): string | null => {
    if (type === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    if (type === 'vimeo') {
      const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <Label>Enlaces a Videos</Label>
      <p className="text-xs text-muted-foreground">
        Agrega enlaces a YouTube, Vimeo, archivos locales o URLs externas de grabaciones de pantalla
      </p>

      {/* Validation feedback */}
      {showValidation && newVideo.trim() && (
        <div className={`
          flex items-center gap-2 p-2 rounded-md text-sm border
          ${validation.isValid 
            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
            : 'bg-destructive/10 border-destructive/20 text-destructive'
          }
        `}>
          {validation.isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                {validation.type 
                  ? `${getVideoTypeLabel(validation.type)} válido` 
                  : 'URL válida'
                }
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validation.error || 'URL inválida'}</span>
            </>
          )}
        </div>
      )}

      {/* Video list */}
      {videos.length > 0 && (
        <div className="space-y-2 mb-2">
          {videos.map((video, index) => {
            const videoValidation = validateVideoUrl(video);
            const videoId = getVideoId(video, videoValidation.type);
            
            return (
              <div
                key={index}
                className="flex items-start gap-2 p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors"
              >
                <Video className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {getVideoTypeLabel(videoValidation.type)}
                    </span>
                    {videoId && videoValidation.type === 'youtube' && (
                      <span className="text-xs text-muted-foreground">ID: {videoId}</span>
                    )}
                  </div>
                  
                  <a
                    href={video.startsWith('file://') || video.match(/^[A-Za-z]:/) 
                      ? undefined 
                      : video
                    }
                    target={video.startsWith('file://') || video.match(/^[A-Za-z]:/) 
                      ? undefined 
                      : '_blank'
                    }
                    rel={video.startsWith('file://') || video.match(/^[A-Za-z]:/) 
                      ? undefined 
                      : 'noopener noreferrer'
                    }
                    className="text-sm text-primary hover:underline truncate block"
                    onClick={(e) => {
                      if (video.startsWith('file://') || video.match(/^[A-Za-z]:/)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {video}
                  </a>
                </div>
                
                <div className="flex items-center gap-1">
                  {!video.startsWith('file://') && !video.match(/^[A-Za-z]:/) && (
                    <a
                      href={video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(index)}
                    className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
                    aria-label="Eliminar video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add video input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={newVideo}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="https://youtube.com/watch?v=... o ruta local"
            className={`
              ${showValidation && !validation.isValid && newVideo.trim() 
                ? 'border-destructive focus:border-destructive' 
                : showValidation && validation.isValid 
                  ? 'border-green-500 focus:border-green-500' 
                  : ''
              }
            `}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAddVideo}
          disabled={!newVideo.trim() || !validation.isValid}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Ejemplos: YouTube, Vimeo, archivos locales (file:// o ruta absoluta), URLs externas
      </p>
    </div>
  );
};
