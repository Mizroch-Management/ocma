import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const supabaseStub = vi.hoisted(() => ({
  functions: { invoke: vi.fn() },
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseStub,
}));

const toastModule = vi.hoisted(() => ({ toast: vi.fn() }));

let mockOrganization: { id: string } | null = null;

vi.mock('@/hooks/use-organization', () => ({
  useOrganization: () => ({ currentOrganization: mockOrganization }),
}));

vi.mock('@/hooks/use-toast', () => toastModule);

vi.mock('@/utils/logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useSocialEngagement } from '@/hooks/use-social-engagement';
import { supabase } from '@/integrations/supabase/client';

describe('useSocialEngagement', () => {
  const invokeMock = vi.mocked(supabase.functions.invoke);
  const toastSpy = toastModule.toast;

  beforeEach(() => {
    mockOrganization = null;
    toastSpy?.mockReset();
    invokeMock.mockReset();
  });

  it('alerts when organization is missing', async () => {
    const { result } = renderHook(() => useSocialEngagement());

    await act(() => result.current.monitorMentions('twitter'));

    expect(invokeMock).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Organization Required',
      }),
    );
  });

  it('passes organizationId to the social engagement monitor', async () => {
    mockOrganization = { id: 'org-1' };
    invokeMock.mockResolvedValueOnce({
      data: {
        mentions: [],
        total_count: 0,
        high_priority_count: 0,
        pending_responses: 0,
      },
      error: null,
    });

    const { result } = renderHook(() => useSocialEngagement());

    await act(() => result.current.monitorMentions('twitter'));

    expect(invokeMock).toHaveBeenCalledWith('social-engagement-monitor', {
      body: {
        platform: 'twitter',
        action: 'monitor_mentions',
        data: {},
        organizationId: 'org-1',
      },
    });
  });
});
