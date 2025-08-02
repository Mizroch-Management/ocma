-- Update the Scam Dunk workflow with complete data including strategy and content
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
      "platform": "LinkedIn",
      "contentTypes": ["Articles", "Posts", "Company Updates"],
      "frequency": "3-4 posts per week",
      "focus": "Professional cybersecurity insights and business protection tips"
    },
    {
      "platform": "Facebook", 
      "contentTypes": ["Educational posts", "Video content", "Community stories"],
      "frequency": "Daily posts",
      "focus": "Consumer education and scam awareness"
    },
    {
      "platform": "Twitter",
      "contentTypes": ["Quick tips", "Scam alerts", "News commentary"],
      "frequency": "2-3 posts per day", 
      "focus": "Real-time scam alerts and quick educational content"
    }
  ]',
  content_data = '[
    {
      "id": "content-1",
      "title": "5 Red Flags That Scream Phone Scam",
      "platform": "LinkedIn",
      "contentType": "Article",
      "content": "Phone scams are becoming increasingly sophisticated, but there are telltale signs that can help you identify them before falling victim...",
      "status": "draft",
      "scheduledDate": null
    },
    {
      "id": "content-2", 
      "title": "How to Verify Suspicious Emails",
      "platform": "Facebook",
      "contentType": "Educational Post",
      "content": "Received a suspicious email? Here are 4 quick steps to verify if it is legitimate or a scam attempt...",
      "status": "draft",
      "scheduledDate": null
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
  metadata = '{
    "title": "Scam Dunk Marketing Workflow",
    "completedSteps": [0, 1, 2],
    "isWorkflowActive": true,
    "lastAutoSave": "2025-08-02T20:30:00.000Z"
  }',
  updated_at = now()
WHERE id = 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d';