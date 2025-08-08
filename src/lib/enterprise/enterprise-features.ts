/**
 * Phase 9: Enterprise Features - SSO, white-label, and enterprise-grade functionality
 * Comprehensive enterprise solutions with advanced security and customization
 */

import { Database } from '../../integrations/supabase/types';
import { createClient } from '../../integrations/supabase/client';

// Enterprise types
export interface SSOConfig {
  id: string;
  organizationId: string;
  provider: 'saml' | 'oidc' | 'oauth2' | 'ldap';
  name: string;
  isActive: boolean;
  settings: {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    attributeMapping?: Record<string, string>;
    clientId?: string;
    clientSecret?: string;
    issuer?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scope?: string[];
    ldapUrl?: string;
    baseDn?: string;
    bindDn?: string;
    bindPassword?: string;
    userSearchFilter?: string;
    groupSearchFilter?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WhiteLabelConfig {
  id: string;
  organizationId: string;
  branding: {
    companyName: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    customCss?: string;
  };
  domain: {
    customDomain?: string;
    subdomain: string;
    sslEnabled: boolean;
    redirectUrls: string[];
  };
  features: {
    hideOcmaBranding: boolean;
    customFooter?: string;
    customHeader?: string;
    customLoginPage?: string;
    customEmailTemplates: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseSettings {
  organizationId: string;
  security: {
    enforceSSO: boolean;
    passwordPolicy: PasswordPolicy;
    sessionTimeout: number;
    ipWhitelist: string[];
    mfaRequired: boolean;
    auditLogging: boolean;
    dataRetentionDays: number;
  };
  compliance: {
    gdprEnabled: boolean;
    ccpaEnabled: boolean;
    hipaaEnabled: boolean;
    soc2Compliant: boolean;
    customComplianceRules: ComplianceRule[];
  };
  integration: {
    apiRateLimit: number;
    webhookEndpoints: WebhookConfig[];
    customIntegrations: CustomIntegrationConfig[];
  };
  support: {
    dedicatedSupport: boolean;
    supportEmail: string;
    supportPhone?: string;
    slaTier: 'standard' | 'premium' | 'enterprise';
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  expiryDays: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'data_protection' | 'access_control' | 'audit' | 'retention';
  isActive: boolean;
  settings: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface CustomIntegrationConfig {
  id: string;
  name: string;
  type: 'oauth' | 'api_key' | 'webhook';
  settings: Record<string, any>;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class EnterpriseManager {
  private supabase = createClient();

  // SSO Management
  async createSSOConfig(config: Omit<SSOConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSOConfig> {
    try {
      const ssoConfig: SSOConfig = {
        id: `sso_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...config,
      };

      const { error } = await this.supabase
        .from('system_settings')
        .insert({
          organization_id: config.organizationId,
          category: 'sso_config',
          setting_key: ssoConfig.id,
          setting_value: ssoConfig,
          description: `SSO configuration: ${config.name}`,
        });

      if (error) throw error;

      return ssoConfig;
    } catch (error) {
      console.error('Error creating SSO config:', error);
      throw error;
    }
  }

  async updateSSOConfig(configId: string, updates: Partial<SSOConfig>): Promise<SSOConfig | null> {
    try {
      const existing = await this.getSSOConfig(configId);
      if (!existing) return null;

      const updated: SSOConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { error } = await this.supabase
        .from('system_settings')
        .update({
          setting_value: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', configId);

      if (error) throw error;

      return updated;
    } catch (error) {
      console.error('Error updating SSO config:', error);
      return null;
    }
  }

  async getSSOConfig(configId: string): Promise<SSOConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'sso_config')
        .eq('setting_key', configId)
        .single();

      if (error || !data) return null;

      return data.setting_value as SSOConfig;
    } catch (error) {
      console.error('Error getting SSO config:', error);
      return null;
    }
  }

  async getOrganizationSSOConfigs(organizationId: string): Promise<SSOConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'sso_config')
        .eq('organization_id', organizationId);

      if (error) throw error;

      return data.map(item => item.setting_value as SSOConfig);
    } catch (error) {
      console.error('Error getting organization SSO configs:', error);
      return [];
    }
  }

  async validateSSOLogin(organizationId: string, samlResponse: string): Promise<{ userId: string; email: string } | null> {
    try {
      // This is a placeholder for SAML response validation
      // In a real implementation, this would:
      // 1. Parse the SAML response
      // 2. Validate the signature
      // 3. Extract user information
      // 4. Create or update user account
      // 5. Return user information

      console.log('Validating SSO login for organization:', organizationId);
      
      // Mock implementation
      return {
        userId: 'sso_user_' + Date.now(),
        email: 'user@enterprise.com',
      };
    } catch (error) {
      console.error('Error validating SSO login:', error);
      return null;
    }
  }

  // White-label Management
  async createWhiteLabelConfig(config: Omit<WhiteLabelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhiteLabelConfig> {
    try {
      const whiteLabelConfig: WhiteLabelConfig = {
        id: `whitelabel_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...config,
      };

      const { error } = await this.supabase
        .from('system_settings')
        .insert({
          organization_id: config.organizationId,
          category: 'whitelabel_config',
          setting_key: whiteLabelConfig.id,
          setting_value: whiteLabelConfig,
          description: `White-label configuration for ${config.branding.companyName}`,
        });

      if (error) throw error;

      return whiteLabelConfig;
    } catch (error) {
      console.error('Error creating white-label config:', error);
      throw error;
    }
  }

  async getWhiteLabelConfig(organizationId: string): Promise<WhiteLabelConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'whitelabel_config')
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;

      return data.setting_value as WhiteLabelConfig;
    } catch (error) {
      console.error('Error getting white-label config:', error);
      return null;
    }
  }

  async updateWhiteLabelConfig(organizationId: string, updates: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig | null> {
    try {
      const existing = await this.getWhiteLabelConfig(organizationId);
      if (!existing) return null;

      const updated: WhiteLabelConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { error } = await this.supabase
        .from('system_settings')
        .update({
          setting_value: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('category', 'whitelabel_config')
        .eq('organization_id', organizationId);

      if (error) throw error;

      return updated;
    } catch (error) {
      console.error('Error updating white-label config:', error);
      return null;
    }
  }

  async generateCustomCSS(config: WhiteLabelConfig): Promise<string> {
    const { branding } = config;
    
    return `
      :root {
        --primary-color: ${branding.primaryColor};
        --secondary-color: ${branding.secondaryColor};
        --accent-color: ${branding.accentColor};
        --font-family: ${branding.fontFamily};
      }

      .brand-logo {
        content: url('${branding.logo}');
      }

      .company-name::before {
        content: '${branding.companyName}';
      }

      body {
        font-family: var(--font-family);
      }

      .btn-primary {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }

      .btn-secondary {
        background-color: var(--secondary-color);
        border-color: var(--secondary-color);
      }

      .accent {
        color: var(--accent-color);
      }

      ${branding.customCss || ''}

      ${config.features.hideOcmaBranding ? '.ocma-branding { display: none !important; }' : ''}
    `;
  }

  // Enterprise Settings Management
  async updateEnterpriseSettings(organizationId: string, settings: Partial<EnterpriseSettings>): Promise<EnterpriseSettings> {
    try {
      const existing = await this.getEnterpriseSettings(organizationId);
      const updated: EnterpriseSettings = {
        ...existing,
        ...settings,
        organizationId,
      };

      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          organization_id: organizationId,
          category: 'enterprise_settings',
          setting_key: 'main',
          setting_value: updated,
          description: 'Enterprise settings configuration',
        });

      if (error) throw error;

      return updated;
    } catch (error) {
      console.error('Error updating enterprise settings:', error);
      throw error;
    }
  }

  async getEnterpriseSettings(organizationId: string): Promise<EnterpriseSettings> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'enterprise_settings')
        .eq('organization_id', organizationId)
        .eq('setting_key', 'main')
        .single();

      if (error || !data) {
        return this.getDefaultEnterpriseSettings(organizationId);
      }

      return data.setting_value as EnterpriseSettings;
    } catch (error) {
      console.error('Error getting enterprise settings:', error);
      return this.getDefaultEnterpriseSettings(organizationId);
    }
  }

  private getDefaultEnterpriseSettings(organizationId: string): EnterpriseSettings {
    return {
      organizationId,
      security: {
        enforceSSO: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          preventReuse: 5,
          expiryDays: 90,
        },
        sessionTimeout: 480, // 8 hours
        ipWhitelist: [],
        mfaRequired: false,
        auditLogging: true,
        dataRetentionDays: 365,
      },
      compliance: {
        gdprEnabled: false,
        ccpaEnabled: false,
        hipaaEnabled: false,
        soc2Compliant: false,
        customComplianceRules: [],
      },
      integration: {
        apiRateLimit: 1000,
        webhookEndpoints: [],
        customIntegrations: [],
      },
      support: {
        dedicatedSupport: false,
        supportEmail: 'support@ocma.ai',
        slaTier: 'standard',
      },
    };
  }

  // Audit Logging
  async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: `audit_${Date.now()}`,
        timestamp: new Date(),
        ...event,
      };

      await this.supabase
        .from('system_settings')
        .insert({
          organization_id: event.organizationId,
          category: 'audit_log',
          setting_key: auditLog.id,
          setting_value: auditLog,
          description: `Audit log: ${event.action} on ${event.resource}`,
        });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  async getAuditLogs(
    organizationId: string,
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
      severity?: AuditLog['severity'];
    }
  ): Promise<AuditLog[]> {
    try {
      let query = this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'audit_log')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Apply filters would be implemented here
      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => item.setting_value as AuditLog);
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  // Compliance Management
  async validatePasswordPolicy(password: string, policy: PasswordPolicy): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async checkComplianceRules(organizationId: string, data: Record<string, any>): Promise<{ compliant: boolean; violations: string[] }> {
    try {
      const settings = await this.getEnterpriseSettings(organizationId);
      const violations: string[] = [];

      // Check GDPR compliance
      if (settings.compliance.gdprEnabled) {
        if (!data.consentGiven) {
          violations.push('GDPR: User consent is required');
        }
        if (data.personalData && !data.dataProcessingPurpose) {
          violations.push('GDPR: Data processing purpose must be specified');
        }
      }

      // Check CCPA compliance
      if (settings.compliance.ccpaEnabled) {
        if (data.personalData && !data.optOutAvailable) {
          violations.push('CCPA: Opt-out option must be available');
        }
      }

      // Check custom compliance rules
      for (const rule of settings.compliance.customComplianceRules) {
        if (rule.isActive) {
          const violation = await this.checkCustomComplianceRule(rule, data);
          if (violation) {
            violations.push(`${rule.name}: ${violation}`);
          }
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
      };
    } catch (error) {
      console.error('Error checking compliance rules:', error);
      return { compliant: false, violations: ['Error checking compliance rules'] };
    }
  }

  private async checkCustomComplianceRule(rule: ComplianceRule, data: Record<string, any>): Promise<string | null> {
    // This would implement custom rule checking logic
    // For now, it's a placeholder
    return null;
  }

  // Integration Management
  async createWebhook(organizationId: string, webhook: Omit<WebhookConfig, 'id' | 'secret'>): Promise<WebhookConfig> {
    try {
      const webhookConfig: WebhookConfig = {
        id: `webhook_${Date.now()}`,
        secret: this.generateWebhookSecret(),
        ...webhook,
      };

      const settings = await this.getEnterpriseSettings(organizationId);
      settings.integration.webhookEndpoints.push(webhookConfig);

      await this.updateEnterpriseSettings(organizationId, { integration: settings.integration });

      return webhookConfig;
    } catch (error) {
      console.error('Error creating webhook:', error);
      throw error;
    }
  }

  async triggerWebhook(organizationId: string, event: string, payload: Record<string, any>): Promise<void> {
    try {
      const settings = await this.getEnterpriseSettings(organizationId);
      const webhooks = settings.integration.webhookEndpoints.filter(
        w => w.isActive && w.events.includes(event)
      );

      const webhookPromises = webhooks.map(webhook => this.sendWebhookRequest(webhook, event, payload));
      
      await Promise.allSettled(webhookPromises);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
    }
  }

  private async sendWebhookRequest(webhook: WebhookConfig, event: string, payload: Record<string, any>): Promise<void> {
    try {
      const webhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      const signature = this.generateWebhookSignature(JSON.stringify(webhookPayload), webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OCMA-Signature': signature,
          'X-OCMA-Event': event,
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error sending webhook to ${webhook.url}:`, error);
      
      // Implement retry logic based on webhook.retryPolicy
      // This is a placeholder for the actual retry implementation
    }
  }

  private generateWebhookSecret(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private generateWebhookSignature(payload: string, secret: string): string {
    // In a real implementation, this would use HMAC-SHA256
    // This is a placeholder
    return `sha256=${secret.substring(0, 10)}${payload.length}`;
  }

  // User Management
  async enforcePasswordPolicy(organizationId: string, userId: string, newPassword: string): Promise<boolean> {
    try {
      const settings = await this.getEnterpriseSettings(organizationId);
      const validation = await this.validatePasswordPolicy(newPassword, settings.security.passwordPolicy);

      if (!validation.isValid) {
        throw new Error(`Password policy violation: ${validation.errors.join(', ')}`);
      }

      // Check password reuse (would integrate with password history)
      // This is a placeholder for the actual implementation

      return true;
    } catch (error) {
      console.error('Error enforcing password policy:', error);
      return false;
    }
  }

  async checkSessionTimeout(organizationId: string, lastActivity: Date): Promise<boolean> {
    try {
      const settings = await this.getEnterpriseSettings(organizationId);
      const timeoutMs = settings.security.sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
      const now = new Date().getTime();
      const lastActivityTime = lastActivity.getTime();

      return (now - lastActivityTime) > timeoutMs;
    } catch (error) {
      console.error('Error checking session timeout:', error);
      return true; // Err on the side of security
    }
  }

  async validateIPWhitelist(organizationId: string, ipAddress: string): Promise<boolean> {
    try {
      const settings = await this.getEnterpriseSettings(organizationId);
      
      if (settings.security.ipWhitelist.length === 0) {
        return true; // No whitelist configured
      }

      return settings.security.ipWhitelist.some(allowedIP => {
        // Simple IP matching - in production, this would handle CIDR ranges
        return ipAddress === allowedIP || allowedIP.includes('*');
      });
    } catch (error) {
      console.error('Error validating IP whitelist:', error);
      return false; // Err on the side of security
    }
  }
}

// Export singleton instance
export const enterpriseManager = new EnterpriseManager();

// Utility functions
export const isEnterpriseFeatureEnabled = async (
  organizationId: string,
  feature: keyof EnterpriseSettings
): Promise<boolean> => {
  try {
    const settings = await enterpriseManager.getEnterpriseSettings(organizationId);
    return settings[feature] !== undefined;
  } catch (error) {
    console.error('Error checking enterprise feature:', error);
    return false;
  }
};

export const getEnterpriseCompliance = async (organizationId: string): Promise<string[]> => {
  try {
    const settings = await enterpriseManager.getEnterpriseSettings(organizationId);
    const compliance: string[] = [];

    if (settings.compliance.gdprEnabled) compliance.push('GDPR');
    if (settings.compliance.ccpaEnabled) compliance.push('CCPA');
    if (settings.compliance.hipaaEnabled) compliance.push('HIPAA');
    if (settings.compliance.soc2Compliant) compliance.push('SOC 2');

    return compliance;
  } catch (error) {
    console.error('Error getting enterprise compliance:', error);
    return [];
  }
};