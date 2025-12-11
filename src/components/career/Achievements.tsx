import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getAchievements, type Achievement } from '@/lib/careerStats';
import type { Trade } from '@/types/Trading';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementsProps {
  trades: Trade[];
}

export const Achievements: React.FC<AchievementsProps> = ({ trades }) => {
  const achievements = getAchievements(trades);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Logros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all',
                achievement.unlocked
                  ? 'border-yellow-500/50 bg-yellow-500/10'
                  : 'border-muted bg-muted/20 opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-full',
                  achievement.unlocked ? 'bg-yellow-500/20' : 'bg-muted'
                )}>
                  {achievement.unlocked ? (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    'font-semibold mb-1',
                    achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {achievement.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Desbloqueado: {new Date(achievement.unlockedAt).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

