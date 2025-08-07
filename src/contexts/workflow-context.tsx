
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { log } from '@/utils/logger';

interface WorkflowStrategy {
  id: string;
  title: string;
  objectives: string;
  targetMarkets: string;
  budget: string;
  compliance: string;
  toneOfVoice: string;
  brandGuidelines: string;
  keyMetrics: string;
  additionalContext: string;
  createdAt: Date;
  isAIGenerated: boolean;
}

interface ContentPlan {
  id: string;
  weekNumber: number;
  theme: string;
  objectives: string[];
  contentPillars: string[];
  platforms: string[];
  frequency: string;
  keyMessages: string[];
  createdAt: Date;
}

interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledDate: Date;
  timezone: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  platformOptimizations: {
    [platform: string]: {
      content: string;
      hashtags: string[];
      visualType: string;
      cta: string;
      language: string;
    };
  };
  planId: string;
  createdAt: Date;
}

interface WorkflowProgress {
  currentStep: number;
  completedSteps: string[];
  strategyApproved: boolean;
  plansApproved: boolean;
  contentApproved: boolean;
  schedulingComplete: boolean;
}

interface AIStrategyStep {
  id: string;
  title: string;
  description: string;
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
  aiPrompt?: string;
}

interface WorkflowContentPlan {
  id: string;
  week: number;
  theme: string;
  objectives: string[];
  contentTypes: {
    type: string;
    count: number;
    platforms: string[];
    description: string;
  }[];
  platforms: {
    name: string;
    postingSchedule: string[];
    contentFocus: string;
  }[];
  kpis: string[];
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
  aiPrompt?: string;
}

interface ContentPiece {
  id: string;
  type: string;
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  callToAction: string;
  schedulingSuggestion: string;
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
  variations: string[];
  aiPrompt?: string;
}

interface WorkflowDraftData {
  businessInfoDraft?: BusinessInfo;
  strategySteps: AIStrategyStep[];
  currentStrategyStep: number;
  selectedAIPlatform: string;
  monthlyOverview: {
    aiGenerated: string;
    userPrompt: string;
    status: 'pending' | 'generating' | 'review' | 'approved';
    progress: number;
    aiPrompt?: string;
  };
  planningPhase: 'overview' | 'weekly';
  weeklyPlans: WorkflowContentPlan[];
  contentPieces: ContentPiece[];
  selectedWeek: string;
  selectedDay: string;
}

interface BusinessInfo {
  company: string;
  industry: string;
  productService: string;
  primaryObjectives: string;
  targetAudience: string;
  targetMarkets: string;
  budget: string;
  uniqueSellingPoints: string;
  competitors: string;
  brandPersonality: string;
  keyMetrics: string;
  additionalContext: string;
  teamMembers: string[];
}

interface WorkflowState {
  businessInfo: BusinessInfo | null;
  draftData: WorkflowDraftData | null;
  approvedStrategy: WorkflowStrategy | null;
  approvedPlans: ContentPlan[];
  approvedContent: GeneratedContent[];
  progress: WorkflowProgress;
  isWorkflowActive: boolean;
  currentWorkflowId?: string;
}

type WorkflowAction = 
  | { type: 'SET_BUSINESS_INFO'; payload: BusinessInfo }
  | { type: 'UPDATE_BUSINESS_INFO_DRAFT'; payload: BusinessInfo }
  | { type: 'SET_DRAFT_DATA'; payload: Partial<WorkflowDraftData> }
  | { type: 'SET_APPROVED_STRATEGY'; payload: WorkflowStrategy }
  | { type: 'SET_APPROVED_PLANS'; payload: ContentPlan[] }
  | { type: 'SET_APPROVED_CONTENT'; payload: GeneratedContent[] }
  | { type: 'UPDATE_PROGRESS'; payload: Partial<WorkflowProgress> }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'LOAD_WORKFLOW'; payload: WorkflowState };

const initialState: WorkflowState = {
  businessInfo: null,
  draftData: null,
  approvedStrategy: null,
  approvedPlans: [],
  approvedContent: [],
  progress: {
    currentStep: 0,
    completedSteps: [],
    strategyApproved: false,
    plansApproved: false,
    contentApproved: false,
    schedulingComplete: false,
  },
  isWorkflowActive: false,
};

