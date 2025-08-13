import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflow } from "@/contexts/workflow-context";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { 
  Plus, 
  Play, 
  Edit3, 
  Trash2, 
  Calendar,
  Building2,
  Brain,
  CheckCircle,
  Clock
} from "lucide-react";
import { log } from '@/utils/logger';

interface WorkflowSummary {
  id: string;
  title: string;
  status: string;
  current_step: number;
  business_info_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  progress_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

interface WorkflowManagerProps {
  onSelectWorkflow: (workflowId: string | null) => void;
  currentWorkflowId: string | null;
}

export function WorkflowManager({ onSelectWorkflow, currentWorkflowId }: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflowTitle, setNewWorkflowTitle] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const { dispatch } = useWorkflow();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      loadWorkflows();
    }
  }, [currentOrganization]);

  const loadWorkflows = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('workflow_type', 'ai_workflow')
        .eq('organization_id', currentOrganization.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      log.error('Error loading workflows', error instanceof Error ? error : new Error(String(error)), { organizationId: currentOrganization?.id }, { component: 'WorkflowManager', action: 'load_workflows' });
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkflow = async () => {
    if (!newWorkflowTitle.trim() || !user || !currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          organization_id: currentOrganization.id,
          workflow_type: 'ai_workflow',
          status: 'draft',
          current_step: 0,
          metadata: {
            title: newWorkflowTitle,
            description: newWorkflowDescription
          },
          progress_data: {
            currentStep: 0,
            strategyApproved: false,
            plansApproved: false,
            contentApproved: false,
            schedulingComplete: false
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "New workflow created successfully!"
      });

      setNewWorkflowTitle("");
      setNewWorkflowDescription("");
      setShowCreateDialog(false);
      loadWorkflows();
      
      // Automatically select the new workflow
      onSelectWorkflow(data.id);
    } catch (error) {
      log.error('Error creating workflow', error instanceof Error ? error : new Error(String(error)), { organizationId: currentOrganization?.id, workflowName: name }, { component: 'WorkflowManager', action: 'create_workflow' });
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive"
      });
    }
  };

  const resumeWorkflowFromStep = async (workflowId: string, stepIndex: number) => {
    try {
      // Update the workflow's current step in the database
      const { error } = await supabase
        .from('workflows')
        .update({
          current_step: stepIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Workflow will resume from ${getStepName(stepIndex)}`
      });

      // Select the workflow after updating step
      onSelectWorkflow(workflowId);
    } catch (error) {
      log.error('Error updating workflow step', error instanceof Error ? error : new Error(String(error)), { workflowId, stepIndex }, { component: 'WorkflowManager', action: 'resume_from_step' });
      toast({
        title: "Error",
        description: "Failed to update workflow step",
        variant: "destructive"
      });
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm("Are you sure you want to delete this workflow? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow deleted successfully"
      });

      loadWorkflows();
      
      // If we deleted the current workflow, go back to list
      if (currentWorkflowId === workflowId) {
        onSelectWorkflow(null);
      }
    } catch (error) {
      log.error('Error deleting workflow', error instanceof Error ? error : new Error(String(error)), { workflowId }, { component: 'WorkflowManager', action: 'delete_workflow' });
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 0: return <Building2 className="h-4 w-4" />;
      case 1: return <Brain className="h-4 w-4" />;
      case 2: return <Calendar className="h-4 w-4" />;
      case 3: return <Edit3 className="h-4 w-4" />;
      case 4: return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStepName = (step: number) => {
    switch (step) {
      case 0: return "Business Info";
      case 1: return "Strategy";
      case 2: return "Planning";
      case 3: return "Content Creation";
      case 4: return "Scheduling";
      default: return "Unknown";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading workflows...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your AI Workflows</h2>
          <p className="text-muted-foreground">
            Manage and continue your marketing workflow projects
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Start a new AI-driven marketing workflow project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Workflow Title</Label>
                <Input
                  id="title"
                  value={newWorkflowTitle}
                  onChange={(e) => setNewWorkflowTitle(e.target.value)}
                  placeholder="e.g., Q1 2024 Marketing Campaign"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  placeholder="Brief description of this workflow..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewWorkflow} disabled={!newWorkflowTitle.trim()}>
                  Create Workflow
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first AI-driven marketing workflow to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className={`cursor-pointer transition-all hover:shadow-md ${
              currentWorkflowId === workflow.id ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {workflow.metadata?.title || workflow.title || 'Untitled Workflow'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {workflow.business_info_data?.company && (
                        <span className="font-medium">
                          {workflow.business_info_data.company}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStepIcon(workflow.current_step)}
                    <span>Current step: {getStepName(workflow.current_step)}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(workflow.created_at).toLocaleDateString()}
                    <br />
                    Updated: {new Date(workflow.updated_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          className="flex-1"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {currentWorkflowId === workflow.id ? 'Current' : 'Continue'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => onSelectWorkflow(workflow.id)}>
                          <Play className="h-3 w-3 mr-2" />
                          Continue from {getStepName(workflow.current_step)}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resumeWorkflowFromStep(workflow.id, 0)}>
                          <Building2 className="h-3 w-3 mr-2" />
                          Start from Business Info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resumeWorkflowFromStep(workflow.id, 1)}>
                          <Brain className="h-3 w-3 mr-2" />
                          Start from Strategy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resumeWorkflowFromStep(workflow.id, 2)}>
                          <Calendar className="h-3 w-3 mr-2" />
                          Start from Planning
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resumeWorkflowFromStep(workflow.id, 3)}>
                          <Edit3 className="h-3 w-3 mr-2" />
                          Start from Content Creation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resumeWorkflowFromStep(workflow.id, 4)}>
                          <CheckCircle className="h-3 w-3 mr-2" />
                          Start from Scheduling
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}