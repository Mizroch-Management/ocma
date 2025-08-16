import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY missing');

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Reply with exactly 7 words.' }],
        max_tokens: 20
      })
    });

    const json = await r.json();
    const sample = json?.choices?.[0]?.message?.content ?? '';
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      model: json?.model ?? 'unknown',
      latencyMs: Date.now() - start,
      sample
    }));
  } catch (e: any) {
    res.status(500).send({ ok: false, error: String(e) });
  }
}
