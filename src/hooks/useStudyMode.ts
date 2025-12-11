/**
 * Hook to check study mode settings
 */

import { useSettingsStore } from '@/store/settingsStore';
import { shouldHideMoney, shouldShowOnlyRMultiples, isStudyModeEnabled } from '@/lib/tradingRules';

export function useStudyMode() {
  const { settings } = useSettingsStore();
  
  return {
    isEnabled: isStudyModeEnabled(settings),
    hideMoney: shouldHideMoney(settings),
    showOnlyRMultiples: shouldShowOnlyRMultiples(settings),
  };
}

