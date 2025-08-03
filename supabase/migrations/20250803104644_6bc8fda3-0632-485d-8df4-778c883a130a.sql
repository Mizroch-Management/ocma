-- Update the specific Scam Dunk workflow with complete data
UPDATE workflows 
SET 
  business_info_data = '{
    "company": "Scam Dunk",
    "industry": "Basketball Training & Content Creation",
    "productService": "Basketball training programs and content",
    "primaryObjectives": "Build brand awareness, generate leads, create engaging content, establish thought leadership",
    "targetAudience": "Basketball players, coaches, and enthusiasts looking to improve their skills",
    "targetMarkets": "North America, Europe, basketball communities",
    "budget": "Medium",
    "uniqueSellingPoints": "Expert basketball training with proven techniques and engaging content",
    "competitors": "Basketball training academies, sports content creators, basketball coaching platforms",
    "brandPersonality": "Motivational, Expert, Energetic",
    "keyMetrics": "Follower growth, engagement rate, lead generation, training program sign-ups",
    "additionalContext": "Focus on skill development and community building",
    "teamMembers": ["Coach", "Content Creator", "Social Media Manager"]
  }'::jsonb,
  strategy_data = '{
    "id": "strategy-scamdunk-001",
    "title": "Scam Dunk Basketball Training Strategy",
    "objectives": "Build brand awareness for Scam Dunk basketball training, Generate leads for training programs, Create engaging basketball content, Establish thought leadership in basketball training",
    "targetMarkets": "Basketball players aged 16-25, Basketball coaches and trainers, Basketball enthusiasts and fans",
    "budget": "Medium",
    "compliance": "Standard sports content compliance",
    "toneOfVoice": "Motivational, Expert, Energetic",
    "brandGuidelines": "Expert basketball training with proven techniques and engaging content",
    "keyMetrics": "Follower growth rate, Engagement rate, Lead generation, Website traffic from social media, Training program sign-ups",
    "additionalContext": "3 months intensive campaign focusing on skill development",
    "createdAt": "2025-08-02T21:30:00.000Z",
    "isAIGenerated": true,
    "contentPillars": [
      {
        "name": "Training Techniques",
        "description": "Advanced basketball skills and drills",
        "percentage": 40
      },
      {
        "name": "Motivational Content", 
        "description": "Inspiration and mindset coaching",
        "percentage": 30
      },
      {
        "name": "Behind the Scenes",
        "description": "Training sessions and personal stories", 
        "percentage": 20
      },
      {
        "name": "Community Engagement",
        "description": "Fan interactions and challenges",
        "percentage": 10
      }
    ],
    "platformStrategy": {
      "Instagram": {
        "focus": "Visual training content and reels",
        "postFrequency": "Daily",
        "contentMix": "60% training, 30% motivation, 10% personal"
      },
      "TikTok": {
        "focus": "Quick skill tutorials and challenges", 
        "postFrequency": "2x daily",
        "contentMix": "70% tutorials, 20% challenges, 10% trends"
      },
      "YouTube": {
        "focus": "In-depth training videos and analysis",
        "postFrequency": "3x weekly", 
        "contentMix": "50% tutorials, 30% analysis, 20% vlogs"
      }
    }
  }'::jsonb,
  plans_data = '[
    {
      "id": "plan-001",
      "weekNumber": 1,
      "theme": "Ball Handling Mastery",
      "objectives": ["Improve dribbling skills", "Build coordination", "Develop muscle memory"],
      "contentPillars": ["Training Techniques", "Motivational Content"],
      "platforms": ["Instagram", "TikTok", "YouTube"],
      "frequency": "Daily",
      "keyMessages": ["Practice makes perfect", "Consistency is key", "Master the basics"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    },
    {
      "id": "plan-002", 
      "weekNumber": 2,
      "theme": "Shooting Excellence",
      "objectives": ["Perfect shooting form", "Increase accuracy", "Build confidence"],
      "contentPillars": ["Training Techniques", "Behind the Scenes"],
      "platforms": ["Instagram", "TikTok", "YouTube"],
      "frequency": "Daily",
      "keyMessages": ["Form over power", "Repetition builds skill", "Mental game matters"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    },
    {
      "id": "plan-003",
      "weekNumber": 3, 
      "theme": "Defensive Fundamentals",
      "objectives": ["Learn defensive stance", "Improve footwork", "Understand positioning"],
      "contentPillars": ["Training Techniques", "Community Engagement"],
      "platforms": ["Instagram", "TikTok", "YouTube"],
      "frequency": "Daily",
      "keyMessages": ["Defense wins games", "Stay low and ready", "Anticipate moves"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    }
  ]'::jsonb,
  content_data = '[
    {
      "id": "content-001",
      "title": "5 Essential Basketball Drills for Better Ball Handling",
      "content": "Master your ball handling with these 5 essential drills! 🏀\\n\\nSwipe through to see each drill breakdown:\\n1️⃣ Stationary Dribbling\\n2️⃣ Figure 8 Dribbles\\n3️⃣ Two-Ball Dribbling\\n4️⃣ Cone Weaving\\n5️⃣ Speed Dribbling\\n\\nPractice these daily for 15 minutes and watch your handles improve! 💪\\n\\n#BasketballTraining #BallHandling #ScamDunk #SkillDevelopment #BasketballDrills",
      "platforms": ["Instagram"],
      "scheduledDate": "2025-08-03T18:00:00.000Z",
      "timezone": "UTC",
      "status": "scheduled",
      "platformOptimizations": {
        "Instagram": {
          "content": "Master your ball handling with these 5 essential drills! 🏀\\n\\nSwipe through to see each drill breakdown:\\n1️⃣ Stationary Dribbling\\n2️⃣ Figure 8 Dribbles\\n3️⃣ Two-Ball Dribbling\\n4️⃣ Cone Weaving\\n5️⃣ Speed Dribbling\\n\\nPractice these daily for 15 minutes and watch your handles improve! 💪",
          "hashtags": ["#BasketballTraining", "#BallHandling", "#ScamDunk", "#SkillDevelopment"],
          "visualType": "Carousel Post",
          "cta": "Try these drills and tag us!",
          "language": "English"
        }
      },
      "planId": "plan-001",
      "createdAt": "2025-08-02T21:40:00.000Z"
    },
    {
      "id": "content-002",
      "title": "30-Second Shooting Form Fix",
      "content": "Fix your shooting form in 30 seconds! 🎯\\n\\nThe most common mistake: dropping your elbow\\n\\nHere''s the fix: Keep that elbow under the ball! \\n\\n#BasketballTips #ShootingForm #QuickFix #Basketball #ScamDunk",
      "platforms": ["TikTok"],
      "scheduledDate": "2025-08-03T19:00:00.000Z",
      "timezone": "UTC", 
      "status": "scheduled",
      "platformOptimizations": {
        "TikTok": {
          "content": "Fix your shooting form in 30 seconds! 🎯\\n\\nThe most common mistake: dropping your elbow\\n\\nHere''s the fix: Keep that elbow under the ball!",
          "hashtags": ["#BasketballTips", "#ShootingForm", "#QuickFix", "#Basketball"],
          "visualType": "Short Video",
          "cta": "Try this tip and show us your results!",
          "language": "English"
        }
      },
      "planId": "plan-002",
      "createdAt": "2025-08-02T21:40:00.000Z"
    }
  ]'::jsonb,
  current_step = 4,
  progress_data = '{
    "currentStep": 4,
    "completedSteps": [1, 2, 3],
    "strategyApproved": true,
    "plansApproved": true,
    "contentApproved": true,
    "schedulingComplete": false
  }'::jsonb,
  status = 'active'
WHERE id = 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d' AND user_id = '538f4327-9f62-459c-b81a-ec567e089aae';