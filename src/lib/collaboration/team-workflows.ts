/**
 * Phase 7: Team Collaboration - Role-based access and approval workflows
 * Comprehensive team collaboration system with advanced workflow management
 */

import { Database } from '../../integrations/supabase/types';
import { createClient } from '../../integrations/supabase/client';

// Types for team workflows
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type WorkflowStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
export type ApprovalAction = 'approve' | 'reject' | 'request_changes';

export interface TeamWorkflowConfig {
  id: string;
  name: string;
  organizationId: string;
  requiresApproval: boolean;
  approvalRoles: TeamRole[];
  minimumApprovals: number;
  autoPublish: boolean;
  settings: {
    allowParallelReviews: boolean;
    requireAllApprovers: boolean;
    notifyOnSubmission: boolean;
    escalationTimeoutHours: number;
  };
}

export interface WorkflowApproval {
  id: string;
  workflowId: string;
  contentId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected';
  action: ApprovalAction;
  comments: string;
  reviewedAt: Date;
  metadata: Record<string, any>;
}

export interface TeamPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canManageTeam: boolean;
  canViewAnalytics: boolean;
  canManageWorkflows: boolean;
}

export class TeamWorkflowManager {
  private supabase = createClient();

  // Role-based access control
  async getUserPermissions(userId: string, organizationId: string): Promise<TeamPermissions> {
    try {
      const { data: member, error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (error || !member) {
        throw new Error('User not found in organization');
      }

      return this.getPermissionsByRole(member.role as TeamRole);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return this.getDefaultPermissions();
    }
  }

  private getPermissionsByRole(role: TeamRole): TeamPermissions {
    const rolePermissions: Record<TeamRole, TeamPermissions> = {
      owner: {
        canCreate: true,
        canEdit: true,
        canReview: true,
        canApprove: true,
        canPublish: true,
        canManageTeam: true,
        canViewAnalytics: true,
        canManageWorkflows: true,
      },
      admin: {
        canCreate: true,
        canEdit: true,
        canReview: true,
        canApprove: true,
        canPublish: true,
        canManageTeam: true,
        canViewAnalytics: true,
        canManageWorkflows: true,
      },
      editor: {
        canCreate: true,
        canEdit: true,
        canReview: true,
        canApprove: false,
        canPublish: false,
        canManageTeam: false,
        canViewAnalytics: true,
        canManageWorkflows: false,
      },
      viewer: {
        canCreate: false,
        canEdit: false,
        canReview: false,
        canApprove: false,
        canPublish: false,
        canManageTeam: false,
        canViewAnalytics: true,
        canManageWorkflows: false,
      },
    };

    return rolePermissions[role] || this.getDefaultPermissions();
  }

  private getDefaultPermissions(): TeamPermissions {
    return {
      canCreate: false,
      canEdit: false,
      canReview: false,
      canApprove: false,
      canPublish: false,
      canManageTeam: false,
      canViewAnalytics: false,
      canManageWorkflows: false,
    };
  }

  // Workflow configuration management
  async createWorkflowConfig(config: Omit<TeamWorkflowConfig, 'id'>): Promise<TeamWorkflowConfig> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .insert({
          organization_id: config.organizationId,
          category: 'workflow',
          setting_key: `workflow_config_${Date.now()}`,
          setting_value: config,
          description: `Workflow configuration: ${config.name}`,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        ...config,
      };
    } catch (error) {
      console.error('Error creating workflow config:', error);
      throw error;
    }
  }

  async getWorkflowConfigs(organizationId: string): Promise<TeamWorkflowConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', 'workflow');

      if (error) throw error;

