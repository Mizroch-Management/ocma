
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';

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
}

type WorkflowAction = 
  | { type: 'SET_BUSINESS_INFO'; payload: BusinessInfo }
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
  
  // Load workflow data on mount (from database first, then localStorage fallback)
  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        // Try to load from database first
        const dbState = await loadWorkflow();
        if (dbState) {
          dispatch({ type: 'LOAD_WORKFLOW', payload: dbState });
          return;
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem('aiWorkflowState');
        if (saved) {
          const parsedState = JSON.parse(saved);
          // Convert date strings back to Date objects
          if (parsedState.approvedStrategy) {
            parsedState.approvedStrategy.createdAt = new Date(parsedState.approvedStrategy.createdAt);
          }
          parsedState.approvedPlans?.forEach((plan: any) => {
            plan.createdAt = new Date(plan.createdAt);
          });
          parsedState.approvedContent?.forEach((content: any) => {
            content.createdAt = new Date(content.createdAt);
            content.scheduledDate = new Date(content.scheduledDate);
          });
          dispatch({ type: 'LOAD_WORKFLOW', payload: parsedState });
        }
      } catch (error) {
        // Silent error handling for production
      }
    };
    
    loadWorkflowData();
  }, [loadWorkflow]);

  // Save to both localStorage and database whenever state changes
  useEffect(() => {
    // Save to localStorage immediately for offline access
    localStorage.setItem('aiWorkflowState', JSON.stringify(state));
    
    // Auto-save to database with debouncing
    autoSaveWorkflow(state);
  }, [state, autoSaveWorkflow]);

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
