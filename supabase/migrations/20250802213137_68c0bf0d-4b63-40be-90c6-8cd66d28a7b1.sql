-- Restore the complete Scam Dunk workflow data
UPDATE workflows 
SET 
  business_info_data = '{
    "company": "Scam Dunk",
    "industry": "Cybersecurity/Consumer Protection", 
    "productService": "Platform to help people identify and avoid scams",
    "primaryObjectives": "Educate users about common scam tactics and provide tools to verify suspicious communications",
    "targetAudience": "General consumers, elderly populations, small business owners vulnerable to scams",
    "targetMarkets": "North America, Europe, Australia",
    "budget": "Mid-range marketing budget",
    "uniqueSellingPoints": "Real-time scam detection, community-driven reporting, educational resources",
    "competitors": "ScamAdviser, Better Business Bureau, Federal Trade Commission resources",
    "brandPersonality": "Trustworthy, educational, protective, empowering",
    "keyMetrics": "User engagement, scam reports prevented, educational content reach",
    "additionalContext": "Focus on building trust and credibility in cybersecurity space",
    "teamMembers": []
  }',
  strategy_data = '{
    "strategicGoals": ["Increase brand awareness in cybersecurity space", "Build trust and credibility", "Educate target audience about scam prevention"],
    "targetAudience": {
      "primary": "General consumers vulnerable to scams",
      "secondary": "Small business owners",
      "demographics": "Adults 25-65, especially those 50+"
    },
    "contentPillars": ["Educational Content", "Scam Alerts", "Community Stories", "Product Features"],
    "brandMessage": "Empowering users to stay safe from scams through education and technology",
    "competitiveAdvantage": "Real-time detection combined with community-driven reporting",
    "keyMetrics": ["User engagement", "Scam reports prevented", "Educational content reach", "Community growth"]
  }',
  plans_data = '[
    {
      "id": "week-1",
      "weekNumber": 1,
      "theme": "Foundation Building",
      "objectives": ["Establish trust and credibility", "Introduce basic scam prevention concepts"],
      "platforms": ["LinkedIn", "Facebook", "Twitter"],
      "frequency": "Daily posts",
      "keyMessages": ["Education over fear", "Community-driven protection", "Real-time detection"]
    },
    {
      "id": "week-2", 
      "weekNumber": 2,
      "theme": "Common Threats Deep Dive",
      "objectives": ["Focus on prevalent scam types", "Provide actionable tips"],
      "platforms": ["LinkedIn", "Facebook", "Twitter"],
      "frequency": "Daily posts",
      "keyMessages": ["Scam identification", "Prevention strategies", "Community success stories"]
    }
  ]',
  content_data = '[
    {
      "id": "content-1",
      "title": "5 Red Flags That Scream Phone Scam",
      "content": "Phone scams are becoming increasingly sophisticated, but there are telltale signs...",
      "platforms": ["LinkedIn"],
      "status": "approved",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "scheduledDate": "2025-01-15T09:00:00.000Z"
    }
  ]',
  current_step = 3,
  progress_data = '{
    "currentStep": 3,
    "completedSteps": [0, 1, 2],
    "strategyApproved": true,
    "plansApproved": true,
    "contentApproved": false,
    "schedulingComplete": false
  }',
  draft_data = '{
    "strategySteps": [
      {
        "id": "step-1",
        "title": "Target Audience Analysis",
        "description": "Define and analyze your target audience segments",
        "aiGenerated": "Based on your cybersecurity platform focus, your primary target audience consists of general consumers, elderly populations, and small business owners vulnerable to scams.",
        "userPrompt": "Focus on building trust and credibility in cybersecurity space",
        "status": "approved",
        "progress": 100
      },
      {
        "id": "step-2", 
        "title": "Content Pillars Strategy",
        "description": "Establish your core content themes and messaging pillars",
        "aiGenerated": "Your content strategy should be built on four core pillars: Educational Content (40%), Scam Alerts (30%), Community Stories (20%), Product Features (10%).",
        "userPrompt": "",
        "status": "approved", 
        "progress": 100
      },
      {
        "id": "step-3",
        "title": "Competitive Positioning",
        "description": "Position your brand against competitors and establish unique value",
        "aiGenerated": "Competitive Advantage: Real-time Detection + Community Power. While competitors focus on static databases, Scam Dunk offers real-time scam detection and community-driven reporting.",
        "userPrompt": "",
        "status": "approved",
        "progress": 100
      }
    ],
    "currentStrategyStep": 3,
    "selectedAIPlatform": "ChatGPT",
    "monthlyOverview": {
      "aiGenerated": "Monthly content strategy focuses on establishing Scam Dunk as the trusted authority in scam prevention through educational content, real-time alerts, and community engagement.",
      "userPrompt": "",
      "status": "approved",
      "progress": 100
    },
    "planningPhase": "weekly",
    "weeklyPlans": [
      {
        "id": "week-1",
        "week": 1,
        "theme": "Foundation Building",
        "objectives": ["Establish trust and credibility", "Introduce basic scam prevention concepts"],
        "contentTypes": [
          {
            "type": "Educational Posts",
            "count": 5,
            "platforms": ["Facebook", "LinkedIn"],
            "description": "Basic scam awareness and prevention tips"
          }
        ],
        "platforms": [
          {
            "name": "LinkedIn",
            "postingSchedule": ["Monday 9 AM", "Wednesday 2 PM", "Friday 11 AM"],
            "contentFocus": "Professional cybersecurity insights"
          }
        ],
        "aiGenerated": "Week 1 focuses on establishing Scam Dunk as a trusted voice in cybersecurity.",
        "userPrompt": "",
        "status": "approved",
        "progress": 100
      }
    ],
    "contentPieces": [
      {
        "id": "content-1",
        "type": "Educational Post",
        "platform": "LinkedIn",
        "title": "5 Red Flags That Scream Phone Scam",
        "content": "Phone scams are becoming increasingly sophisticated, but there are telltale signs that can help you identify them before falling victim.",
        "hashtags": ["CyberSecurity", "ScamPrevention", "PhoneSafety"],
        "callToAction": "Share your experience to help others stay protected",
        "schedulingSuggestion": "Monday 9:00 AM",
        "status": "approved",
        "progress": 100,
        "variations": ["Twitter version", "Facebook version"]
      }
    ],
    "selectedWeek": "Week 1",
    "selectedDay": "Monday"
  }',
  metadata = '{
    "title": "Scam Dunk Marketing Workflow",
    "isWorkflowActive": true,
    "lastAutoSave": "2025-08-02T21:30:00.000Z"
  }',
  updated_at = now()
WHERE id = 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d';