import { useState } from 'react';
import { Plus, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface VideoLinksProps {
  videos: string[];
  onChange: (videos: string[]) => void;
}

export const VideoLinks: React.FC<VideoLinksProps> = ({ videos, onChange }) => {
  const [newVideo, setNewVideo] = useState('');

  const handleAddVideo = () => {
    const trimmed = newVideo.trim();
    if (trimmed && !videos.includes(trimmed)) {
      onChange([...videos, trimmed]);
      setNewVideo('');
    }
  };

  const handleRemoveVideo = (index: number) => {
    onChange(videos.filter((_, i) => i !== index));
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-2">
      <Label>Enlaces a Videos</Label>
      <p className="text-xs text-muted-foreground">
        Agrega enlaces a grabaciones de pantalla o videos de la operación
      </p>

      {videos.length > 0 && (
        <div className="space-y-2 mb-2">
          {videos.map((video, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-md bg-card"
            >
              <Video className="h-4 w-4 text-muted-foreground" />
              <a
                href={video}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-primary hover:underline truncate"
              >
                {video}
              </a>
              <button
                type="button"
                onClick={() => handleRemoveVideo(index)}
                className="text-destructive hover:bg-destructive/10 rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newVideo}
          onChange={(e) => setNewVideo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddVideo()}
          placeholder="https://ejemplo.com/video o ruta local"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAddVideo}
          disabled={!newVideo.trim() || !isValidUrl(newVideo.trim())}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

