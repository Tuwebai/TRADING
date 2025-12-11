import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ImageIcon, Video, Tag } from 'lucide-react';
import type { Trade } from '@/types/Trading';
import { formatDate } from '@/lib/utils';

interface TradeJournalViewProps {
  trade: Trade;
}

const emotionLabels: Record<string, string> = {
  confiado: '😌 Confiado',
  ansioso: '😰 Ansioso',
  temeroso: '😨 Temeroso',
  emocionado: '🤩 Emocionado',
  neutral: '😐 Neutral',
  frustrado: '😤 Frustrado',
  euforico: '🎉 Eufórico',
  deprimido: '😔 Deprimido',
};

export const TradeJournalView: React.FC<TradeJournalViewProps> = ({ trade }) => {
  const journal = trade.journal || {
    preTrade: { technicalAnalysis: '', marketSentiment: '', entryReasons: '', emotion: null },
    duringTrade: { marketChanges: '', stopLossAdjustments: '', takeProfitAdjustments: '', emotion: null },
    postTrade: { whatWentWell: '', whatWentWrong: '', lessonsLearned: '', emotion: null },
  };

  const hasContent = 
    journal.preTrade.technicalAnalysis ||
    journal.preTrade.marketSentiment ||
    journal.preTrade.entryReasons ||
    journal.duringTrade.marketChanges ||
    journal.duringTrade.stopLossAdjustments ||
    journal.duringTrade.takeProfitAdjustments ||
    journal.postTrade.whatWentWell ||
    journal.postTrade.whatWentWrong ||
    journal.postTrade.lessonsLearned ||
    trade.screenshots?.length > 0 ||
    trade.videos?.length > 0 ||
    trade.tags?.length > 0;

  if (!hasContent) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No hay información de journaling para esta operación</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tags */}
      {trade.tags && trade.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trade.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-Trade */}
      {(journal.preTrade.technicalAnalysis || 
        journal.preTrade.marketSentiment || 
        journal.preTrade.entryReasons || 
        journal.preTrade.emotion) && (
        <Card>
          <CardHeader>
            <CardTitle>Pre-Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {journal.preTrade.technicalAnalysis && (
              <div>
                <h4 className="font-medium mb-1">Análisis Técnico</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.preTrade.technicalAnalysis}
                </p>
              </div>
            )}
            {journal.preTrade.marketSentiment && (
              <div>
                <h4 className="font-medium mb-1">Sentimiento del Mercado</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.preTrade.marketSentiment}
                </p>
              </div>
            )}
            {journal.preTrade.entryReasons && (
              <div>
                <h4 className="font-medium mb-1">Razones de Entrada</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.preTrade.entryReasons}
                </p>
              </div>
            )}
            {journal.preTrade.emotion && (
              <div>
                <h4 className="font-medium mb-1">Estado Emocional</h4>
                <p className="text-sm">{emotionLabels[journal.preTrade.emotion] || journal.preTrade.emotion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* During Trade */}
      {(journal.duringTrade.marketChanges || 
        journal.duringTrade.stopLossAdjustments || 
        journal.duringTrade.takeProfitAdjustments || 
        journal.duringTrade.emotion) && (
        <Card>
          <CardHeader>
            <CardTitle>Durante la Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {journal.duringTrade.marketChanges && (
              <div>
                <h4 className="font-medium mb-1">Cambios en el Mercado</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.duringTrade.marketChanges}
                </p>
              </div>
            )}
            {journal.duringTrade.stopLossAdjustments && (
              <div>
                <h4 className="font-medium mb-1">Ajustes de Stop Loss</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.duringTrade.stopLossAdjustments}
                </p>
              </div>
            )}
            {journal.duringTrade.takeProfitAdjustments && (
              <div>
                <h4 className="font-medium mb-1">Ajustes de Take Profit</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.duringTrade.takeProfitAdjustments}
                </p>
              </div>
            )}
            {journal.duringTrade.emotion && (
              <div>
                <h4 className="font-medium mb-1">Estado Emocional</h4>
                <p className="text-sm">{emotionLabels[journal.duringTrade.emotion] || journal.duringTrade.emotion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-Trade */}
      {(journal.postTrade.whatWentWell || 
        journal.postTrade.whatWentWrong || 
        journal.postTrade.lessonsLearned || 
        journal.postTrade.emotion) && (
        <Card>
          <CardHeader>
            <CardTitle>Post-Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {journal.postTrade.whatWentWell && (
              <div>
                <h4 className="font-medium mb-1 text-profit">¿Qué Salió Bien?</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.postTrade.whatWentWell}
                </p>
              </div>
            )}
            {journal.postTrade.whatWentWrong && (
              <div>
                <h4 className="font-medium mb-1 text-loss">¿Qué Salió Mal?</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.postTrade.whatWentWrong}
                </p>
              </div>
            )}
            {journal.postTrade.lessonsLearned && (
              <div>
                <h4 className="font-medium mb-1 text-blue-600">Lecciones Aprendidas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {journal.postTrade.lessonsLearned}
                </p>
              </div>
            )}
            {journal.postTrade.emotion && (
              <div>
                <h4 className="font-medium mb-1">Estado Emocional</h4>
                <p className="text-sm">{emotionLabels[journal.postTrade.emotion] || journal.postTrade.emotion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Screenshots */}
      {trade.screenshots && trade.screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Screenshots / Gráficos ({trade.screenshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {trade.screenshots.map((screenshot, index) => (
                <div key={index} className="relative group">
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const newWindow = window.open();
                      if (newWindow) {
                        newWindow.document.write(`<img src="${screenshot}" style="max-width: 100%; height: auto;" />`);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {trade.videos && trade.videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Videos ({trade.videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trade.videos.map((video, index) => (
                <a
                  key={index}
                  href={video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent transition-colors"
                >
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-primary hover:underline truncate flex-1">
                    {video}
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

