import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Ordered list of swipeable routes
const SWIPEABLE_ROUTES = [
  '/',
  '/executive-dashboard',
  '/nonlife-dashboard',
  '/pension-dashboard',
  '/brokers-dashboard',
  '/insurance-ai',
];

interface SwipeConfig {
  threshold?: number; // Minimum swipe distance in pixels
  edgeWidth?: number; // Width of edge detection zone
  timeout?: number;   // Max time for swipe in ms
}

export const useSwipeNavigation = (config: SwipeConfig = {}) => {
  const { threshold = 80, edgeWidth = 30, timeout = 300 } = config;
  const navigate = useNavigate();
  const location = useLocation();
  
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isEdgeSwipe = useRef<boolean>(false);

  const getCurrentIndex = useCallback(() => {
    return SWIPEABLE_ROUTES.indexOf(location.pathname);
  }, [location.pathname]);

  const navigateToIndex = useCallback((index: number) => {
    if (index >= 0 && index < SWIPEABLE_ROUTES.length) {
      navigate(SWIPEABLE_ROUTES[index]);
    }
  }, [navigate]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    
    // Check if swipe started from edge
    const screenWidth = window.innerWidth;
    isEdgeSwipe.current = 
      touch.clientX < edgeWidth || 
      touch.clientX > screenWidth - edgeWidth;
  }, [edgeWidth]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Only process on mobile
    if (window.innerWidth > 768) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const timeDelta = Date.now() - touchStartTime.current;

    // Check if it's a horizontal swipe (not vertical scroll)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    
    // Check if swipe meets criteria
    if (
      isHorizontalSwipe &&
      Math.abs(deltaX) >= threshold &&
      timeDelta <= timeout
    ) {
      const currentIndex = getCurrentIndex();
      
      if (currentIndex === -1) return; // Not on a swipeable route
      
      if (deltaX > 0) {
        // Swipe right → go to previous
        navigateToIndex(currentIndex - 1);
      } else {
        // Swipe left → go to next
        navigateToIndex(currentIndex + 1);
      }
    }
  }, [threshold, timeout, getCurrentIndex, navigateToIndex]);

  useEffect(() => {
    // Only add listeners on mobile
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return {
    currentIndex: getCurrentIndex(),
    totalRoutes: SWIPEABLE_ROUTES.length,
    routes: SWIPEABLE_ROUTES,
  };
};
