import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAIPlatforms } from "@/hooks/use-ai-platforms";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings2, 
  Link, 
  User, 
  Bell, 
  Palette,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Check,
  X,
  Plus,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Bot,
  Key,
  Wrench
} from "lucide-react";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description: string;
}

interface PlatformCredentials {
  [key: string]: string;
}

interface PlatformConfig {
  connected: boolean;
  credentials: PlatformCredentials;
  account_name?: string;
  last_sync?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { platforms: aiPlatformsList } = useAIPlatforms();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [testing, setTesting] = useState<{[key: string]: boolean}>({});

  const platformConfigs = {
    facebook: {
      name: "Facebook",
      icon: Facebook,
      fields: [
        { key: "app_id", label: "App ID", type: "text", placeholder: "Your Facebook App ID" },
        { key: "app_secret", label: "App Secret", type: "password", placeholder: "Your Facebook App Secret" },
        { key: "access_token", label: "Page Access Token", type: "password", placeholder: "Your Page Access Token" },
        { key: "page_id", label: "Page ID", type: "text", placeholder: "Your Facebook Page ID" },
        { key: "business_id", label: "Business Manager ID", type: "text", placeholder: "Your Business Manager ID" }
      ]
    },
    instagram: {
      name: "Instagram",
      icon: Instagram,
      fields: [
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Instagram Access Token" },
        { key: "user_id", label: "User ID", type: "text", placeholder: "Your Instagram User ID" },
        { key: "business_account_id", label: "Business Account ID", type: "text", placeholder: "Your Business Account ID" },
        { key: "facebook_page_id", label: "Connected Facebook Page ID", type: "text", placeholder: "Connected Facebook Page ID" }
      ]
    },
    twitter: {
      name: "Twitter/X",
      icon: Twitter,
      fields: [
        { key: "api_key", label: "API Key", type: "text", placeholder: "Your Twitter API Key" },
        { key: "api_secret", label: "API Secret", type: "password", placeholder: "Your Twitter API Secret" },
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Access Token" },
        { key: "access_token_secret", label: "Access Token Secret", type: "password", placeholder: "Your Access Token Secret" },
        { key: "bearer_token", label: "Bearer Token", type: "password", placeholder: "Your Bearer Token" }
      ]
    },
    linkedin: {
      name: "LinkedIn",
      icon: Linkedin,
      fields: [
        { key: "client_id", label: "Client ID", type: "text", placeholder: "Your LinkedIn Client ID" },
        { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Your LinkedIn Client Secret" },
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Access Token" },
        { key: "organization_id", label: "Organization ID", type: "text", placeholder: "Your Company Page ID" }
      ]
    },
    youtube: {
      name: "YouTube",
      icon: Youtube,
      fields: [
        { key: "client_id", label: "Client ID", type: "text", placeholder: "Your Google Client ID" },
        { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Your Google Client Secret" },
        { key: "refresh_token", label: "Refresh Token", type: "password", placeholder: "Your Refresh Token" },
        { key: "channel_id", label: "Channel ID", type: "text", placeholder: "Your YouTube Channel ID" },
        { key: "api_key", label: "API Key", type: "password", placeholder: "Your YouTube Data API Key" }
      ]
    },
    tiktok: {
      name: "TikTok",
      icon: Settings2,
      fields: [
        { key: "app_id", label: "App ID", type: "text", placeholder: "Your TikTok App ID" },
        { key: "app_secret", label: "App Secret", type: "password", placeholder: "Your TikTok App Secret" },
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Access Token" },
        { key: "open_id", label: "Open ID", type: "text", placeholder: "Your Open ID" }
      ]
    },
    pinterest: {
      name: "Pinterest",
      icon: Settings2,
      fields: [
        { key: "app_id", label: "App ID", type: "text", placeholder: "Your Pinterest App ID" },
        { key: "app_secret", label: "App Secret", type: "password", placeholder: "Your Pinterest App Secret" },
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Access Token" },
        { key: "business_id", label: "Business ID", type: "text", placeholder: "Your Business ID" }
      ]
    },
    snapchat: {
      name: "Snapchat",
      icon: Settings2,
      fields: [
        { key: "client_id", label: "Client ID", type: "text", placeholder: "Your Snapchat Client ID" },
        { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Your Snapchat Client Secret" },
        { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Access Token" },
        { key: "ad_account_id", label: "Ad Account ID", type: "text", placeholder: "Your Ad Account ID" }
      ]
    }
  };

  // Convert platforms array to object for backwards compatibility
  const aiPlatforms = aiPlatformsList.reduce((acc, platform) => {
    acc[platform.key] = {
      name: platform.name,
      description: platform.description,
      supportsTools: platform.supportsTools
    };
    return acc;
  }, {} as Record<string, any>);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      
      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, newValue: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: newValue })
        .eq('setting_key', settingKey);
      
      if (error) throw error;
      
      setSettings(prev => 
        prev.map(setting => 
          setting.setting_key === settingKey 
            ? { ...setting, setting_value: newValue }
            : setting
        )
      );
      
      toast({
        title: "Settings Updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key)?.setting_value || {};
  };

  const updatePlatformCredentials = (platformKey: string, credentials: PlatformCredentials) => {
    const currentConfig = getSetting(`${platformKey}_integration`) as PlatformConfig;
    const connected = Object.values(credentials).some(value => value.trim() !== '');
    
    const newConfig = {
      ...currentConfig,
      connected,
      credentials,
      last_sync: connected ? new Date().toISOString() : undefined
    };
    
    updateSetting(`${platformKey}_integration`, newConfig);
  };

  const updateAIApiKey = (platform: string, apiKey: string) => {
    updateSetting(`${platform}_api_key`, { api_key: apiKey });
  };

  const testPlatformConfiguration = async (platform: string, type: 'social_media' | 'ai_platform') => {
    const testKey = `${platform}_${type}`;
    setTesting(prev => ({ ...prev, [testKey]: true }));

    try {
      let requestBody;
      if (type === 'ai_platform') {
        const apiKeySetting = getSetting(`${platform}_api_key`);
        requestBody = {
          platform,
          type,
          api_key: apiKeySetting.api_key
        };
      } else {
        const platformConfig = getSetting(`${platform}_integration`) as PlatformConfig;
        requestBody = {
          platform,
          type,
          credentials: platformConfig?.credentials || {}
        };
      }

      const { data, error } = await supabase.functions.invoke('test-platform-config', {
        body: requestBody
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Configuration Test Successful",
          description: data.message,
        });
        // Refresh settings to get updated verification status
        await fetchSettings();
      } else {
        toast({
          title: "Configuration Test Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: "Failed to test configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTesting(prev => ({ ...prev, [testKey]: false }));
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure system-wide integrations and API keys for OCMA.
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Platforms
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Social Media Platform Integrations
                <Badge variant="outline" className="text-xs">
                  {Object.keys(platformConfigs).filter(key => getSetting(`${key}_integration`)?.connected).length} of {Object.keys(platformConfigs).length} connected
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure system-wide social media platform connections. All users will post to these shared accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {Object.entries(platformConfigs).map(([platformKey, config]) => {
                  const IconComponent = config.icon;
                  const platformConfig = getSetting(`${platformKey}_integration`) as PlatformConfig;
                  const isConnected = platformConfig?.connected || false;
                  
                  return (
                    <Card key={platformKey} className="relative">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <IconComponent className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{config.name}</h3>
                                <Badge 
                                  variant={isConnected ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {isConnected ? "Connected" : "Not Connected"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {isConnected 
                                  ? `Last updated: ${platformConfig.last_sync ? new Date(platformConfig.last_sync).toLocaleDateString() : 'Never'}`
                                  : `Configure ${config.name} API credentials to enable posting`
                                }
                              </p>
                            </div>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit3 className="h-4 w-4 mr-2" />
                                Configure
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Configure {config.name} Integration</DialogTitle>
                                <DialogDescription>
                                  Enter your {config.name} API credentials to enable system-wide posting.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                {config.fields.map((field) => {
                                  const fieldKey = `${platformKey}_${field.key}`;
                                  const currentValue = platformConfig?.credentials?.[field.key] || '';
                                  
                                  return (
                                    <div key={field.key} className="space-y-2">
                                      <Label htmlFor={fieldKey}>{field.label}</Label>
                                      <div className="relative">
                                        <Input
                                          id={fieldKey}
                                          type={field.type === 'password' && !showPasswords[fieldKey] ? 'password' : 'text'}
                                          value={currentValue}
                                          onChange={(e) => {
                                            const newCredentials = {
                                              ...platformConfig?.credentials,
                                              [field.key]: e.target.value
                                            };
                                            updatePlatformCredentials(platformKey, newCredentials);
                                          }}
                                          placeholder={field.placeholder}
                                          className="pr-10"
                                        />
                                        {field.type === 'password' && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => togglePasswordVisibility(fieldKey)}
                                          >
                                            {showPasswords[fieldKey] ? (
                                              <EyeOff className="h-4 w-4" />
                                            ) : (
                                              <Eye className="h-4 w-4" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                 <div className="pt-4 border-t space-y-3">
                                   <p className="text-sm text-muted-foreground">
                                     Status: {isConnected ? 
                                       <span className="text-green-600 font-medium">Connected and ready for posting</span> : 
                                       <span className="text-yellow-600 font-medium">Fill in credentials to connect</span>
                                     }
                                   </p>
                                   {Object.values(platformConfig?.credentials || {}).some(value => value.trim() !== '') && (
                                     <Button
                                       onClick={() => testPlatformConfiguration(platformKey, 'social_media')}
                                       disabled={testing[`${platformKey}_social_media`]}
                                       className="w-full"
                                       variant="outline"
                                     >
                                       {testing[`${platformKey}_social_media`] ? (
                                         <>
                                           <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                           Testing Configuration...
                                         </>
                                       ) : (
                                         <>
                                           <Wrench className="h-4 w-4 mr-2" />
                                           Test Configuration
                                         </>
                                       )}
                                     </Button>
                                   )}
                                 </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                AI Platform API Keys
                <Badge variant="outline" className="text-xs">
                  {Object.keys(aiPlatforms).filter(key => getSetting(`${key}_api_key`)?.api_key?.trim()).length} of {Object.keys(aiPlatforms).length} configured
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure API keys for AI platforms used throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(aiPlatforms).map(([platformKey, config]) => {
                  const currentApiKey = getSetting(`${platformKey}_api_key`)?.api_key || '';
                  const isConfigured = currentApiKey.trim() !== '';
                  const fieldKey = `ai_${platformKey}`;
                  
                  return (
                    <div key={platformKey} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{config.name}</h4>
                          <Badge variant={isConfigured ? "default" : "outline"} className="text-xs">
                            {isConfigured ? "Configured" : "Not Set"}
                          </Badge>
                          {config.supportsTools && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              Tools Support
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                          {config.supportsTools && " • Supports function calling and tools"}
                        </p>
                      </div>
                       <div className="flex items-center gap-2">
                         <div className="relative">
                           <Input
                             type={showPasswords[fieldKey] ? 'text' : 'password'}
                             value={currentApiKey}
                             onChange={(e) => updateAIApiKey(platformKey, e.target.value)}
                             placeholder="Enter API key..."
                             className="w-80 pr-10"
                           />
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                             onClick={() => togglePasswordVisibility(fieldKey)}
                           >
                             {showPasswords[fieldKey] ? (
                               <EyeOff className="h-4 w-4" />
                             ) : (
                               <Eye className="h-4 w-4" />
                             )}
                           </Button>
                         </div>
                         {isConfigured && (
                           <Button
                             onClick={() => testPlatformConfiguration(platformKey, 'ai_platform')}
                             disabled={testing[`${platformKey}_ai_platform`]}
                             variant="outline"
                             size="sm"
                           >
                             {testing[`${platformKey}_ai_platform`] ? (
                               <RefreshCw className="h-4 w-4 animate-spin" />
                             ) : (
                               <Wrench className="h-4 w-4" />
                             )}
                           </Button>
                         )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details and system role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm font-medium">elimizroch@gmail.com</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge variant="default">Owner</Badge>
                </div>
                <div>
                  <Label>Access Level</Label>
                  <p className="text-sm text-muted-foreground">
                    Full system administration access including platform integrations and user management.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}