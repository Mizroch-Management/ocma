import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/use-organization';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { log } from '@/utils/logger';

export interface PlatformStatus {
  name: string;
  key: string;
  connected: boolean;
  lastChecked: Date;
  error?: string;
  loading?: boolean;
}

interface ConnectionStatusProps {
  platforms?: string[];
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ConnectionStatus({
  platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'],
  showLabels = true,
  size = 'md',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: ConnectionStatusProps) {
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const { currentOrganization } = useOrganization();

  const checkPlatformStatus = useCallback(async (platform: string): Promise<PlatformStatus> => {
    try {
      // Check if platform credentials exist and are valid
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('organization_id', currentOrganization?.id)
        .eq('setting_key', `${platform}_integration`)
        .single();

      if (error || !settings?.setting_value) {
        return {
          name: platform,
          key: platform,
          connected: false,
          lastChecked: new Date(),
          error: 'Not configured'
        };
      }

      const integration = settings.setting_value as any;
      
      // Check if credentials are present and marked as connected
      if (!integration.connected || !integration.credentials) {
        return {
          name: platform,
          key: platform,
          connected: false,
          lastChecked: new Date(),
          error: 'Missing credentials'
        };
      }

      // Validate token expiry if available
      if (integration.credentials.expires_at) {
        const expiryDate = new Date(integration.credentials.expires_at);
        if (expiryDate < new Date()) {
          return {
            name: platform,
            key: platform,
            connected: false,
            lastChecked: new Date(),
            error: 'Token expired'
          };
        }
      }

      // For a more thorough check, we could call the test-platform-config edge function
      // But for now, we'll trust the stored connection status
      return {
        name: platform,
        key: platform,
        connected: true,
        lastChecked: new Date()
      };

    } catch (error) {
      log.error(`Failed to check ${platform} status`, error);
      return {
        name: platform,
        key: platform,
        connected: false,
        lastChecked: new Date(),
        error: 'Check failed'
      };
    }
  }, [currentOrganization?.id]);

  const checkAllPlatforms = useCallback(async () => {
    if (!currentOrganization?.id) {
      setPlatformStatuses(platforms.map(p => ({
        name: p,
        key: p,
        connected: false,
        lastChecked: new Date(),
        error: 'No organization selected'
      })));
      return;
    }

    setIsChecking(true);
    
    try {
      const statusPromises = platforms.map(platform => checkPlatformStatus(platform));
      const statuses = await Promise.all(statusPromises);
      setPlatformStatuses(statuses);
    } catch (error) {
      log.error('Failed to check platform statuses', error);
    } finally {
      setIsChecking(false);
    }
  }, [platforms, currentOrganization?.id, checkPlatformStatus]);

  // Initial check and setup auto-refresh
  useEffect(() => {
    checkAllPlatforms();

    if (autoRefresh) {
      const interval = setInterval(checkAllPlatforms, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [checkAllPlatforms, autoRefresh, refreshInterval]);

  // Subscribe to real-time updates for platform settings
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const channel = supabase
      .channel(`platform-status:${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: `organization_id=eq.${currentOrganization.id}`
        },
        () => {
          // Refresh status when settings change
          checkAllPlatforms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id, checkAllPlatforms]);

  const getStatusIcon = (status: PlatformStatus) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
    
    if (status.loading) {
      return <RefreshCw className={`${iconSize} animate-spin text-gray-500`} />;
    }
    
    if (status.connected) {
      return <CheckCircle className={`${iconSize} text-green-500`} />;
    }
    
    if (status.error) {
      return <AlertCircle className={`${iconSize} text-yellow-500`} />;
    }
    
    return <XCircle className={`${iconSize} text-red-500`} />;
  };

  const getPlatformDisplayName = (platform: string) => {
    const names: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      twitter: 'Twitter/X',
      linkedin: 'LinkedIn',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      pinterest: 'Pinterest',
      snapchat: 'Snapchat'
    };
    return names[platform] || platform;
  };

  if (platformStatuses.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-muted-foreground">Checking connections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabels && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Platform Connections</span>
          {isChecking && (
            <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {platformStatuses.map(status => (
          <div
            key={status.key}
            className="flex items-center gap-1"
            title={status.error || `Last checked: ${status.lastChecked.toLocaleTimeString()}`}
          >
            {getStatusIcon(status)}
            {showLabels && (
              <Badge
                variant={status.connected ? 'default' : 'secondary'}
                className={size === 'sm' ? 'text-xs' : ''}
              >
                {getPlatformDisplayName(status.name)}
              </Badge>
            )}
          </div>
        ))}
      </div>
      
      {platformStatuses.some(s => s.error) && showLabels && (
        <p className="text-xs text-muted-foreground mt-2">
          Some platforms need reconfiguration. Check Settings.
        </p>
      )}
    </div>
  );
}