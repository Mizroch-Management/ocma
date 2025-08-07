// OCMA AI Prompt Engineering System - Phase 4 Enhancement
// Advanced prompt templates and optimization strategies

export interface PromptContext {
  brand?: {
    name: string;
    voice: string;
    values: string[];
    industry: string;
  };
  audience?: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
    platform: string;
  };
  content?: {
    type: 'post' | 'article' | 'story' | 'reel' | 'thread' | 'newsletter';
    goal: 'engagement' | 'conversion' | 'awareness' | 'education' | 'entertainment';
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'humorous' | 'inspirational';
    length: 'short' | 'medium' | 'long';
    keywords?: string[];
  };
  examples?: string[];
  constraints?: string[];
  language?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  defaultContext?: Partial<PromptContext>;
  modelPreferences?: {
    preferred: string[];
    fallback: string[];
  };
}

// Core prompt templates
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Content Generation Templates
  socialPost: {
    id: 'social-post',
    name: 'Social Media Post',
    description: 'Generate engaging social media content',
    category: 'content',
    template: `
You are a social media content expert for {{brand.name}}.

Brand Voice: {{brand.voice}}
Brand Values: {{brand.values}}
Target Audience: {{audience.demographics}}
Platform: {{audience.platform}}
Content Goal: {{content.goal}}
Tone: {{content.tone}}

Create a {{content.type}} that:
1. Captures attention in the first line
2. Delivers value to the audience
3. Includes a clear call-to-action
4. Uses platform-appropriate formatting
5. Incorporates relevant hashtags

{{#if content.keywords}}
Keywords to include: {{content.keywords}}
{{/if}}

{{#if examples}}
Reference examples:
{{examples}}
{{/if}}

{{#if constraints}}
Constraints:
{{constraints}}
{{/if}}

Content:`,
    variables: ['brand', 'audience', 'content', 'examples', 'constraints'],
    modelPreferences: {
      preferred: ['claude-3-opus', 'gpt-4-turbo'],
      fallback: ['claude-3-sonnet', 'gpt-3.5-turbo']
    }
  },

  blogArticle: {
    id: 'blog-article',
    name: 'Blog Article',
    description: 'Generate comprehensive blog content',
    category: 'content',
    template: `
Write a comprehensive blog article for {{brand.name}}.

Topic: {{content.topic}}
Target Audience: {{audience.demographics}}
Content Goal: {{content.goal}}
Tone: {{content.tone}}
Length: {{content.length}} (approximately {{content.wordCount}} words)

Article Structure:
1. Compelling headline that includes primary keyword
2. Engaging introduction with hook
3. Well-organized body with subheadings
4. Actionable takeaways
5. Strong conclusion with CTA

SEO Requirements:
- Primary keyword: {{content.primaryKeyword}}
- Secondary keywords: {{content.keywords}}
- Meta description (155 characters)
- Include internal/external link suggestions

Format with proper markdown including:
- H1, H2, H3 headings
- Bullet points where appropriate
- Bold/italic for emphasis

Article:`,
    variables: ['brand', 'audience', 'content'],
    modelPreferences: {
      preferred: ['claude-3-opus', 'gpt-4-turbo'],
      fallback: ['claude-3-sonnet', 'gpt-3.5-turbo']
    }
  },

  // Optimization Templates
  contentOptimizer: {
    id: 'content-optimizer',
    name: 'Content Optimizer',
    description: 'Optimize existing content for better performance',
    category: 'optimization',
    template: `
Analyze and optimize the following content for {{audience.platform}}:

Original Content:
{{content.original}}

Optimization Goals:
- Increase {{content.goal}}
- Target audience: {{audience.demographics}}
- Platform best practices for {{audience.platform}}

Provide:
1. Optimized version of the content
2. Explanation of changes made
3. Suggested hashtags (10-15)
4. Optimal posting time recommendation
5. Engagement prediction score (1-10)
6. A/B testing variations (2 alternatives)

Consider:
- Platform algorithm preferences
- Current trends in {{brand.industry}}
- Audience behavior patterns
- Visual content suggestions

Optimized Content:`,
    variables: ['content', 'audience', 'brand'],
    modelPreferences: {
      preferred: ['claude-3-opus', 'gpt-4-turbo'],
      fallback: ['claude-3-sonnet']
    }
  },

  // Analytics & Insights Templates
  performanceAnalysis: {
    id: 'performance-analysis',
    name: 'Content Performance Analysis',
    description: 'Analyze content performance and provide insights',
    category: 'analytics',
    template: `
Analyze the performance metrics and provide actionable insights:

Content Type: {{content.type}}
Platform: {{audience.platform}}
Performance Metrics:
{{metrics}}

Historical Performance:
{{historical}}

Provide:
1. Performance summary (what worked/didn't work)
2. Key insights and patterns identified
3. Audience behavior analysis
4. Content optimization recommendations
5. Future content strategy suggestions
6. Predicted performance improvements

Focus on actionable insights that can improve future content performance.

Analysis:`,
    variables: ['content', 'audience', 'metrics', 'historical'],
    modelPreferences: {
      preferred: ['gpt-4-turbo', 'claude-3-opus'],
      fallback: ['gpt-3.5-turbo']
    }
  },

  // Multi-language Templates
  translator: {
    id: 'translator',
    name: 'Content Translator',
    description: 'Translate and localize content',
    category: 'localization',
    template: `
Translate and localize the following content from {{source.language}} to {{target.language}}:

Original Content:
{{content.original}}

Context:
- Brand: {{brand.name}}
- Target Market: {{target.market}}
- Cultural Considerations: {{target.culture}}

Requirements:
1. Maintain brand voice and tone
2. Adapt cultural references appropriately
3. Localize idioms and expressions
4. Adjust for regional preferences
5. Preserve SEO keywords where possible
6. Ensure natural, native-sounding language

Translated Content:`,
    variables: ['content', 'source', 'target', 'brand'],
    modelPreferences: {
      preferred: ['gpt-4-turbo', 'claude-3-opus'],
      fallback: ['gpt-3.5-turbo']
    }
  }
};

