import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ConnectorHealth {
  platform: string;
  connected: boolean;
  username?: string;
  expiresAt?: string;
  lastSuccessfulPost?: string;
  scopes?: string[];
  error?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Get all social connections for user
    const { data: connections, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id);

    if (connError) {
      throw connError;
    }

    // Get last successful posts for each platform
    const { data: lastPosts } = await supabase
      .from('posted_content')
      .select('platform, posted_at')
      .eq('user_id', user.id)
      .order('posted_at', { ascending: false });

    const lastPostsByPlatform = lastPosts?.reduce((acc, post) => {
      if (!acc[post.platform]) {
        acc[post.platform] = post.posted_at;
      }
      return acc;
    }, {} as Record<string, string>) || {};

    // Build health status for each platform
    const platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'telegram', 'discord'];
    const health: ConnectorHealth[] = platforms.map(platform => {
      const connection = connections?.find(c => c.platform === platform);
      
      if (!connection) {
        return {
          platform,
          connected: false,
        };
      }

      const isExpired = connection.expires_at && new Date(connection.expires_at) < new Date();
      
      return {
        platform,
        connected: !isExpired,
        username: connection.platform_username,
        expiresAt: connection.expires_at,
        lastSuccessfulPost: lastPostsByPlatform[platform],
        scopes: connection.scopes?.split(' '),
        error: isExpired ? 'Token expired' : undefined,
      };
    });

    res.status(200).json({
      connectors: health,
      summary: {
        total: platforms.length,
        connected: health.filter(h => h.connected).length,
        expired: health.filter(h => h.error === 'Token expired').length,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: 'Failed to check connector health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}