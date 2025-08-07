import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization utilities for user input
 * Provides protection against XSS and other injection attacks
 */

// HTML sanitization for rich content
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
};

// Plain text sanitization (removes HTML tags completely)
export const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
};

// URL sanitization
export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol');
    }
    return urlObj.toString();
  } catch {
    return '';
  }
};

// Email sanitization
export const sanitizeEmail = (email: string): string => {
  return sanitizeText(email).toLowerCase().trim();
};

// Filename sanitization for uploads
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .substring(0, 255);
};

// Social media handle sanitization
export const sanitizeHandle = (handle: string): string => {
  return handle
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .substring(0, 50);
};

// Hashtag sanitization
export const sanitizeHashtag = (hashtag: string): string => {
  const clean = hashtag.replace(/[^a-zA-Z0-9_]/g, '');
  return clean.length > 0 ? `#${clean}` : '';
};

// Phone number sanitization (removes all non-digit characters)
export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+()-\s]/g, '').trim();
};

// JSON sanitization for API inputs
export const sanitizeJson = (jsonString: string): object | null => {
  try {
    const parsed = JSON.parse(jsonString);
    // Remove any potentially dangerous properties
    const sanitized = removeDeepProperty(parsed, ['__proto__', 'constructor', 'prototype']);
    return sanitized;
  } catch {
    return null;
  }
};

// Recursively remove dangerous properties from objects
const removeDeepProperty = (obj: any, propsToRemove: string[]): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeDeepProperty(item, propsToRemove));
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!propsToRemove.includes(key)) {
      cleaned[key] = removeDeepProperty(value, propsToRemove);
    }
  }
  
  return cleaned;
};

// AI prompt sanitization (removes potentially harmful instructions)
export const sanitizeAIPrompt = (prompt: string): string => {
  const dangerous = [
    'ignore previous instructions',
    'disregard the above',
    'forget everything',
    'system prompt',
    'jailbreak',
    'override',
    'sudo',
    'admin',
    'root'
  ];
  
  let sanitized = sanitizeText(prompt);
  
  // Remove dangerous phrases (case insensitive)
  dangerous.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    sanitized = sanitized.replace(regex, '[REMOVED]');
  });
  
  return sanitized.trim();
};

// Content sanitization for social media posts
export const sanitizeContent = (content: string, platform: string): string => {
  let sanitized = sanitizeText(content);
  
  // Platform-specific length limits
  const limits: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200
  };
  
  const limit = limits[platform] || 10000;
  if (sanitized.length > limit) {
    sanitized = sanitized.substring(0, limit - 3) + '...';
  }
  
  return sanitized;
};

// Generic input sanitizer with configurable options
export const sanitizeInput = (
  input: string, 
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    allowNewlines?: boolean;
    allowSpecialChars?: boolean;
  } = {}
): string => {
  const {
    allowHtml = false,
    maxLength = 10000,
    allowNewlines = true,
    allowSpecialChars = true
  } = options;
  
  let sanitized = allowHtml ? sanitizeHtml(input) : sanitizeText(input);
  
  if (!allowNewlines) {
    sanitized = sanitized.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  }
  
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
};