// Prompt enhancement functions
export class PromptEngineer {
  private context: PromptContext;
  
  constructor(context: PromptContext = {}) {
    this.context = context;
  }

  // Update context
  setContext(context: Partial<PromptContext>) {
    this.context = { ...this.context, ...context };
  }

  // Build prompt from template
  buildPrompt(templateId: string, additionalContext?: Partial<PromptContext>): string {
    const template = PROMPT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const context = { ...this.context, ...additionalContext };
    let prompt = template.template;

    // Replace variables with context values
    prompt = this.interpolateTemplate(prompt, context);
    
    return prompt.trim();
  }

  // Template interpolation with Handlebars-like syntax
  private interpolateTemplate(template: string, context: any): string {
    // Handle conditional blocks {{#if variable}}...{{/if}}
    template = template.replace(/\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const value = this.getNestedValue(context, condition);
      return value ? content : '';
    });

    // Handle variable replacement {{variable.path}}
    template = template.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return value !== undefined ? String(value) : match;
    });

    return template;
  }

  // Get nested object value by path
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Chain multiple prompts for complex tasks
  chainPrompts(templates: string[], sharedContext?: Partial<PromptContext>): string[] {
    return templates.map(templateId => 
      this.buildPrompt(templateId, sharedContext)
    );
  }

  // Generate prompt variations for A/B testing
  generateVariations(templateId: string, variations: Partial<PromptContext>[]): string[] {
    return variations.map(variation => 
      this.buildPrompt(templateId, variation)
    );
  }

  // Optimize prompt for specific model
  optimizeForModel(prompt: string, modelName: string): string {
    const modelOptimizations: Record<string, (prompt: string) => string> = {
      'gpt-4-turbo': (p) => `${p}\n\nPlease provide a detailed and comprehensive response.`,
      'claude-3-opus': (p) => `${p}\n\nThink step by step and explain your reasoning.`,
      'gpt-3.5-turbo': (p) => `${p}\n\nBe concise but complete in your response.`,
      default: (p) => p
    };

    const optimizer = modelOptimizations[modelName] || modelOptimizations.default;
    return optimizer(prompt);
  }

  // Add safety and content guidelines
  addSafetyGuidelines(prompt: string): string {
    const guidelines = `
\n\nIMPORTANT GUIDELINES:
- Ensure all content is appropriate and safe for all audiences
- Avoid controversial or sensitive topics unless specifically relevant
- Maintain factual accuracy and cite sources when needed
- Respect intellectual property and avoid plagiarism
- Follow platform-specific community guidelines\n\n`;

    return prompt + guidelines;
  }

  // Add few-shot examples
  addExamples(prompt: string, examples: string[]): string {
    if (!examples || examples.length === 0) return prompt;

    const exampleSection = `
\n\nExamples for reference:
${examples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join('\n\n')}
\n\n`;

    return prompt + exampleSection;
  }

  // Calculate prompt tokens (approximate)
  estimateTokens(prompt: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }

  // Validate prompt length for model limits
  validatePromptLength(prompt: string, modelName: string): boolean {
    const modelLimits: Record<string, number> = {
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 4096,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      default: 4096
    };

    const limit = modelLimits[modelName] || modelLimits.default;
    const estimatedTokens = this.estimateTokens(prompt);
    
    return estimatedTokens < limit;
  }
}

// Prompt quality scoring
export class PromptQualityScorer {
  scorePrompt(prompt: string): {
    score: number;
    feedback: string[];
    suggestions: string[];
  } {
    let score = 100;
    const feedback: string[] = [];
    const suggestions: string[] = [];

    // Check for clarity
    if (prompt.length < 50) {
      score -= 20;
      feedback.push('Prompt is too short and may lack context');
      suggestions.push('Add more context and specific requirements');
    }

    // Check for structure
    if (!prompt.includes('\n')) {
      score -= 10;
      feedback.push('Prompt lacks structure');
      suggestions.push('Use line breaks to organize different sections');
    }

    // Check for specific instructions
    const instructionWords = ['create', 'generate', 'write', 'analyze', 'provide', 'explain'];
    const hasInstructions = instructionWords.some(word => 
      prompt.toLowerCase().includes(word)
    );
    if (!hasInstructions) {
      score -= 15;
      feedback.push('Prompt lacks clear instructions');
      suggestions.push('Add specific action words like "create", "analyze", or "explain"');
    }

    // Check for context
    const contextIndicators = ['audience', 'goal', 'tone', 'style', 'format'];
    const contextCount = contextIndicators.filter(indicator => 
      prompt.toLowerCase().includes(indicator)
    ).length;
    if (contextCount < 2) {
      score -= 10;
      feedback.push('Prompt lacks sufficient context');
      suggestions.push('Include information about audience, goals, and desired tone');
    }

    // Check for examples
    if (prompt.includes('example') || prompt.includes('Example')) {
      score += 5;
      feedback.push('Good: Includes examples');
    }

    // Check for constraints
    if (prompt.includes('constraint') || prompt.includes('requirement') || prompt.includes('must')) {
      score += 5;
      feedback.push('Good: Includes clear constraints');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback,
      suggestions
    };
  }
}

// Export utility functions
export const createPromptEngineer = (context?: PromptContext) => new PromptEngineer(context);
export const scorePromptQuality = (prompt: string) => new PromptQualityScorer().scorePrompt(prompt);