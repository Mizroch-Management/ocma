import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { Bot, Wrench, Zap, Brain, Search, Eye, FileText, Code, Palette, MessageSquare } from "lucide-react";

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresPremium?: boolean;
  enhancesQuality?: boolean;
}

export interface AIPlatformTools {
  [platformKey: string]: {
    availableTools: AITool[];
    enabledTools: string[];
  };
}

const aiToolsRegistry = {
  openai: [
    {
      id: 'web_search',
      name: 'Web Search',
      description: 'Access real-time information from the web for current insights',
      icon: Search,
      requiresPremium: true,
      enhancesQuality: true
    },
    {
      id: 'code_interpreter',
      name: 'Code Interpreter',
      description: 'Advanced data analysis and computational capabilities',
      icon: Code,
      requiresPremium: true,
      enhancesQuality: true
    },
    {
      id: 'vision_analysis',
      name: 'Vision Analysis',
      description: 'Analyze images and visual content for strategy insights',
      icon: Eye,
      requiresPremium: false,
      enhancesQuality: true
    }
  ],
  anthropic: [
    {
      id: 'artifacts',
      name: 'Artifacts',
      description: 'Generate structured documents and analysis reports',
      icon: FileText,
      requiresPremium: true,
      enhancesQuality: true
    },
    {
      id: 'advanced_reasoning',
      name: 'Advanced Reasoning',
      description: 'Deep analytical thinking for complex strategy problems',
      icon: Brain,
      requiresPremium: true,
      enhancesQuality: true
    }
  ],
  google_ai: [
    {
      id: 'real_time_data',
      name: 'Real-time Data',
      description: 'Access current trends and market data',
      icon: Zap,
      requiresPremium: true,
      enhancesQuality: true
    },
    {
      id: 'multimodal_analysis',
      name: 'Multimodal Analysis',
      description: 'Combine text, image, and audio analysis',
      icon: Palette,
      requiresPremium: false,
      enhancesQuality: true
    }
  ],
  perplexity: [
    {
      id: 'live_search',
      name: 'Live Search',
      description: 'Real-time web search and citations',
      icon: Search,
      requiresPremium: false,
      enhancesQuality: true
    },
    {
      id: 'academic_sources',
      name: 'Academic Sources',
      description: 'Access to scholarly articles and research',
      icon: FileText,
      requiresPremium: true,
      enhancesQuality: true
    }
  ],
  grok: [
    {
      id: 'social_insights',
      name: 'Social Insights',
      description: 'Real-time social media trends and sentiment',
      icon: MessageSquare,
      requiresPremium: true,
      enhancesQuality: true
    },
    {
      id: 'market_analysis',
      name: 'Market Analysis',
      description: 'Live market data and financial insights',
      icon: Zap,
      requiresPremium: true,
      enhancesQuality: true
    }
  ]
};

interface AIPlatformToolsSelectorProps {
  selectedPlatform: string;
  onToolsUpdate: (platformKey: string, enabledTools: string[]) => void;
  className?: string;
}

export function AIPlatformToolsSelector({ 
  selectedPlatform, 
  onToolsUpdate,
  className 
}: AIPlatformToolsSelectorProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [platformTools, setPlatformTools] = useState<AIPlatformTools>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrganization && selectedPlatform) {
      loadPlatformTools();
    }
  }, [currentOrganization, selectedPlatform]);

  const loadPlatformTools = async () => {
    if (!currentOrganization || !selectedPlatform) return;

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', `${selectedPlatform}_tools`)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const availableTools = aiToolsRegistry[selectedPlatform as keyof typeof aiToolsRegistry] || [];
      const settingValue = data?.setting_value as { enabled_tools?: string[] } | null;
      const enabledTools = settingValue?.enabled_tools || [];

      setPlatformTools({
        [selectedPlatform]: {
          availableTools,
          enabledTools
        }
      });

      // Notify parent component
      onToolsUpdate(selectedPlatform, enabledTools);

    } catch (error) {
      console.error('Error loading platform tools:', error);
      toast({
        title: "Error",
        description: "Failed to load AI platform tools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateToolSelection = async (toolId: string, enabled: boolean) => {
    if (!currentOrganization || !selectedPlatform) return;

    setSaving(true);
    try {
      const currentTools = platformTools[selectedPlatform]?.enabledTools || [];
      const newEnabledTools = enabled
        ? [...currentTools, toolId]
        : currentTools.filter(id => id !== toolId);

      const settingValue = {
        enabled_tools: newEnabledTools,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: `${selectedPlatform}_tools`,
          setting_value: settingValue,
          organization_id: currentOrganization.id,
          category: 'ai_tools',
          description: `AI tools configuration for ${selectedPlatform}`
        }, {
          onConflict: 'setting_key,organization_id'
        });

      if (error) throw error;

      // Update local state
      setPlatformTools(prev => ({
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          enabledTools: newEnabledTools
        }
      }));

      // Notify parent component
      onToolsUpdate(selectedPlatform, newEnabledTools);

      toast({
        title: "Tools Updated",
        description: `${enabled ? 'Enabled' : 'Disabled'} ${toolId.replace('_', ' ')} for ${selectedPlatform}`,
      });

    } catch (error) {
      console.error('Error updating tool selection:', error);
      toast({
        title: "Error",
        description: "Failed to update tool selection",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedPlatform || !aiToolsRegistry[selectedPlatform as keyof typeof aiToolsRegistry]) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Select an AI platform to configure advanced tools
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPlatformTools = platformTools[selectedPlatform];
  const availableTools = currentPlatformTools?.availableTools || [];
  const enabledTools = currentPlatformTools?.enabledTools || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Advanced Tools for {selectedPlatform}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable advanced tools to enhance AI-generated strategy quality. 
          Premium tools may require additional subscription costs.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableTools.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No advanced tools available for this platform
          </p>
        ) : (
          <div className="space-y-4">
            {availableTools.map((tool) => {
              const IconComponent = tool.icon;
              const isEnabled = enabledTools.includes(tool.id);
              
              return (
                <div key={tool.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{tool.name}</h4>
                        {tool.requiresPremium && (
                          <Badge variant="secondary" className="text-xs">Premium</Badge>
                        )}
                        {tool.enhancesQuality && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Quality+
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`tool-${tool.id}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) => updateToolSelection(tool.id, checked)}
                          disabled={saving}
                        />
                        <Label htmlFor={`tool-${tool.id}`} className="sr-only">
                          Toggle {tool.name}
                        </Label>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
              );
            })}
            
            <Separator />
            
            <div className="text-center text-sm text-muted-foreground">
              <p>
                <strong>{enabledTools.length}</strong> of <strong>{availableTools.length}</strong> tools enabled
              </p>
              <p className="mt-1">
                Enhanced tools will be automatically used when generating AI strategy content
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}