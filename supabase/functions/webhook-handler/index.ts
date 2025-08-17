import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash, createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256',
};

interface WebhookEvent {
  platform: string;
  event_type: string;
  data: any;
  timestamp: string;
  signature?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform');
    
    if (!platform) {
      throw new Error('Platform parameter is required');
    }

    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || req.headers.get('x-hub-signature');
    
    // Verify webhook signature based on platform
    const isValid = await verifyWebhookSignature(platform, body, signature);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook data based on platform
    const webhookData = JSON.parse(body);
    const processedEvents = await processWebhookEvent(platform, webhookData, supabase);

    // Store webhook event for debugging
    await supabase.from('webhook_events').insert({
      platform,
      event_type: processedEvents[0]?.event_type || 'unknown',
      raw_data: webhookData,
      processed_data: processedEvents,
      signature,
      created_at: new Date().toISOString()
    });

    // Process each event
    for (const event of processedEvents) {
      await handleWebhookEvent(event, supabase);
    }

    return new Response(JSON.stringify({
      success: true,
      processed_events: processedEvents.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function verifyWebhookSignature(platform: string, body: string, signature: string | null): Promise<boolean> {
  if (!signature) {
    console.warn(`No signature provided for ${platform} webhook`);
    return false; // In production, you might want to require signatures
  }

  try {
    const secret = getWebhookSecret(platform);
    if (!secret) {
      console.warn(`No webhook secret configured for ${platform}`);
      return false;
    }

    switch (platform) {
      case 'facebook':
      case 'instagram':
        return await verifyFacebookSignature(body, signature, secret);
      case 'twitter':
        return await verifyTwitterSignature(body, signature, secret);
      case 'linkedin':
        return await verifyLinkedInSignature(body, signature, secret);
      default:
        console.warn(`Unknown platform for signature verification: ${platform}`);
        return false;
    }
  } catch (error) {
    console.error(`Signature verification failed for ${platform}:`, error);
    return false;
  }
}

async function verifyFacebookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = 'sha256=' + await createHmac('sha256', secret).update(body).digest('hex');
  return signature === expectedSignature;
}

async function verifyTwitterSignature(body: string, signature: string, secret: string): Promise<boolean> {
  // Twitter uses different signature schemes depending on the webhook type
  const expectedSignature = 'sha256=' + await createHmac('sha256', secret).update(body).digest('hex');
  return signature === expectedSignature;
}

async function verifyLinkedInSignature(body: string, signature: string, secret: string): Promise<boolean> {
  // LinkedIn webhook signature verification
  const expectedSignature = await createHmac('sha256', secret).update(body).digest('hex');
  return signature === expectedSignature;
}

function getWebhookSecret(platform: string): string | null {
  const envKey = `${platform.toUpperCase()}_WEBHOOK_SECRET`;
  return Deno.env.get(envKey) || null;
}

async function processWebhookEvent(platform: string, data: any, supabase: any): Promise<WebhookEvent[]> {
  const events: WebhookEvent[] = [];

  switch (platform) {
    case 'facebook':
    case 'instagram':
      events.push(...await processFacebookWebhook(data, supabase));
      break;
    case 'twitter':
      events.push(...await processTwitterWebhook(data, supabase));
      break;
    case 'linkedin':
      events.push(...await processLinkedInWebhook(data, supabase));
      break;
    default:
      console.warn(`Unknown platform: ${platform}`);
  }

  return events;
}

async function processFacebookWebhook(data: any, supabase: any): Promise<WebhookEvent[]> {
  const events: WebhookEvent[] = [];

  if (data.object === 'page') {
    for (const entry of data.entry || []) {
      // Process page events
      if (entry.changes) {
        for (const change of entry.changes) {
          events.push({
            platform: 'facebook',
            event_type: `page_${change.field}`,
            data: {
              page_id: entry.id,
              change: change.value
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Process messaging events
      if (entry.messaging) {
        for (const message of entry.messaging) {
          events.push({
            platform: 'facebook',
            event_type: 'message_received',
            data: {
              page_id: entry.id,
              sender_id: message.sender.id,
              recipient_id: message.recipient.id,
              message: message.message,
              timestamp: message.timestamp
            },
            timestamp: new Date(message.timestamp).toISOString()
          });
        }
      }
    }
  }

  return events;
}

async function processTwitterWebhook(data: any, supabase: any): Promise<WebhookEvent[]> {
  const events: WebhookEvent[] = [];

  // Process tweet create events
  if (data.tweet_create_events) {
    for (const tweet of data.tweet_create_events) {
      events.push({
        platform: 'twitter',
        event_type: 'tweet_created',
        data: {
          tweet_id: tweet.id_str,
          user_id: tweet.user.id_str,
          text: tweet.text,
          created_at: tweet.created_at
        },
        timestamp: new Date(tweet.created_at).toISOString()
      });
    }
  }

  // Process favorite events
  if (data.favorite_events) {
    for (const favorite of data.favorite_events) {
      events.push({
        platform: 'twitter',
        event_type: 'tweet_liked',
        data: {
          tweet_id: favorite.favorited_status.id_str,
          user_id: favorite.user.id_str,
          created_at: favorite.created_at
        },
        timestamp: new Date(favorite.created_at).toISOString()
      });
    }
  }

  // Process follow events
  if (data.follow_events) {
    for (const follow of data.follow_events) {
      events.push({
        platform: 'twitter',
        event_type: 'user_followed',
        data: {
          follower_id: follow.source.id_str,
          followed_id: follow.target.id_str,
          created_at: follow.created_at
        },
        timestamp: new Date(follow.created_at).toISOString()
      });
    }
  }

  // Process direct message events
  if (data.direct_message_events) {
    for (const dm of data.direct_message_events) {
      events.push({
        platform: 'twitter',
        event_type: 'direct_message',
        data: {
          message_id: dm.id,
          sender_id: dm.message_create.sender_id,
          recipient_id: dm.message_create.target.recipient_id,
          text: dm.message_create.message_data.text,
          created_at: dm.created_timestamp
        },
        timestamp: new Date(parseInt(dm.created_timestamp)).toISOString()
      });
    }
  }

  return events;
}

async function processLinkedInWebhook(data: any, supabase: any): Promise<WebhookEvent[]> {
  const events: WebhookEvent[] = [];

  // LinkedIn webhook processing (simplified)
  if (data.eventType) {
    events.push({
      platform: 'linkedin',
      event_type: data.eventType,
      data: data.eventData || data,
      timestamp: new Date().toISOString()
    });
  }

  return events;
}

async function handleWebhookEvent(event: WebhookEvent, supabase: any): Promise<void> {
  try {
    switch (event.event_type) {
      case 'message_received':
        await handleMessageReceived(event, supabase);
        break;
      case 'tweet_liked':
        await handleTweetLiked(event, supabase);
        break;
      case 'user_followed':
        await handleUserFollowed(event, supabase);
        break;
      case 'direct_message':
        await handleDirectMessage(event, supabase);
        break;
      case 'tweet_created':
        await handleTweetCreated(event, supabase);
        break;
      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }
  } catch (error) {
    console.error(`Error handling ${event.event_type}:`, error);
  }
}

async function handleMessageReceived(event: WebhookEvent, supabase: any): Promise<void> {
  // Store the message in the database
  await supabase.from('social_messages').insert({
    platform: event.platform,
    message_id: event.data.sender_id + '_' + event.timestamp,
    sender_id: event.data.sender_id,
    recipient_id: event.data.recipient_id,
    content: event.data.message?.text || '',
    message_type: 'received',
    created_at: event.timestamp,
    is_read: false
  });

  // Trigger real-time notification
  await supabase.from('notifications').insert({
    type: 'new_message',
    title: 'New Message Received',
    message: `You have a new message on ${event.platform}`,
    data: {
      platform: event.platform,
      sender_id: event.data.sender_id
    },
    created_at: new Date().toISOString()
  });
}

async function handleTweetLiked(event: WebhookEvent, supabase: any): Promise<void> {
  // Update tweet metrics
  const { data: existingPost } = await supabase
    .from('social_posts')
    .select('metrics')
    .eq('platform_post_id', event.data.tweet_id)
    .eq('platform', 'twitter')
    .single();

  if (existingPost) {
    const updatedMetrics = {
      ...existingPost.metrics,
      likes: (existingPost.metrics.likes || 0) + 1
    };

    await supabase
      .from('social_posts')
      .update({ metrics: updatedMetrics })
      .eq('platform_post_id', event.data.tweet_id)
      .eq('platform', 'twitter');
  }

  // Create engagement record
  await supabase.from('post_engagements').insert({
    platform: 'twitter',
    post_id: event.data.tweet_id,
    user_id: event.data.user_id,
    engagement_type: 'like',
    created_at: event.timestamp
  });
}

async function handleUserFollowed(event: WebhookEvent, supabase: any): Promise<void> {
  // Record follower
  await supabase.from('followers').insert({
    platform: event.platform,
    follower_id: event.data.follower_id,
    followed_id: event.data.followed_id,
    followed_at: event.timestamp
  });

  // Update follower count
  const { data: account } = await supabase
    .from('platform_accounts')
    .select('metrics')
    .eq('platform', event.platform)
    .eq('account_id', event.data.followed_id)
    .single();

  if (account) {
    const updatedMetrics = {
      ...account.metrics,
      followers: (account.metrics.followers || 0) + 1
    };

    await supabase
      .from('platform_accounts')
      .update({ metrics: updatedMetrics })
      .eq('platform', event.platform)
      .eq('account_id', event.data.followed_id);
  }
}

async function handleDirectMessage(event: WebhookEvent, supabase: any): Promise<void> {
  // Store direct message
  await supabase.from('social_messages').insert({
    platform: event.platform,
    message_id: event.data.message_id,
    sender_id: event.data.sender_id,
    recipient_id: event.data.recipient_id,
    content: event.data.text,
    message_type: 'direct',
    created_at: event.timestamp,
    is_read: false
  });
}

async function handleTweetCreated(event: WebhookEvent, supabase: any): Promise<void> {
  // Check if this is one of our posts
  const { data: account } = await supabase
    .from('platform_accounts')
    .select('*')
    .eq('platform', 'twitter')
    .eq('account_id', event.data.user_id)
    .single();

  if (account) {
    // This is a post from one of our connected accounts
    await supabase.from('social_posts').insert({
      platform: 'twitter',
      platform_post_id: event.data.tweet_id,
      content: event.data.text,
      account_id: account.id,
      organization_id: account.organization_id,
      posted_at: event.timestamp,
      status: 'published',
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      }
    });
  }
}