export default async function handler(req, res) {
  const aiEnabled = !!process.env.OPENAI_API_KEY;
  const channels = {
    twitter: Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    instagram: Boolean(process.env.FB_APP_ID && process.env.FB_APP_SECRET), // IG Graph via FB App
    linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
  };
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ ok: true, aiEnabled, channels }));
}
