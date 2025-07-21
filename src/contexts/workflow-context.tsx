
import React, { createContext, useContext, useReducer, useEffect } from 'react';

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

interface WorkflowState {
  approvedStrategy: WorkflowStrategy | null;
  approvedPlans: ContentPlan[];
  approvedContent: GeneratedContent[];
  progress: WorkflowProgress;
  isWorkflowActive: boolean;
}

type WorkflowAction = 
  | { type: 'SET_APPROVED_STRATEGY'; payload: WorkflowStrategy }
  | { type: 'SET_APPROVED_PLANS'; payload: ContentPlan[] }
  | { type: 'SET_APPROVED_CONTENT'; payload: GeneratedContent[] }
  | { type: 'UPDATE_PROGRESS'; payload: Partial<WorkflowProgress> }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'LOAD_WORKFLOW'; payload: WorkflowState };

const initialState: WorkflowState = {
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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aiWorkflowState');
    if (saved) {
      try {
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
      } catch (error) {
        console.error('Failed to load workflow state:', error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('aiWorkflowState', JSON.stringify(state));
  }, [state]);

  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

export type { WorkflowStrategy, ContentPlan, GeneratedContent, WorkflowProgress };
