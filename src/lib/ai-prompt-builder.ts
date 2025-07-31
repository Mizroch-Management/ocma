import { BusinessInfo, AIStrategyStep, WorkflowContentPlan } from "@/contexts/workflow-context";

export const buildBusinessContext = (businessInfo: BusinessInfo): string => {
  return `
=== BUSINESS CONTEXT ===
Company: ${businessInfo.company}
Industry: ${businessInfo.industry}
Product/Service: ${businessInfo.productService}
Primary Objectives: ${businessInfo.primaryObjectives}
Target Audience: ${businessInfo.targetAudience}
Target Markets: ${businessInfo.targetMarkets}
Budget: ${businessInfo.budget}
Unique Selling Points: ${businessInfo.uniqueSellingPoints}
Competitors: ${businessInfo.competitors}
Brand Personality: ${businessInfo.brandPersonality}
Key Metrics: ${businessInfo.keyMetrics}
Additional Context: ${businessInfo.additionalContext}

=== STRATEGY TEAM ===
Team Members Working on This Strategy:
${businessInfo.teamMembers.map((member, index) => `${index + 1}. ${member}`).join('\n')}

These team members should be considered as part of the strategic approach and their expertise should be reflected in the strategy recommendations.
  `.trim();
};

export const buildStrategyContext = (approvedSteps: AIStrategyStep[]): string => {
  if (approvedSteps.length === 0) return "";
  
  return `
=== APPROVED STRATEGY CONTEXT ===
${approvedSteps.map((step, index) => `
${index + 1}. ${step.title}:
${step.aiGenerated}
`).join('\n')}
  `.trim();
};

export const buildPlanningContext = (weeklyPlans: WorkflowContentPlan[]): string => {
  const approvedPlans = weeklyPlans.filter(plan => plan.status === 'approved');
  if (approvedPlans.length === 0) return "";
  
  return `
=== APPROVED CONTENT PLANS ===
${approvedPlans.map((plan, index) => `
Week ${plan.week} - ${plan.theme}:
${plan.aiGenerated}
`).join('\n')}
  `.trim();
};

export const buildStrategyPrompt = (
  businessInfo: BusinessInfo,
  stepTitle: string,
  stepDescription: string,
  approvedSteps: AIStrategyStep[],
  customPrompt?: string
): string => {
  const businessContext = buildBusinessContext(businessInfo);
  const strategyContext = buildStrategyContext(approvedSteps);
  
  return `
${businessContext}

${strategyContext}

=== CURRENT TASK ===
Create a comprehensive marketing strategy section for: ${stepTitle}
Section Description: ${stepDescription}

=== TEAM APPROACH ===
Consider how each of the listed team members would contribute to this section:
- Marketing Strategy Firm: Overall strategic direction and market analysis
- Creative Director/Brand Manager: Brand consistency and creative direction
- Social Media Marketer: Platform-specific expertise and engagement strategies
- Additional team members: Their specific expertise and contributions

=== REQUIREMENTS ===
- Provide detailed, actionable recommendations specific to this business
- Consider all previous strategy sections already approved
- Ensure consistency with the overall business objectives and brand personality
- Format output in clear, professional prose (NOT JSON)
- Include specific metrics and measurable outcomes where applicable
- Consider the team members' expertise in your recommendations

${customPrompt ? `=== ADDITIONAL INSTRUCTIONS ===\n${customPrompt}` : ''}

Please generate a comprehensive, well-structured response that integrates all the above context.
  `.trim();
};

export const buildPlanningPrompt = (
  businessInfo: BusinessInfo,
  approvedSteps: AIStrategyStep[],
  planType: 'overview' | 'weekly',
  weekNumber?: number,
  weekTheme?: string,
  customPrompt?: string
): string => {
  const businessContext = buildBusinessContext(businessInfo);
  const strategyContext = buildStrategyContext(approvedSteps);
  
  if (planType === 'overview') {
    return `
${businessContext}

${strategyContext}

=== CURRENT TASK ===
Generate a comprehensive monthly content strategy overview based on the approved strategy above.

=== REQUIREMENTS ===
- Include strategic focus areas aligned with the approved strategy
- Define platform strategy for each relevant social media platform
- Outline content distribution approach
- Specify success metrics that align with the business objectives
- Define content pillars based on the strategy
- Consider the team members' expertise in content planning
- Format output in clear, professional prose (NOT JSON)
- Ensure all recommendations build upon the approved strategy sections

${customPrompt ? `=== ADDITIONAL INSTRUCTIONS ===\n${customPrompt}` : ''}

Please generate a detailed monthly overview that serves as the foundation for weekly planning.
    `.trim();
  } else {
    return `
${businessContext}

${strategyContext}

=== CURRENT TASK ===
Generate detailed weekly content plan for Week ${weekNumber} with theme: ${weekTheme}

=== REQUIREMENTS ===
- Build upon the approved strategy and business context
- Include specific content types aligned with the weekly theme
- Define clear objectives for this week that support overall strategy
- Specify KPIs that align with business metrics
- Consider platform-specific optimizations
- Include the team's expertise in content creation and execution
- Format output in clear, professional prose (NOT JSON)
- Ensure content aligns with brand personality and objectives

${customPrompt ? `=== ADDITIONAL INSTRUCTIONS ===\n${customPrompt}` : ''}

Please generate a comprehensive weekly plan that implements the strategy effectively.
    `.trim();
  }
};

export const buildContentPrompt = (
  businessInfo: BusinessInfo,
  approvedSteps: AIStrategyStep[],
  weeklyPlans: WorkflowContentPlan[],
  contentType: string,
  platform: string,
  weekDay: string,
  customPrompt?: string
): string => {
  const businessContext = buildBusinessContext(businessInfo);
  const strategyContext = buildStrategyContext(approvedSteps);
  const planningContext = buildPlanningContext(weeklyPlans);
  
  return `
${businessContext}

${strategyContext}

${planningContext}

=== CURRENT TASK ===
Generate ${contentType} content for ${platform} for ${weekDay}

=== CONTENT REQUIREMENTS ===
- Align with the approved strategy and weekly plans above
- Reflect the brand personality and tone of voice
- Target the specified audience demographics
- Include appropriate hashtags and call-to-action
- Optimize for the specific platform (${platform})
- Consider the team's creative and platform expertise
- Format as ready-to-use content (NOT JSON format)
- Include scheduling suggestions based on platform best practices

=== OUTPUT FORMAT ===
Please provide:
1. Content title/headline
2. Main content body
3. Relevant hashtags
4. Call-to-action
5. Optimal posting time recommendation

${customPrompt ? `=== ADDITIONAL INSTRUCTIONS ===\n${customPrompt}` : ''}

Generate engaging, platform-optimized content that implements the strategy effectively.
  `.trim();
};