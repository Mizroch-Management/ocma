import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Target, Users, DollarSign, Globe, CheckCircle } from "lucide-react";
import { useWorkflow, type BusinessInfo } from "@/contexts/workflow-context";


interface BusinessInfoCollectorProps {
  onInfoSubmitted: (businessInfo: BusinessInfo) => void;
}

export function BusinessInfoCollector({ onInfoSubmitted }: BusinessInfoCollectorProps) {
  const { toast } = useToast();
  const { state, dispatch } = useWorkflow();
  const [step, setStep] = useState(1);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    company: "",
    industry: "",
    productService: "",
    primaryObjectives: "",
    targetAudience: "",
    targetMarkets: "",
    budget: "",
    uniqueSellingPoints: "",
    competitors: "",
    brandPersonality: "",
    keyMetrics: "",
    additionalContext: ""
  });

  // Load saved business info on mount
  useEffect(() => {
    if (state.businessInfo) {
      setBusinessInfo(state.businessInfo);
    }
  }, [state.businessInfo]);

  const updateField = (field: keyof BusinessInfo, value: string) => {
    const updatedInfo = { ...businessInfo, [field]: value };
    setBusinessInfo(updatedInfo);
    // Save to workflow context immediately for persistence
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedInfo });
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = ['company', 'productService', 'primaryObjectives', 'targetAudience'];
    const missingFields = requiredFields.filter(field => !businessInfo[field as keyof BusinessInfo]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
      return;
    }

    onInfoSubmitted(businessInfo);
    
    toast({
      title: "Business Information Saved",
      description: "Your information will be used to create a customized marketing strategy."
    });
  };

  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return businessInfo.company && businessInfo.productService;
      case 2:
        return businessInfo.primaryObjectives;
      case 3:
        return businessInfo.targetAudience && businessInfo.targetMarkets;
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Company Overview</h3>
                <p className="text-sm text-muted-foreground">Tell us about your business</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={businessInfo.company}
                  onChange={(e) => updateField('company', e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={businessInfo.industry} onValueChange={(value) => updateField('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="productService">Product/Service Description *</Label>
                <Textarea
                  id="productService"
                  value={businessInfo.productService}
                  onChange={(e) => updateField('productService', e.target.value)}
                  placeholder="Describe what your company offers..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Objectives & Goals</h3>
                <p className="text-sm text-muted-foreground">Define your marketing objectives</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="primaryObjectives">Primary Marketing Objectives *</Label>
                <Textarea
                  id="primaryObjectives"
                  value={businessInfo.primaryObjectives}
                  onChange={(e) => updateField('primaryObjectives', e.target.value)}
                  placeholder="e.g., Increase brand awareness, drive sales, generate leads..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="keyMetrics">Key Success Metrics</Label>
                <Textarea
                  id="keyMetrics"
                  value={businessInfo.keyMetrics}
                  onChange={(e) => updateField('keyMetrics', e.target.value)}
                  placeholder="e.g., Brand awareness, engagement rate, conversion rate, ROI..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="budget">Marketing Budget Range</Label>
                <Select value={businessInfo.budget} onValueChange={(value) => updateField('budget', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-10k">Under $10,000</SelectItem>
                    <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
                    <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                    <SelectItem value="100k-500k">$100,000 - $500,000</SelectItem>
                    <SelectItem value="over-500k">Over $500,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Target Audience & Markets</h3>
                <p className="text-sm text-muted-foreground">Define your ideal customers</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="targetAudience">Target Audience *</Label>
                <Textarea
                  id="targetAudience"
                  value={businessInfo.targetAudience}
                  onChange={(e) => updateField('targetAudience', e.target.value)}
                  placeholder="e.g., Millennials and Gen Z professionals aged 25-40, small business owners..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="targetMarkets">Geographic Markets *</Label>
                <Textarea
                  id="targetMarkets"
                  value={businessInfo.targetMarkets}
                  onChange={(e) => updateField('targetMarkets', e.target.value)}
                  placeholder="e.g., North America, European Union, Major cities in Asia..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="competitors">Main Competitors</Label>
                <Input
                  id="competitors"
                  value={businessInfo.competitors}
                  onChange={(e) => updateField('competitors', e.target.value)}
                  placeholder="List your main competitors..."
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Brand & Additional Details</h3>
                <p className="text-sm text-muted-foreground">Optional information to enhance your strategy</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="uniqueSellingPoints">Unique Selling Points</Label>
                <Textarea
                  id="uniqueSellingPoints"
                  value={businessInfo.uniqueSellingPoints}
                  onChange={(e) => updateField('uniqueSellingPoints', e.target.value)}
                  placeholder="What makes your business unique..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="brandPersonality">Brand Personality & Tone</Label>
                <Input
                  id="brandPersonality"
                  value={businessInfo.brandPersonality}
                  onChange={(e) => updateField('brandPersonality', e.target.value)}
                  placeholder="e.g., Professional yet approachable, innovative, trustworthy..."
                />
              </div>

              <div>
                <Label htmlFor="additionalContext">Additional Context</Label>
                <Textarea
                  id="additionalContext"
                  value={businessInfo.additionalContext}
                  onChange={(e) => updateField('additionalContext', e.target.value)}
                  placeholder="Any additional information that might help create a better strategy..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Business Information</CardTitle>
            <CardDescription>
              Provide your business details to create a personalized AI marketing strategy
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Step {step} of 4</div>
            <div className="text-xs text-muted-foreground">
              {Math.round((step / 4) * 100)}% Complete
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  stepNumber < step ? 'bg-green-500 text-white' :
                  stepNumber === step ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {stepNumber < step ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    stepNumber < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Current step content */}
          {renderStep()}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={step === 1}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {step < 4 ? (
                <Button 
                  onClick={nextStep}
                  disabled={!isStepValid(step)}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Strategy
                </Button>
              )}
            </div>
          </div>

          {/* Summary of completed steps */}
          {step > 1 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Information Summary:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {businessInfo.company && (
                  <div><strong>Company:</strong> {businessInfo.company}</div>
                )}
                {businessInfo.industry && (
                  <div><strong>Industry:</strong> {businessInfo.industry}</div>
                )}
                {businessInfo.primaryObjectives && (
                  <div className="col-span-2"><strong>Objectives:</strong> {businessInfo.primaryObjectives.substring(0, 100)}...</div>
                )}
                {businessInfo.targetAudience && (
                  <div className="col-span-2"><strong>Target Audience:</strong> {businessInfo.targetAudience.substring(0, 100)}...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}