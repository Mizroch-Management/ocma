import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/hooks/use-organization';
import { useWorkflow } from './workflow-context';
import { 
  fetchUserStrategies, 
  createStrategy, 
  updateStrategy, 
  deleteStrategy,
  subscribeToStrategies,
  type Strategy 
} from '@/lib/api/strategies';
import { log } from '@/utils/logger';

interface StrategyContextType {
  strategies: Strategy[];
  loading: boolean;
  error: Error | null;
  refreshStrategies: () => Promise<void>;
  addStrategy: (strategy: Partial<Strategy>) => Promise<Strategy | null>;
  updateStrategyById: (id: string, updates: Partial<Strategy>) => Promise<Strategy | null>;
  deleteStrategyById: (id: string) => Promise<boolean>;
  getAllStrategies: () => Strategy[];
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export const useStrategies = () => {
  const context = useContext(StrategyContext);
  if (!context) {
    throw new Error('useStrategies must be used within a StrategyProvider');
  }
  return context;
};

export const StrategyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentOrganization } = useOrganization();
  const { state: workflowState } = useWorkflow();

  // Fetch strategies from database
  const refreshStrategies = useCallback(async () => {
    if (!currentOrganization?.id) {
      setStrategies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dbStrategies = await fetchUserStrategies(currentOrganization.id);
      setStrategies(dbStrategies);
    } catch (err) {
      log.error('Failed to fetch strategies', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  // Get all strategies including AI-generated ones from workflow
  const getAllStrategies = useCallback(() => {
    const allStrategies = [...strategies];
    
    // Add AI-generated strategy from workflow if available
    if (workflowState.approvedStrategy) {
      const aiStrategy: Strategy = {
        id: workflowState.approvedStrategy.id || `ai-${Date.now()}`,
        title: workflowState.approvedStrategy.title,
        description: workflowState.approvedStrategy.description || '',
        objectives: workflowState.approvedStrategy.objectives,
        organization_id: currentOrganization?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ai_generated: true,
        metadata: workflowState.approvedStrategy
      };
      
      // Check if this strategy already exists in the list
      const existingIndex = allStrategies.findIndex(s => s.id === aiStrategy.id);
      if (existingIndex === -1) {
        allStrategies.push(aiStrategy);
      } else {
        // Update existing strategy with latest data
        allStrategies[existingIndex] = aiStrategy;
      }
    }
    
    return allStrategies;
  }, [strategies, workflowState.approvedStrategy, currentOrganization?.id]);

  // Add a new strategy
  const addStrategy = useCallback(async (strategy: Partial<Strategy>) => {
    if (!currentOrganization?.id) return null;
    
    try {
      const newStrategy = await createStrategy(currentOrganization.id, strategy);
      if (newStrategy) {
        await refreshStrategies();
      }
      return newStrategy;
    } catch (err) {
      log.error('Failed to create strategy', err);
      setError(err as Error);
      return null;
    }
  }, [currentOrganization?.id, refreshStrategies]);

  // Update a strategy
  const updateStrategyById = useCallback(async (id: string, updates: Partial<Strategy>) => {
    try {
      const updatedStrategy = await updateStrategy(id, updates);
      if (updatedStrategy) {
        await refreshStrategies();
      }
      return updatedStrategy;
    } catch (err) {
      log.error('Failed to update strategy', err);
      setError(err as Error);
      return null;
    }
  }, [refreshStrategies]);

  // Delete a strategy
  const deleteStrategyById = useCallback(async (id: string) => {
    try {
      const success = await deleteStrategy(id);
      if (success) {
        await refreshStrategies();
      }
      return success;
    } catch (err) {
      log.error('Failed to delete strategy', err);
      setError(err as Error);
      return false;
    }
  }, [refreshStrategies]);

  // Initial load and subscription
  useEffect(() => {
    refreshStrategies();
    
    if (currentOrganization?.id) {
      const unsubscribe = subscribeToStrategies(
        currentOrganization.id,
        (updatedStrategies) => {
          setStrategies(updatedStrategies);
        }
      );
      
      return () => {
        unsubscribe();
      };
    }
  }, [currentOrganization?.id, refreshStrategies]);

  return (
    <StrategyContext.Provider
      value={{
        strategies,
        loading,
        error,
        refreshStrategies,
        addStrategy,
        updateStrategyById,
        deleteStrategyById,
        getAllStrategies
      }}
    >
      {children}
    </StrategyContext.Provider>
  );
};