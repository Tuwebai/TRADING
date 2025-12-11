import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { EmotionType } from '@/types/Trading';

interface EmotionSelectorProps {
  label: string;
  value: EmotionType | null;
  onChange: (emotion: EmotionType | null) => void;
}

const emotions: { value: EmotionType; label: string; emoji: string }[] = [
  { value: 'confiado', label: 'Confiado', emoji: '😌' },
  { value: 'ansioso', label: 'Ansioso', emoji: '😰' },
  { value: 'temeroso', label: 'Temeroso', emoji: '😨' },
  { value: 'emocionado', label: 'Emocionado', emoji: '🤩' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'frustrado', label: 'Frustrado', emoji: '😤' },
  { value: 'euforico', label: 'Eufórico', emoji: '🎉' },
  { value: 'deprimido', label: 'Deprimido', emoji: '😔' },
];

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? (e.target.value as EmotionType) : null)}
      >
        <option value="">Sin seleccionar</option>
        {emotions.map((emotion) => (
          <option key={emotion.value} value={emotion.value}>
            {emotion.emoji} {emotion.label}
          </option>
        ))}
      </Select>
    </div>
  );
};

