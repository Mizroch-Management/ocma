import posthog from 'posthog-js';

export function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  
  if (!apiKey) {
    console.log('PostHog API key not configured, skipping initialization');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    
    // Capture pageviews automatically
    capture_pageview: true,
    
    // Capture console errors
    capture_console_errors: true,
    
    // Session recording
    enable_recording_console_log: import.meta.env.DEV,
    session_recording: {
      enabled: true,
      maskAllInputs: false,
      maskTextContent: false,
    },
    
    // Feature flags
    bootstrap: {
      featureFlags: {},
    },
    
    // Autocapture
    autocapture: {
      css_selector_allowlist: ['[data-track]', '[data-event]'],
    },
    
    // Performance
    capture_performance: true,
    
    // Privacy
    mask_all_text: false,
    mask_all_element_attributes: false,
    
    loaded: (posthog) => {
      // Set initial user properties
      const user = getCurrentUser();
      if (user) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.name,
        });
      }
    },
  });
}

// Event tracking
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof posthog !== 'undefined') {
    posthog.capture(eventName, properties);
  }
}

// User identification
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof posthog !== 'undefined') {
    posthog.identify(userId, traits);
  }
}

// Reset user (on logout)
export function resetUser() {
  if (typeof posthog !== 'undefined') {
    posthog.reset();
  }
}

// Feature flags
export function isFeatureEnabled(flagName: string): boolean {
  if (typeof posthog !== 'undefined') {
    return posthog.isFeatureEnabled(flagName) || false;
  }
  return false;
}

// Track page views
export function trackPageView(pageName?: string, properties?: Record<string, any>) {
  if (typeof posthog !== 'undefined') {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      $host: window.location.host,
      $pathname: window.location.pathname,
      page_name: pageName,
      ...properties,
    });
  }
}

// Funnel tracking helpers
export const FunnelEvents = {
  // Onboarding funnel
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  
  // Connection funnel
  CONNECT_STARTED: 'connect_started',
  CONNECT_AUTHORIZED: 'connect_authorized',
  CONNECT_COMPLETED: 'connect_completed',
  CONNECT_FAILED: 'connect_failed',
  
  // Content creation funnel
  CONTENT_DRAFT_STARTED: 'content_draft_started',
  CONTENT_AI_GENERATED: 'content_ai_generated',
  CONTENT_SCHEDULED: 'content_scheduled',
  CONTENT_POSTED: 'content_posted',
  
  // Engagement funnel
  POST_VIEWED: 'post_viewed',
  POST_LIKED: 'post_liked',
  POST_SHARED: 'post_shared',
  POST_COMMENTED: 'post_commented',
};

// Helper to track funnel progression
export function trackFunnelStep(funnelName: string, step: number, stepName: string, properties?: Record<string, any>) {
  trackEvent(`${funnelName}_step_${step}`, {
    funnel: funnelName,
    step,
    step_name: stepName,
    ...properties,
  });
}

// Get current user from auth
function getCurrentUser() {
  try {
    const authData = localStorage.getItem('sb-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user;
    }
  } catch {
    // Ignore errors
  }
  return null;
}