import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return capabilities without exposing secrets
  const capabilities = {
    aiEnabled: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
    imageEnabled: Boolean(process.env.OPENAI_API_KEY),
    connectedChannels: {
      twitter: Boolean(process.env.TWITTER_API_KEY),
      facebook: Boolean(process.env.FACEBOOK_APP_ID),
      instagram: Boolean(process.env.INSTAGRAM_CLIENT_ID),
      linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
    },
    schedulingEnabled: Boolean(process.env.UPSTASH_QSTASH_TOKEN),
    analyticsEnabled: Boolean(process.env.SENTRY_DSN && process.env.POSTHOG_API_KEY),
  };

  res.status(200).json(capabilities);
}