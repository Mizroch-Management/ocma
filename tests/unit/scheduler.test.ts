import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scheduleContent, cancelScheduledContent, triggerPublishing } from '@/lib/scheduling/scheduler';

type InvokeResult = { data?: any; error?: { message: string } | null };

const supabaseStub = vi.hoisted(() => ({
  functions: { invoke: vi.fn<[], Promise<InvokeResult>>() },
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseStub,
}));

const invokeMock = supabaseStub.functions.invoke;

vi.mock('@/utils/logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('scheduler helpers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('schedules content via schedule-post function', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        success: true,
        jobId: 'job-123',
        scheduledAt: '2024-01-01T00:00:00.000Z',
        status: 'pending',
      },
      error: null,
    });

    const result = await scheduleContent(
      {
        content: 'Hello world',
        platforms: ['twitter'],
        publishAt: '2024-01-01T00:00:00Z',
      },
      'org-1',
    );

    expect(invokeMock).toHaveBeenCalledWith('schedule-post', {
      body: {
        content: 'Hello world',
        platforms: ['twitter'],
        publishAt: '2024-01-01T00:00:00.000Z',
        organizationId: 'org-1',
      },
    });
    expect(result).toEqual({ jobId: 'job-123', scheduledAt: '2024-01-01T00:00:00.000Z', status: 'pending' });
  });

  it('returns null when scheduling fails', async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: false, error: 'boom' } });

    const result = await scheduleContent(
      {
        content: 'Broken',
        platforms: ['twitter'],
        publishAt: '2024-01-01T00:00:00Z',
      },
      'org-1',
    );

    expect(result).toBeNull();
  });

  it('cancels a scheduled post', async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null });

    const result = await cancelScheduledContent('job-123', 'org-1');

    expect(invokeMock).toHaveBeenCalledWith('cancel-scheduled-post', {
      body: { postId: 'job-123', organizationId: 'org-1' },
    });
    expect(result).toBe(true);
  });

  it('returns false when cancel fails', async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: false, error: 'nope' }, error: null });

    const result = await cancelScheduledContent('job-456', 'org-1');
    expect(result).toBe(false);
  });

  it('triggers publishing and surfaces backend errors', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValueOnce({ data: { error: 'rate limited' }, error: null });

    await expect(triggerPublishing('org-1')).resolves.not.toThrow();
    await expect(triggerPublishing('org-1')).rejects.toThrow(/rate limited/);
  });
});
