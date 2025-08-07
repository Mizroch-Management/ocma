import { useEffect, useRef, useCallback } from 'react';

// Skip to main content link
export const useSkipToMain = () => {
  useEffect(() => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md';
    skipLink.textContent = 'Skip to main content';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.getElementById('main-content');
      if (main) {
        main.focus();
        main.scrollIntoView();
      }
    });
    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      document.body.removeChild(skipLink);
    };
  }, []);
};

// Focus trap for modals and dialogs
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
};

// Keyboard navigation hook
export const useKeyboardNavigation = () => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Global keyboard shortcuts
    const target = e.target as HTMLElement;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    if (!isInput) {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        const closeButton = document.querySelector('[data-close-modal]') as HTMLButtonElement;
        closeButton?.click();
      }

      // / for quick search
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Announce screen reader messages
export const useAnnounce = () => {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
    announceRef.current = announcer;

    return () => {
      document.body.removeChild(announcer);
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
};

// Reduced motion preferences
export const useReducedMotion = () => {
  const QUERY = '(prefers-reduced-motion: reduce)';
  const getInitialState = () => window.matchMedia(QUERY).matches;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialState);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return prefersReducedMotion;
};

// High contrast mode detection
export const useHighContrast = () => {
  const QUERY = '(prefers-contrast: high)';
  const getInitialState = () => window.matchMedia(QUERY).matches;
  const [prefersHighContrast, setPrefersHighContrast] = useState(getInitialState);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return prefersHighContrast;
};

// Color scheme preference
export const useColorScheme = () => {
  const QUERY = '(prefers-color-scheme: dark)';
  const getInitialState = () => window.matchMedia(QUERY).matches;
  const [prefersDarkMode, setPrefersDarkMode] = useState(getInitialState);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => {
      setPrefersDarkMode(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return prefersDarkMode;
};

// Heading hierarchy tracker
export const useHeadingHierarchy = () => {
  useEffect(() => {
    const checkHeadingHierarchy = () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      const errors: string[] = [];

      headings.forEach((heading) => {
        const level = parseInt(heading.tagName[1]);
        if (lastLevel > 0 && level - lastLevel > 1) {
          errors.push(`Heading hierarchy broken: ${heading.tagName} follows H${lastLevel}`);
        }
        lastLevel = level;
      });

      if (errors.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn('Accessibility: Heading hierarchy issues detected:', errors);
      }
    };

    checkHeadingHierarchy();
  }, []);
};

// Form validation announcements
export const useFormValidation = () => {
  const announce = useAnnounce();

  const announceError = useCallback((fieldName: string, error: string) => {
    announce(`Error in ${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  return { announceError, announceSuccess };
};

// Live region for dynamic content updates
export const useLiveRegion = (ariaLive: 'polite' | 'assertive' = 'polite') => {
  const regionRef = useRef<HTMLDivElement>(null);

  const updateRegion = useCallback((content: string) => {
    if (regionRef.current) {
      regionRef.current.textContent = content;
    }
  }, []);

  const clearRegion = useCallback(() => {
    if (regionRef.current) {
      regionRef.current.textContent = '';
    }
  }, []);

  const RegionComponent = useCallback(() => (
    <div
      ref={regionRef}
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
    />
  ), [ariaLive]);

  return { updateRegion, clearRegion, RegionComponent };
};

// Focus management for route changes
export const useRouteFocus = () => {
  const location = useLocation();
  const previousLocation = useRef(location);

  useEffect(() => {
    if (location !== previousLocation.current) {
      // Focus main content on route change
      const main = document.getElementById('main-content');
      if (main) {
        main.focus();
        // Announce page change to screen readers
        const pageTitle = document.title;
        const announcer = document.createElement('div');
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.className = 'sr-only';
        announcer.textContent = `Navigated to ${pageTitle}`;
        document.body.appendChild(announcer);
        
        setTimeout(() => {
          document.body.removeChild(announcer);
        }, 1000);
      }
      previousLocation.current = location;
    }
  }, [location]);
};

import { useState } from 'react';
import { useLocation } from 'react-router-dom';