const workflowReducer = (state: WorkflowState, action: WorkflowAction): WorkflowState => {
  switch (action.type) {
    case 'SET_BUSINESS_INFO':
      return {
        ...state,
        businessInfo: action.payload,
      };
    case 'UPDATE_BUSINESS_INFO_DRAFT':
      return {
        ...state,
        draftData: {
          ...state.draftData,
          businessInfoDraft: action.payload,
        } as WorkflowDraftData,
      };
    case 'SET_DRAFT_DATA':
      return {
        ...state,
        draftData: state.draftData ? { ...state.draftData, ...action.payload } : action.payload as WorkflowDraftData,
      };
    case 'SET_APPROVED_STRATEGY':
      return {
        ...state,
        approvedStrategy: action.payload,
        progress: {
          ...state.progress,
          strategyApproved: true,
          completedSteps: [...state.progress.completedSteps, 'strategy'],
          currentStep: Math.max(state.progress.currentStep, 1),
        },
        isWorkflowActive: true,
      };
    case 'SET_APPROVED_PLANS':
      return {
        ...state,
        approvedPlans: action.payload,
        progress: {
          ...state.progress,
          plansApproved: true,
          completedSteps: [...state.progress.completedSteps, 'planning'],
          currentStep: Math.max(state.progress.currentStep, 2),
        },
      };
    case 'SET_APPROVED_CONTENT':
      return {
        ...state,
        approvedContent: action.payload,
        progress: {
          ...state.progress,
          contentApproved: true,
          completedSteps: [...state.progress.completedSteps, 'creation'],
          currentStep: Math.max(state.progress.currentStep, 3),
        },
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, ...action.payload },
      };
    case 'RESET_WORKFLOW':
      return initialState;
    case 'LOAD_WORKFLOW':
      return action.payload;
    default:
      return state;
  }
};

const WorkflowContext = createContext<{
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
} | null>(null);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const { loadWorkflow, autoSaveWorkflow } = useWorkflowPersistence();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  // Load workflow data when user or organization changes
  useEffect(() => {
    if (!user || !currentOrganization) return; // Wait for both user and organization
    
    const loadWorkflowData = async () => {
      try {
        log.info('Loading workflow data for organization', { organizationId: currentOrganization.id }, {
          component: 'WorkflowContext',
          action: 'load_workflow_data'
        });
        // Reset workflow state when switching organizations
        dispatch({ type: 'RESET_WORKFLOW' });
        
        // Try to load from database for current organization
        const dbState = await loadWorkflow();
        if (dbState) {
          log.info('Successfully loaded workflow from database', {
            organizationId: currentOrganization.id,
            hasBusinessInfo: !!dbState.businessInfo,
            hasStrategy: !!dbState.approvedStrategy,
            plansCount: dbState.approvedPlans?.length || 0,
            contentCount: dbState.approvedContent?.length || 0,
            currentStep: dbState.progress?.currentStep
          }, {
            component: 'WorkflowContext',
            action: 'load_success'
          });
          dispatch({ type: 'LOAD_WORKFLOW', payload: dbState });
          return;
        }
        
        log.info('No workflow data found for organization', { organizationId: currentOrganization.id }, {
          component: 'WorkflowContext',
          action: 'no_data_found'
        });
      } catch (error) {
        log.error('Error loading workflow data', error as Error, undefined, {
          component: 'WorkflowContext',
          action: 'load_error'
        });
      }
    };
    
    loadWorkflowData();
  }, [loadWorkflow, user, currentOrganization]);

  // Save to database whenever state changes (only if user is logged in)
  useEffect(() => {
    if (!user) return; // Don't save if user is not logged in
    
    // Auto-save when there's any workflow data including AI work products, user inputs, and prompts
    if (state.businessInfo || 
        state.approvedStrategy || 
        state.approvedPlans.length > 0 || 
        state.approvedContent.length > 0 ||
        state.draftData?.strategySteps?.some(s => s.aiGenerated || s.aiPrompt || s.userPrompt) ||
        state.draftData?.monthlyOverview?.aiGenerated ||
        state.draftData?.weeklyPlans?.some(p => p.aiGenerated || p.aiPrompt || p.userPrompt) ||
        state.draftData?.contentPieces?.some(c => c.aiGenerated || c.aiPrompt || c.userPrompt)) {
      autoSaveWorkflow(state, state.currentWorkflowId);
    }
  }, [state, autoSaveWorkflow, user]);

  const contextValue = { state, dispatch };
  // Remove debug logs for production
  
  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    // Error handling for production
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

export type { BusinessInfo, WorkflowStrategy, ContentPlan, GeneratedContent, WorkflowProgress, WorkflowState, AIStrategyStep, ContentPiece, WorkflowDraftData, WorkflowContentPlan };
