import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ScheduleJobSchema = z.object({
  type: z.enum(['post', 'ai_generate', 'image_generate']),
  platform: z.enum(['twitter', 'facebook', 'instagram', 'linkedin', 'telegram', 'discord']).optional(),
  payload: z.record(z.any()),
  scheduledFor: z.string().datetime(),
  retryConfig: z.object({
    maxAttempts: z.number().min(1).max(5).default(3),
    backoffMultiplier: z.number().min(1).max(10).default(2),
  }).optional(),
});

function generateJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    // Validate request
    const validationResult = ScheduleJobSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { type, platform, payload, scheduledFor, retryConfig } = validationResult.data;

    // Create job record
    const jobId = generateJobId();
    const job = {
      id: jobId,
      user_id: user.id,
      type,
      platform,
      payload,
      status: 'pending',
      scheduled_for: scheduledFor,
      retry_config: retryConfig || { maxAttempts: 3, backoffMultiplier: 2 },
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    // Store in database
    const { data: createdJob, error: insertError } = await supabase
      .from('job_queue')
      .insert(job)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // If using Upstash QStash, schedule the job
    if (process.env.UPSTASH_QSTASH_TOKEN && process.env.UPSTASH_QSTASH_URL) {
      const qstashResponse = await fetch(`${process.env.UPSTASH_QSTASH_URL}/v2/schedules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_QSTASH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: `${process.env.VERCEL_URL}/api/jobs/process`,
          schedule: {
            cron: getCronExpression(new Date(scheduledFor)),
          },
          body: JSON.stringify({ jobId }),
          retries: retryConfig?.maxAttempts || 3,
          headers: {
            'Content-Type': 'application/json',
            'X-Job-Id': jobId,
          },
        }),
      });

      if (!qstashResponse.ok) {
        console.error('QStash scheduling failed:', await qstashResponse.text());
        // Don't fail the request, job is still in DB and can be processed by cron
      } else {
        const qstashData = await qstashResponse.json();
        // Update job with QStash schedule ID
        await supabase
          .from('job_queue')
          .update({ external_id: qstashData.scheduleId })
          .eq('id', jobId);
      }
    }

    res.status(200).json({
      success: true,
      jobId,
      scheduledFor,
      status: 'scheduled',
    });
  } catch (error) {
    console.error('Job scheduling error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function getCronExpression(date: Date): string {
  const minutes = date.getUTCMinutes();
  const hours = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  
  // Return a one-time cron expression
  return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
}