      return data.map(setting => ({
        id: setting.id,
        ...(setting.setting_value as Omit<TeamWorkflowConfig, 'id'>),
      }));
    } catch (error) {
      console.error('Error getting workflow configs:', error);
      return [];
    }
  }

  // Content approval workflows
  async submitForApproval(
    contentId: string,
    workflowId: string,
    submitterId: string
  ): Promise<void> {
    try {
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow) throw new Error('Workflow not found');

      // Update content status
      await this.updateContentStatus(contentId, 'pending_review');

      // Create approval requests for required reviewers
      if (workflow.requiresApproval) {
        await this.createApprovalRequests(contentId, workflowId, workflow);
      }

      // Send notifications
      await this.notifyReviewers(contentId, workflowId, submitterId);
    } catch (error) {
      console.error('Error submitting for approval:', error);
      throw error;
    }
  }

  async processApproval(
    approvalId: string,
    reviewerId: string,
    action: ApprovalAction,
    comments: string = ''
  ): Promise<void> {
    try {
      // Update approval record
      const { data, error } = await this.supabase
        .from('system_settings')
        .update({
          setting_value: {
            reviewerId,
            status: action === 'approve' ? 'approved' : 'rejected',
            action,
            comments,
            reviewedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;

      // Check if all approvals are complete
      const approval = data.setting_value as WorkflowApproval;
      await this.checkWorkflowCompletion(approval.contentId, approval.workflowId);
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  private async createApprovalRequests(
    contentId: string,
    workflowId: string,
    workflow: TeamWorkflowConfig
  ): Promise<void> {
    try {
      const reviewers = await this.getEligibleReviewers(
        workflow.organizationId,
        workflow.approvalRoles
      );

      const approvalRequests = reviewers.map(reviewer => ({
        organization_id: workflow.organizationId,
        category: 'approval',
        setting_key: `approval_${contentId}_${reviewer.user_id}`,
        setting_value: {
          workflowId,
          contentId,
          reviewerId: reviewer.user_id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        } as Partial<WorkflowApproval>,
        description: `Approval request for content ${contentId}`,
      }));

      await this.supabase.from('system_settings').insert(approvalRequests);
    } catch (error) {
      console.error('Error creating approval requests:', error);
      throw error;
    }
  }

  private async getEligibleReviewers(
    organizationId: string,
    approvalRoles: TeamRole[]
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organizationId)
        .in('role', approvalRoles);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting eligible reviewers:', error);
      return [];
    }
  }

  private async checkWorkflowCompletion(
    contentId: string,
    workflowId: string
  ): Promise<void> {
    try {
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow) return;

      const approvals = await this.getContentApprovals(contentId);
      const approvedCount = approvals.filter(a => a.status === 'approved').length;
      const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

      let newStatus: WorkflowStatus = 'pending_review';

      if (rejectedCount > 0) {
        newStatus = 'rejected';
      } else if (approvedCount >= workflow.minimumApprovals) {
        newStatus = workflow.autoPublish ? 'published' : 'approved';
      }

      await this.updateContentStatus(contentId, newStatus);

      if (newStatus === 'published' && workflow.autoPublish) {
        await this.publishContent(contentId);
      }
    } catch (error) {
      console.error('Error checking workflow completion:', error);
    }
  }

  // Content management
  private async updateContentStatus(
    contentId: string,
    status: WorkflowStatus
  ): Promise<void> {
    try {
      await this.supabase
        .from('generated_content')
        .update({
          publication_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId);
    } catch (error) {
      console.error('Error updating content status:', error);
      throw error;
    }
  }

  private async publishContent(contentId: string): Promise<void> {
    try {
      // Implementation would integrate with social platform publishing
      // This is a placeholder for the actual publishing logic
      console.log(`Publishing content ${contentId}`);
    } catch (error) {
      console.error('Error publishing content:', error);
      throw error;
    }
  }

  // Utility methods
  private async getWorkflowById(workflowId: string): Promise<TeamWorkflowConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        ...(data.setting_value as Omit<TeamWorkflowConfig, 'id'>),
      };
    } catch (error) {
      console.error('Error getting workflow by ID:', error);
      return null;
    }
  }

  private async getContentApprovals(contentId: string): Promise<WorkflowApproval[]> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'approval')
        .like('setting_key', `approval_${contentId}_%`);

      if (error) throw error;

      return data.map(setting => ({
        id: setting.id,
        ...(setting.setting_value as Omit<WorkflowApproval, 'id'>),
      }));
    } catch (error) {
      console.error('Error getting content approvals:', error);
      return [];
    }
  }

  private async notifyReviewers(
    contentId: string,
    workflowId: string,
    submitterId: string
  ): Promise<void> {
    try {
      // Implementation would send notifications via email, push notifications, etc.
      // This is a placeholder for the actual notification logic
      console.log(`Notifying reviewers for content ${contentId} in workflow ${workflowId}`);
    } catch (error) {
      console.error('Error notifying reviewers:', error);
    }
  }

  // Team collaboration features
  async getTeamActivity(organizationId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting team activity:', error);
      return [];
    }
  }

  async getDashboardStats(organizationId: string): Promise<Record<string, number>> {
    try {
      const [contentStats, memberStats, workflowStats] = await Promise.all([
        this.getContentStats(organizationId),
        this.getMemberStats(organizationId),
        this.getWorkflowStats(organizationId),
      ]);

      return {
        totalContent: contentStats.total || 0,
        pendingApproval: contentStats.pending || 0,
        publishedContent: contentStats.published || 0,
        teamMembers: memberStats.total || 0,
        activeWorkflows: workflowStats.active || 0,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {};
    }
  }

  private async getContentStats(organizationId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('generated_content')
        .select('publication_status')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const stats = data?.reduce((acc, item) => {
        const status = item.publication_status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return stats;
    } catch (error) {
      console.error('Error getting content stats:', error);
      return {};
    }
  }

  private async getMemberStats(organizationId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId);

      if (error) throw error;

      return {
        total: data?.length || 0,
      };
    } catch (error) {
      console.error('Error getting member stats:', error);
      return {};
    }
  }

  private async getWorkflowStats(organizationId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const active = data?.filter(w => w.status !== 'completed').length || 0;

      return {
        total: data?.length || 0,
        active,
      };
    } catch (error) {
      console.error('Error getting workflow stats:', error);
      return {};
    }
  }
}

// Export singleton instance
export const teamWorkflowManager = new TeamWorkflowManager();

// Utility functions
export const hasPermission = async (
  userId: string,
  organizationId: string,
  permission: keyof TeamPermissions
): Promise<boolean> => {
  try {
    const permissions = await teamWorkflowManager.getUserPermissions(userId, organizationId);
    return permissions[permission];
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

export const requiresApproval = (workflow: TeamWorkflowConfig): boolean => {
  return workflow.requiresApproval && workflow.approvalRoles.length > 0;
};