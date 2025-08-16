const REQUIRED = {
  twitter: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
  instagram: ['FB_APP_ID', 'FB_APP_SECRET'], // IG Graph via FB App
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  telegram: ['TELEGRAM_BOT_TOKEN'],
  discord: ['DISCORD_WEBHOOK_URL'],
};

export default async function handler(req, res) {
  try {
    const channel = req.query.channel || (req.body && req.body.channel);
    if (!channel || !REQUIRED[channel]) {
      res.status(400).json({ ok: false, error: 'Provide ?channel=<twitter|instagram|linkedin|telegram|discord>' });
      return;
    }
    const missing = REQUIRED[channel].filter((k) => !process.env[k]);
    res.status(200).json({ ok: missing.length === 0, channel, missing });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
