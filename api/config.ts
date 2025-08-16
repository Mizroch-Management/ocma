import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const aiEnabled = !!process.env.OPENAI_API_KEY;
  const channels = {
    twitter: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    instagram: !!(process.env.FB_APP_ID && process.env.FB_APP_SECRET), // IG Graph via FB App
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    telegram: !!process.env.TELEGRAM_BOT_TOKEN),
    discord: !!process.env.DISCORD_WEBHOOK_URL
  };
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ ok: true, aiEnabled, channels }));
}
