// Multi-language AI Support System - Phase 4 Enhancement
// Language detection, translation, and localization for global content

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region?: string;
}

export interface TranslationContext {
  sourceLang: string;
  targetLang: string;
  content: string;
  preserveFormatting?: boolean;
  tone?: 'formal' | 'casual' | 'professional' | 'friendly';
  industry?: string;
  culturalAdaptation?: boolean;
}

export interface LocalizationSettings {
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currency: string;
  measurementSystem: 'metric' | 'imperial';
  culturalNotes?: string[];
}

// Supported languages
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' }
];

// Regional variations
export const REGIONAL_VARIATIONS: Record<string, Language[]> = {
  en: [
    { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', direction: 'ltr', region: 'US' },
    { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', direction: 'ltr', region: 'GB' },
    { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', direction: 'ltr', region: 'AU' },
    { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', direction: 'ltr', region: 'CA' }
  ],
  es: [
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', direction: 'ltr', region: 'ES' },
    { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', direction: 'ltr', region: 'MX' },
    { code: 'es-AR', name: 'Spanish (Argentina)', nativeName: 'Español (Argentina)', direction: 'ltr', region: 'AR' }
  ],
  pt: [
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', direction: 'ltr', region: 'BR' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', direction: 'ltr', region: 'PT' }
  ],
  zh: [
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', region: 'CN' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr', region: 'TW' }
  ]
};

// Localization settings by region
export const LOCALIZATION_SETTINGS: Record<string, LocalizationSettings> = {
  'en-US': {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberFormat: '1,234.56',
    currency: 'USD',
    measurementSystem: 'imperial'
  },
  'en-GB': {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '1,234.56',
    currency: 'GBP',
    measurementSystem: 'metric'
  },
  'es-ES': {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '1.234,56',
    currency: 'EUR',
    measurementSystem: 'metric'
  },
  'fr-FR': {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '1 234,56',
    currency: 'EUR',
    measurementSystem: 'metric'
  },
  'de-DE': {
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: '1.234,56',
    currency: 'EUR',
    measurementSystem: 'metric'
  },
  'ja-JP': {
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: '24h',
    numberFormat: '1,234.56',
    currency: 'JPY',
    measurementSystem: 'metric'
  },
  'zh-CN': {
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: '24h',
    numberFormat: '1,234.56',
    currency: 'CNY',
    measurementSystem: 'metric'
  }
};

export class MultiLanguageAI {
  private detectedLanguages: Map<string, string> = new Map();
  private translationCache: Map<string, string> = new Map();
  
  // Detect language from text
  async detectLanguage(text: string): Promise<string> {
    // Check cache first
    const cached = this.detectedLanguages.get(text.substring(0, 100));
    if (cached) return cached;
    
    // Simple language detection based on character patterns
    // In production, use an actual language detection API
    const patterns: Record<string, RegExp> = {
      'zh': /[\u4e00-\u9fa5]/,
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
      'ko': /[\uac00-\ud7af]/,
      'ar': /[\u0600-\u06ff]/,
      'he': /[\u0590-\u05ff]/,
      'ru': /[\u0400-\u04ff]/,
      'hi': /[\u0900-\u097f]/
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        this.detectedLanguages.set(text.substring(0, 100), lang);
        return lang;
      }
    }
    
    // Default to English if no specific pattern matched
    return 'en';
  }
  
  // Translate content with context
  async translate(context: TranslationContext): Promise<{
    translated: string;
    confidence: number;
    alternatives?: string[];
  }> {
    const cacheKey = `${context.sourceLang}-${context.targetLang}-${context.content.substring(0, 50)}`;
    const cached = this.translationCache.get(cacheKey);
    
    if (cached) {
      return {
        translated: cached,
        confidence: 95
      };
    }
    
    // Simulated translation - replace with actual API call
    const translated = await this.simulateTranslation(context);
    
    this.translationCache.set(cacheKey, translated.translated);
    
    return translated;
  }
  
  // Simulate translation (replace with actual API in production)
  private async simulateTranslation(context: TranslationContext): Promise<{
    translated: string;
    confidence: number;
    alternatives?: string[];
  }> {
    // Simple simulation - in production, use a real translation API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const translations: Record<string, Record<string, string>> = {
      'en-es': {
        'Hello': 'Hola',
        'Thank you': 'Gracias',
        'Welcome': 'Bienvenido',
        'Good morning': 'Buenos días'
      },
      'en-fr': {
        'Hello': 'Bonjour',
        'Thank you': 'Merci',
        'Welcome': 'Bienvenue',
        'Good morning': 'Bonjour'
      },
      'en-de': {
        'Hello': 'Hallo',
        'Thank you': 'Danke',
        'Welcome': 'Willkommen',
        'Good morning': 'Guten Morgen'
      }
    };
    
    const key = `${context.sourceLang}-${context.targetLang}`;
    const dictionary = translations[key] || {};
    
    let translated = context.content;
    for (const [original, translation] of Object.entries(dictionary)) {
      translated = translated.replace(new RegExp(original, 'gi'), translation);
    }
    
    return {
      translated,
      confidence: 85,
      alternatives: context.culturalAdaptation ? [translated] : undefined
    };
  }
  
  // Localize content for specific region
  async localizeContent(
    content: string,
    targetRegion: string,
    options?: {
      adaptCulturalReferences?: boolean;
      localizeUnits?: boolean;
      adjustTone?: boolean;
    }
  ): Promise<{
    localized: string;
    changes: string[];
    warnings?: string[];
  }> {
    const changes: string[] = [];
    const warnings: string[] = [];
    let localized = content;
    
    const settings = LOCALIZATION_SETTINGS[targetRegion];
    if (!settings) {
      warnings.push(`No localization settings found for ${targetRegion}`);
      return { localized, changes, warnings };
    }
    
    // Localize dates
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/g;
    localized = localized.replace(datePattern, (match) => {
      changes.push(`Date format adjusted: ${match} → ${settings.dateFormat}`);
      return this.formatDate(match, settings.dateFormat);
    });
    
    // Localize currency
    const currencyPattern = /\$[\d,]+\.?\d*/g;
    localized = localized.replace(currencyPattern, (match) => {
      const amount = parseFloat(match.replace(/[$,]/g, ''));
      const formatted = this.formatCurrency(amount, settings.currency);
      changes.push(`Currency adjusted: ${match} → ${formatted}`);
      return formatted;
    });
    
    // Localize units if requested
    if (options?.localizeUnits && settings.measurementSystem === 'metric') {
      localized = this.convertToMetric(localized, changes);
    }
    
    // Cultural adaptation
    if (options?.adaptCulturalReferences) {
      const culturalAdaptations = this.getCulturalAdaptations(targetRegion);
      for (const [original, adapted] of Object.entries(culturalAdaptations)) {
        if (localized.includes(original)) {
          localized = localized.replace(original, adapted);
          changes.push(`Cultural reference adapted: ${original} → ${adapted}`);
        }
      }
    }
    
    return { localized, changes, warnings };
  }
  
  // Format date according to locale
  private formatDate(date: string, format: string): string {
    // Simple date formatting - enhance in production
    const parts = date.split('/');
    const formats: Record<string, string> = {
      'DD/MM/YYYY': `${parts[1]}/${parts[0]}/${parts[2]}`,
      'MM/DD/YYYY': date,
      'DD.MM.YYYY': `${parts[1]}.${parts[0]}.${parts[2]}`,
      'YYYY年MM月DD日': `${parts[2]}年${parts[0]}月${parts[1]}日`
    };
    return formats[format] || date;
  }
  
  // Format currency
  private formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥'
    };
    return `${symbols[currency] || currency}${amount.toFixed(2)}`;
  }
  
  // Convert imperial to metric
  private convertToMetric(content: string, changes: string[]): string {
    // Miles to kilometers
    content = content.replace(/(\d+)\s*miles?/gi, (match, num) => {
      const km = (parseFloat(num) * 1.60934).toFixed(1);
      changes.push(`Distance converted: ${match} → ${km} km`);
      return `${km} km`;
    });
    
    // Fahrenheit to Celsius
    content = content.replace(/(\d+)°?F/g, (match, num) => {
      const celsius = ((parseFloat(num) - 32) * 5/9).toFixed(0);
      changes.push(`Temperature converted: ${match} → ${celsius}°C`);
      return `${celsius}°C`;
    });
    
    // Pounds to kilograms
    content = content.replace(/(\d+)\s*lbs?/gi, (match, num) => {
      const kg = (parseFloat(num) * 0.453592).toFixed(1);
      changes.push(`Weight converted: ${match} → ${kg} kg`);
      return `${kg} kg`;
    });
    
    return content;
  }
  
  // Get cultural adaptations for region
  private getCulturalAdaptations(region: string): Record<string, string> {
    const adaptations: Record<string, Record<string, string>> = {
      'ja-JP': {
        'handshake': 'bow',
        'first name': 'family name',
        'informal': 'formal'
      },
      'ar-SA': {
        'left hand': 'right hand',
        'weekend': 'Friday-Saturday',
        'alcohol': 'beverages'
      },
      'zh-CN': {
        'individual achievement': 'team success',
        'direct communication': 'indirect communication',
        'personal space': 'closer proximity'
      }
    };
    
    return adaptations[region] || {};
  }
  
  // Generate multilingual content variations
  async generateMultilingualVariations(
    content: string,
    targetLanguages: string[],
    options?: {
      maintainTone?: boolean;
      adaptCulturally?: boolean;
      optimizeForPlatform?: string;
    }
  ): Promise<Map<string, string>> {
    const variations = new Map<string, string>();
    
    for (const lang of targetLanguages) {
      const context: TranslationContext = {
        sourceLang: await this.detectLanguage(content),
        targetLang: lang,
        content,
        preserveFormatting: true,
        culturalAdaptation: options?.adaptCulturally
      };
      
      const result = await this.translate(context);
      
      if (options?.optimizeForPlatform) {
        // Apply platform-specific optimizations
        const optimized = this.optimizeForPlatform(
          result.translated,
          lang,
          options.optimizeForPlatform
        );
        variations.set(lang, optimized);
      } else {
        variations.set(lang, result.translated);
      }
    }
    
    return variations;
  }
  
  // Optimize content for specific platform and language
  private optimizeForPlatform(content: string, language: string, platform: string): string {
    // Platform-specific character limits
    const limits: Record<string, number> = {
      twitter: 280,
      instagram: 2200,
      linkedin: 3000,
      facebook: 63206
    };
    
    const limit = limits[platform] || 2000;
    
    // Language-specific adjustments
    const adjustments: Record<string, number> = {
      'zh': 0.5, // Chinese characters count as more
      'ja': 0.7,
      'ko': 0.7,
      'ar': 1.2  // Arabic tends to expand
    };
    
    const adjustment = adjustments[language] || 1;
    const effectiveLimit = Math.floor(limit * adjustment);
    
    if (content.length > effectiveLimit) {
      // Truncate with ellipsis
      return content.substring(0, effectiveLimit - 3) + '...';
    }
    
    return content;
  }
  
  // Get language statistics for content
  getLanguageStats(content: string): {
    primaryLanguage: string;
    confidence: number;
    characterCount: number;
    estimatedReadingTime: number; // in seconds
  } {
    const detectedLang = 'en'; // Simplified - use actual detection
    
    // Reading speed by language (words per minute)
    const readingSpeed: Record<string, number> = {
      'en': 200,
      'zh': 260,
      'ja': 400,
      'ar': 180,
      'de': 180,
      'fr': 195
    };
    
    const speed = readingSpeed[detectedLang] || 200;
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil((wordCount / speed) * 60);
    
    return {
      primaryLanguage: detectedLang,
      confidence: 85,
      characterCount: content.length,
      estimatedReadingTime: readingTime
    };
  }
  
  // Clear caches
  clearCache(): void {
    this.detectedLanguages.clear();
    this.translationCache.clear();
  }
}

// Export singleton instance
export const multiLanguageAI = new MultiLanguageAI();