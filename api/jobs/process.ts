import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { jobId } = req.body;
    
    if (!jobId) {
      // Process all pending jobs if no specific job ID
      return processPendingJobs(supabase, res);
    }

    // Get the specific job
    const { data: job, error: fetchError } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if job is already processing or completed
    if (job.status === 'processing' || job.status === 'completed') {
      return res.status(200).json({ 
        message: `Job already ${job.status}`,
        jobId,
      });
    }

    // Update job status to processing
    await supabase
      .from('job_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq('id', jobId);

    // Process based on job type
    let result;
    try {
      switch (job.type) {
        case 'post':
          result = await processPostJob(job, supabase);
          break;
        case 'ai_generate':
          result = await processAIGenerateJob(job, supabase);
          break;
        case 'image_generate':
          result = await processImageGenerateJob(job, supabase);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Update job as completed
      await supabase
        .from('job_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result,
        })
        .eq('id', jobId);

      res.status(200).json({
        success: true,
        jobId,
        result,
      });
    } catch (processError) {
      // Handle job failure
      const shouldRetry = job.attempts < job.retry_config.maxAttempts;
      
      await supabase
        .from('job_queue')
        .update({ 
          status: shouldRetry ? 'pending' : 'failed',
          last_error: processError instanceof Error ? processError.message : 'Unknown error',
          next_retry_at: shouldRetry 
            ? new Date(Date.now() + Math.pow(job.retry_config.backoffMultiplier, job.attempts) * 60000).toISOString()
            : null,
        })
        .eq('id', jobId);

      throw processError;
    }
  } catch (error) {
    console.error('Job processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function processPendingJobs(supabase: ReturnType<typeof createClient>, res: VercelResponse) {
  // Get all pending jobs that should be processed now
  const { data: jobs, error } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  const results = [];
  for (const job of jobs || []) {
    try {
      // Process each job
      const response = await fetch(`${process.env.VERCEL_URL}/api/jobs/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: job.id }),
      });

      const result = await response.json();
      results.push({ jobId: job.id, ...result });
    } catch (error) {
      results.push({ 
        jobId: job.id, 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  res.status(200).json({
    processed: results.length,
    results,
  });
}

interface Job {
  id: string;
  type: string;
  platform?: string;
  payload: Record<string, unknown>;
  user_token?: string;
  status: string;
  attempts: number;
  retry_config: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

async function processPostJob(job: Job, supabase: ReturnType<typeof createClient>) {
  // Call the appropriate posting endpoint
  const response = await fetch(`${process.env.VERCEL_URL}/api/post/${job.platform}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${job.user_token}`, // Would need to be stored securely
    },
    body: JSON.stringify(job.payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Posting failed: ${error}`);
  }

  return response.json();
}

async function processAIGenerateJob(job: Job, supabase: ReturnType<typeof createClient>) {
  // Call AI generation endpoint
  const response = await fetch(`${process.env.VERCEL_URL}/api/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${job.user_token}`,
    },
    body: JSON.stringify(job.payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI generation failed: ${error}`);
  }

  return response.json();
}

async function processImageGenerateJob(job: Job, supabase: ReturnType<typeof createClient>) {
  // Call image generation endpoint
  const response = await fetch(`${process.env.VERCEL_URL}/api/images/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${job.user_token}`,
    },
    body: JSON.stringify(job.payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${error}`);
  }

  return response.json();
}