import { useState } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  touchStart: { x: number; y: number } | null;
  touchEnd: { x: number; y: number } | null;
}

export const useSwipe = (handlers: SwipeHandlers, threshold = 50) => {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    touchStart: null,
    touchEnd: null,
  });

  const minSwipeDistance = threshold;

  const onTouchStart = (e: React.TouchEvent) => {
    setSwipeState({
      touchEnd: null,
      touchStart: {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      },
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setSwipeState((prev) => ({
      ...prev,
      touchEnd: {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      },
    }));
  };

  const onTouchEnd = () => {
    if (!swipeState.touchStart || !swipeState.touchEnd) return;

    const distanceX = swipeState.touchStart.x - swipeState.touchEnd.x;
    const distanceY = swipeState.touchStart.y - swipeState.touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (isLeftSwipe && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    }
    if (isRightSwipe && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }
    if (isUpSwipe && handlers.onSwipeUp) {
      handlers.onSwipeUp();
    }
    if (isDownSwipe && handlers.onSwipeDown) {
      handlers.onSwipeDown();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

