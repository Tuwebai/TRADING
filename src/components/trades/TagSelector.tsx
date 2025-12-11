import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface TagSelectorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestedTags?: string[];
}

const defaultSuggestedTags = [
  'breakout',
  'reversal',
  'news',
  'FOMO',
  'scalping',
  'swing',
  'trend',
  'range',
  'support',
  'resistance',
  'divergencia',
  'patrón',
  'noticias',
  'análisis técnico',
  'análisis fundamental',
];

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  onChange,
  suggestedTags = defaultSuggestedTags,
}) => {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(newTag);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un tag y presiona Enter"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddTag(newTag)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {suggestedTags.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Tags sugeridos:</p>
          <div className="flex flex-wrap gap-1">
            {suggestedTags
              .filter(tag => !tags.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-1 text-xs rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {tag}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

