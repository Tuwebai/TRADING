import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { EmotionSelector } from './EmotionSelector';
import type { TradeJournal, EmotionType } from '@/types/Trading';

interface JournalSectionProps {
  journal: TradeJournal;
  onChange: (journal: TradeJournal) => void;
  section: 'preTrade' | 'duringTrade' | 'postTrade';
  disabled?: boolean;
}

const sectionConfig = {
  preTrade: {
    title: 'Pre-Operación',
    description: 'Análisis y razones antes de abrir la operación',
    fields: {
      technicalAnalysis: {
        label: 'Análisis Técnico',
        placeholder: 'Describe tu análisis técnico: niveles, indicadores, patrones...',
      },
      marketSentiment: {
        label: 'Sentimiento del Mercado',
        placeholder: '¿Cómo se siente el mercado? ¿Hay noticias importantes?',
      },
      entryReasons: {
        label: 'Razones de Entrada',
        placeholder: '¿Por qué decides entrar en este momento? ¿Qué señal te dio la entrada?',
      },
    },
  },
  duringTrade: {
    title: 'Durante la Operación',
    description: 'Cambios y ajustes mientras la operación está abierta',
    fields: {
      marketChanges: {
        label: 'Cambios en el Mercado',
        placeholder: '¿Qué cambió mientras tenías la operación abierta?',
      },
      stopLossAdjustments: {
        label: 'Ajustes de Stop Loss',
        placeholder: '¿Ajustaste el stop loss? ¿Por qué?',
      },
      takeProfitAdjustments: {
        label: 'Ajustes de Take Profit',
        placeholder: '¿Ajustaste el take profit? ¿Por qué?',
      },
    },
  },
  postTrade: {
    title: 'Post-Operación',
    description: 'Reflexión y aprendizaje después de cerrar',
    fields: {
      whatWentWell: {
        label: '¿Qué Salió Bien?',
        placeholder: 'Identifica los aspectos positivos de esta operación...',
      },
      whatWentWrong: {
        label: '¿Qué Salió Mal?',
        placeholder: 'Identifica los errores o problemas que ocurrieron...',
      },
      lessonsLearned: {
        label: 'Lecciones Aprendidas',
        placeholder: '¿Qué aprendiste de esta operación? ¿Qué harías diferente?',
      },
    },
  },
};

export const JournalSection: React.FC<JournalSectionProps> = ({
  journal,
  onChange,
  section,
  disabled = false,
}) => {
  const config = sectionConfig[section];
  const sectionData = journal[section];

  const updateField = (field: string, value: string) => {
    onChange({
      ...journal,
      [section]: {
        ...sectionData,
        [field]: value,
      },
    });
  };

  const updateEmotion = (emotion: EmotionType | null) => {
    onChange({
      ...journal,
      [section]: {
        ...sectionData,
        emotion,
      },
    });
  };

  return (
    <div className="space-y-4">
        {Object.entries(config.fields).map(([key, fieldConfig]) => (
          <div key={key}>
            <Label htmlFor={`${section}-${key}`}>{fieldConfig.label}</Label>
            <Textarea
              id={`${section}-${key}`}
              value={sectionData[key as keyof typeof sectionData] as string}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={fieldConfig.placeholder}
              rows={3}
              disabled={disabled}
              className="mt-1"
            />
          </div>
        ))}

        <EmotionSelector
          label="Estado Emocional"
          value={sectionData.emotion}
          onChange={updateEmotion}
        />
    </div>
  );
};

