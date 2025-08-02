-- Update the Scam Dunk workflow with complete draft data structure
UPDATE workflows 
SET 
  draft_data = '{
    "strategySteps": [
      {
        "id": "step-1",
        "title": "Target Audience Analysis",
        "description": "Define and analyze your target audience segments",
        "aiGenerated": "Based on your cybersecurity platform focus, your primary target audience consists of:\n\n1. **General Consumers (Ages 25-65)**: Everyday internet users who are vulnerable to common scams like phishing emails, fake websites, and phone scams. They need simple, actionable advice.\n\n2. **Elderly Population (50+)**: This demographic is frequently targeted by scammers and often lacks technical knowledge. They require clear, non-technical guidance and reassurance.\n\n3. **Small Business Owners**: Entrepreneurs and small business operators who are targets for business email compromise, fake invoice scams, and vendor impersonation. They need business-focused protection strategies.\n\n**Key Insights:**\n- 60% of your audience will be mobile-first users\n- Trust and credibility are paramount - this audience has been burned before\n- Educational content performs better than fear-based messaging\n- Community-driven content builds stronger engagement",
        "userPrompt": "Focus on building trust and credibility in cybersecurity space",
        "status": "approved",
        "progress": 100
      },
      {
        "id": "step-2", 
        "title": "Content Pillars Strategy",
        "description": "Establish your core content themes and messaging pillars",
        "aiGenerated": "Your content strategy should be built on these four core pillars:\n\n**1. Educational Content (40%)**\n- How-to guides for identifying scams\n- Weekly scam alerts and breakdowns\n- Educational videos and infographics\n- \"Scam Spotlight\" series\n\n**2. Scam Alerts (30%)**\n- Real-time warnings about emerging threats\n- Community-reported scam attempts\n- Trend analysis and predictions\n- Platform-specific safety tips\n\n**3. Community Stories (20%)**\n- User testimonials and success stories\n- \"How I Avoided This Scam\" features\n- Expert interviews and guest content\n- Community challenges and engagement\n\n**4. Product Features (10%)**\n- Feature demonstrations and tutorials\n- Platform updates and improvements\n- Behind-the-scenes development insights\n- Integration guides and best practices\n\nThis distribution ensures educational value while building trust and showcasing your platform''s capabilities.",
        "userPrompt": "",
        "status": "approved", 
        "progress": 100
      },
      {
        "id": "step-3",
        "title": "Competitive Positioning",
        "description": "Position your brand against competitors and establish unique value",
        "aiGenerated": "**Competitive Advantage: Real-time Detection + Community Power**\n\nWhile competitors like ScamAdviser and BBB focus on static databases and reactive reporting, Scam Dunk offers:\n\n**Unique Differentiators:**\n- Real-time scam detection technology\n- Community-driven reporting system\n- Proactive threat intelligence\n- Educational-first approach vs. fear-based marketing\n\n**vs. ScamAdviser**: They check websites; you prevent scams before they happen\n**vs. BBB**: They react to complaints; you predict and prevent\n**vs. FTC Resources**: They provide general info; you offer personalized protection\n\n**Brand Positioning Statement:**\n\"While others tell you what happened, Scam Dunk prevents it from happening. We''re the only platform that combines cutting-edge detection technology with real community intelligence to keep you one step ahead of scammers.\"\n\n**Key Messaging:**\n- Prevention over reaction\n- Community over isolation  \n- Technology over bureaucracy\n- Education over fear",
        "userPrompt": "",
        "status": "approved",
        "progress": 100
      }
    ],
    "currentStrategyStep": 3,
    "selectedAIPlatform": "ChatGPT",
    "monthlyOverview": {
      "aiGenerated": "# Scam Dunk Monthly Content Strategy\n\n## Overview\nThis month''s content strategy focuses on establishing Scam Dunk as the trusted authority in scam prevention through educational content, real-time alerts, and community engagement.\n\n## Monthly Theme: \"Stay Ahead of Scammers\"\n\n### Week 1: Foundation Building\n- Introduce core scam prevention concepts\n- Build trust through educational content\n- Establish community engagement\n\n### Week 2: Common Threats Deep Dive\n- Focus on most prevalent scam types\n- Provide actionable prevention tips\n- Share community success stories\n\n### Week 3: Advanced Protection\n- Showcase platform features\n- Advanced detection techniques\n- Business-focused content\n\n### Week 4: Community & Future\n- Highlight community contributions\n- Emerging threat awareness\n- Looking ahead to next month\n\n## Key Performance Indicators:\n- Engagement rate: Target 8%+\n- Reach: 50K+ unique users\n- Community reports: 100+ new submissions\n- Educational content shares: 200+",
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
        "objectives": [
          "Establish trust and credibility",
          "Introduce basic scam prevention concepts", 
          "Build initial community engagement"
        ],
        "contentTypes": [
          {
            "type": "Educational Posts",
            "count": 5,
            "platforms": ["Facebook", "LinkedIn"],
            "description": "Basic scam awareness and prevention tips"
          },
          {
            "type": "Scam Alerts",
            "count": 3,
            "platforms": ["Twitter", "Facebook"],
            "description": "Current threat warnings and updates"
          }
        ],
        "platforms": [
          {
            "name": "LinkedIn",
            "postingSchedule": ["Monday 9 AM", "Wednesday 2 PM", "Friday 11 AM"],
            "contentFocus": "Professional cybersecurity insights and business protection"
          },
          {
            "name": "Facebook", 
            "postingSchedule": ["Daily 10 AM", "Daily 3 PM"],
            "contentFocus": "Consumer education and community building"
          },
          {
            "name": "Twitter",
            "postingSchedule": ["Daily 9 AM", "Daily 1 PM", "Daily 5 PM"],
            "contentFocus": "Real-time alerts and quick tips"
          }
        ],
        "kpis": ["Engagement rate", "Follower growth", "Community sign-ups"],
        "aiGenerated": "Week 1 focuses on establishing Scam Dunk as a trusted voice in cybersecurity. Content will be educational and welcoming, designed to build confidence in our expertise while encouraging community participation. Key themes include basic scam recognition, the importance of verification, and introducing our community-driven approach.",
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
        "content": "Phone scams are becoming increasingly sophisticated, but there are telltale signs that can help you identify them before falling victim:\n\n🚩 **Urgent pressure tactics**: \"You must act NOW or lose this opportunity!\"\n🚩 **Requests for personal information**: Legitimate companies don''t ask for SSN over the phone\n🚩 **Upfront payment demands**: Real prizes don''t require fees to claim\n🚩 **Caller ID spoofing**: The number looks local but something feels off\n🚩 **Too-good-to-be-true offers**: If it sounds impossible, it probably is\n\n💡 **Pro tip**: When in doubt, hang up and call the organization directly using a verified number.\n\nHave you encountered any of these red flags? Share your experience in the comments to help others stay protected.\n\n#CyberSecurity #ScamPrevention #PhoneSafety #DigitalSafety",
        "hashtags": ["CyberSecurity", "ScamPrevention", "PhoneSafety", "DigitalSafety"],
        "callToAction": "Share your experience in the comments to help others stay protected",
        "schedulingSuggestion": "Monday 9:00 AM - Professional audience most active",
        "aiGenerated": "Phone scams are becoming increasingly sophisticated, but there are telltale signs that can help you identify them before falling victim:\n\n🚩 **Urgent pressure tactics**: \"You must act NOW or lose this opportunity!\"\n🚩 **Requests for personal information**: Legitimate companies don''t ask for SSN over the phone\n🚩 **Upfront payment demands**: Real prizes don''t require fees to claim\n🚩 **Caller ID spoofing**: The number looks local but something feels off\n🚩 **Too-good-to-be-true offers**: If it sounds impossible, it probably is\n\n💡 **Pro tip**: When in doubt, hang up and call the organization directly using a verified number.\n\nHave you encountered any of these red flags? Share your experience in the comments to help others stay protected.",
        "userPrompt": "",
        "status": "approved",
        "progress": 100,
        "variations": [
          "Shortened version for Twitter: 5 phone scam red flags: 1) Urgent pressure 2) Personal info requests 3) Upfront payments 4) Caller ID spoofing 5) Too-good offers. When in doubt, hang up! #ScamAlert",
          "Facebook version with more personal tone: Friends, let''s talk about phone scams. Here are 5 warning signs that should make you hang up immediately..."
        ]
      },
      {
        "id": "content-2",
        "type": "Educational Post", 
        "platform": "Facebook",
        "title": "How to Verify Suspicious Emails",
        "content": "Received a suspicious email? Here are 4 quick steps to verify if it''s legitimate:\n\n✅ **Check the sender''s email address carefully**\n   Look for misspellings or suspicious domains (like @amazom.com instead of @amazon.com)\n\n✅ **Hover over links before clicking**\n   The preview URL should match where you expect to go\n\n✅ **Look for urgent language and grammar mistakes**\n   \"Your account will be closed in 24 hours!\" - Real companies rarely use such tactics\n\n✅ **When in doubt, contact the company directly**\n   Use official contact info from their website, not from the email\n\n🛡️ Remember: It''s always better to be cautious than sorry. Trust your instincts!\n\nWhat''s the most suspicious email you''ve received lately? Share it below (without personal details) to help others learn!",
        "hashtags": ["EmailSecurity", "PhishingPrevention", "OnlineSafety", "CyberAwareness"],
        "callToAction": "Share suspicious emails you''ve received to help others learn",
        "schedulingSuggestion": "Tuesday 10:00 AM - High engagement time for educational content",
        "aiGenerated": "Received a suspicious email? Here are 4 quick steps to verify if it''s legitimate:\n\n✅ **Check the sender''s email address carefully**\n   Look for misspellings or suspicious domains (like @amazom.com instead of @amazon.com)\n\n✅ **Hover over links before clicking**\n   The preview URL should match where you expect to go\n\n✅ **Look for urgent language and grammar mistakes**\n   \"Your account will be closed in 24 hours!\" - Real companies rarely use such tactics\n\n✅ **When in doubt, contact the company directly**\n   Use official contact info from their website, not from the email\n\n🛡️ Remember: It''s always better to be cautious than sorry. Trust your instincts!",
        "userPrompt": "",
        "status": "review",
        "progress": 100,
        "variations": [
          "Quick checklist version: Before clicking that email link: ✓ Check sender ✓ Hover over links ✓ Spot urgent language ✓ Verify independently #EmailSafety",
          "Story-based version: Sarah almost fell for a fake Amazon email yesterday. Here''s how you can avoid the same mistake..."
        ]
      }
    ],
    "selectedWeek": "Week 1",
    "selectedDay": "Monday"
  }',
  updated_at = now()
WHERE id = 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d';