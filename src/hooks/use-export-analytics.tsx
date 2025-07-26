import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useExportAnalytics() {
  const { toast } = useToast();

  const exportToCsv = useCallback(async (timeRange: string) => {
    try {
      const dateFilter = getDateFilter(timeRange);
      
      // Fetch detailed data for export
      const { data: contentData, error: contentError } = await supabase
        .from('generated_content')
        .select('*')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      const { data: publicationData, error: publicationError } = await supabase
        .from('publication_logs')
        .select('*')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (contentError || publicationError) {
        throw new Error('Failed to fetch data for export');
      }

      // Create CSV content
      const csvContent = createCsvContent(contentData || [], publicationData || []);
      
      // Download CSV
      downloadCsv(csvContent, `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      
      toast({
        title: "Export Successful",
        description: "Analytics data has been exported to CSV",
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  }, [toast]);

  const exportToJson = useCallback(async (timeRange: string) => {
    try {
      const dateFilter = getDateFilter(timeRange);
      
      const { data: analyticsData, error } = await supabase
        .from('generated_content')
        .select(`
          *,
          publication_logs(*)
        `)
        .gte('created_at', dateFilter);

      if (error) throw error;

      const jsonContent = JSON.stringify(analyticsData, null, 2);
      downloadJson(jsonContent, `analytics-data-${timeRange}-${new Date().toISOString().split('T')[0]}.json`);
      
      toast({
        title: "Export Successful",
        description: "Analytics data has been exported to JSON",
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  }, [toast]);

  return { exportToCsv, exportToJson };
}

function getDateFilter(timeRange: string): string {
  const now = new Date();
  switch (timeRange) {
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '3months':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case '6months':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    case '1year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function createCsvContent(contentData: any[], publicationData: any[]): string {
  const headers = [
    'Date',
    'Content Title',
    'Content Type',
    'Publication Status',
    'Platform',
    'Publication Status Log',
    'Success Rate',
    'Platforms',
    'Hashtags'
  ];

  const rows = contentData.map(content => {
    const publications = publicationData.filter(pub => pub.content_id === content.id);
    const successCount = publications.filter(pub => pub.status === 'success').length;
    const successRate = publications.length > 0 ? (successCount / publications.length * 100).toFixed(1) : '0';
    
    return [
      new Date(content.created_at).toLocaleDateString(),
      content.title || 'Untitled',
      content.content_type,
      content.publication_status,
      (content.platforms || []).join('; '),
      publications.map(pub => `${pub.platform}:${pub.status}`).join('; '),
      `${successRate}%`,
      (content.scheduled_platforms || []).join('; '),
      (content.hashtags || []).join('; ')
    ];
  });

  return [headers.join(','), ...rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  )].join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}