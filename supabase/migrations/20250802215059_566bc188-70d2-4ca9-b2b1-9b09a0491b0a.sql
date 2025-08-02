-- Restore the complete Scam Dunk workflow data
UPDATE workflows 
SET 
  business_info_data = '{
    "company": "Scam Dunk",
    "industry": "Basketball Training & Content Creation",
    "targetAudience": "Basketball players, coaches, and enthusiasts looking to improve their skills",
    "goals": [
      "Build brand awareness for Scam Dunk basketball training",
      "Generate leads for training programs",
      "Create engaging basketball content",
      "Establish thought leadership in basketball training"
    ],
    "competitors": [
      "Basketball training academies",
      "Sports content creators",
      "Basketball coaching platforms"
    ],
    "uniqueSellingProposition": "Expert basketball training with proven techniques and engaging content",
    "budget": "Medium",
    "platforms": ["Instagram", "TikTok", "YouTube"],
    "contentTypes": ["Videos", "Images", "Stories"],
    "brandVoice": "Motivational, Expert, Energetic"
  }'::jsonb,
  strategy_data = '{
    "id": "strategy-001",
    "title": "Scam Dunk Basketball Training Strategy",
    "objectives": [
      "Increase brand awareness by 50% in 3 months",
      "Generate 100 qualified leads per month",
      "Build community of 10K engaged followers",
      "Position as leading basketball training expert"
    ],
    "targetAudience": {
      "primary": "Aspiring basketball players aged 16-25",
      "secondary": "Basketball coaches and trainers",
      "tertiary": "Basketball enthusiasts and fans"
    },
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
    "competitiveAnalysis": [
      {
        "competitor": "Basketball Training Academy",
        "strengths": ["Established brand", "Multiple locations"],
        "weaknesses": ["Limited online presence", "Generic content"],
        "opportunities": ["Better digital content", "Personal branding"]
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
    },
    "kpis": [
      "Follower growth rate",
      "Engagement rate",
      "Lead generation",
      "Website traffic from social media",
      "Training program sign-ups"
    ],
    "timeline": "3 months intensive campaign",
    "createdAt": "2025-08-02T21:30:00.000Z"
  }'::jsonb,
  plans_data = '[
    {
      "id": "plan-001",
      "platform": "Instagram",
      "contentType": "Carousel Post",
      "title": "5 Essential Basketball Drills for Better Ball Handling",
      "description": "Comprehensive guide showing step-by-step drills to improve ball handling skills",
      "targetAudience": "Beginner to intermediate players",
      "contentPillar": "Training Techniques",
      "schedulingNotes": "Post during peak engagement hours (6-8 PM)",
      "hashtags": ["#BasketballTraining", "#BallHandling", "#ScamDunk", "#SkillDevelopment"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    },
    {
      "id": "plan-002", 
      "platform": "TikTok",
      "contentType": "Short Video",
      "title": "30-Second Shooting Form Fix",
      "description": "Quick tutorial fixing common shooting mistakes",
      "targetAudience": "All skill levels",
      "contentPillar": "Training Techniques",
      "schedulingNotes": "Post during TikTok prime time (7-9 PM)",
      "hashtags": ["#BasketballTips", "#ShootingForm", "#QuickFix", "#Basketball"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    },
    {
      "id": "plan-003",
      "platform": "YouTube", 
      "contentType": "Tutorial Video",
      "title": "Complete Guide to Defensive Footwork",
      "description": "15-minute comprehensive tutorial on defensive positioning and movement",
      "targetAudience": "Intermediate to advanced players",
      "contentPillar": "Training Techniques", 
      "schedulingNotes": "Upload on Tuesday for best performance",
      "hashtags": ["#BasketballDefense", "#FootworkTraining", "#BasketballTutorial"],
      "createdAt": "2025-08-02T21:35:00.000Z"
    }
  ]'::jsonb,
  content_data = '[
    {
      "id": "content-001",
      "planId": "plan-001",
      "platform": "Instagram",
      "contentType": "Carousel Post",
      "title": "5 Essential Basketball Drills for Better Ball Handling",
      "caption": "Master your ball handling with these 5 essential drills! 🏀\\n\\nSwipe through to see each drill breakdown:\\n1️⃣ Stationary Dribbling\\n2️⃣ Figure 8 Dribbles\\n3️⃣ Two-Ball Dribbling\\n4️⃣ Cone Weaving\\n5️⃣ Speed Dribbling\\n\\nPractice these daily for 15 minutes and watch your handles improve! 💪\\n\\n#BasketballTraining #BallHandling #ScamDunk #SkillDevelopment #BasketballDrills",
      "visualDescription": "Carousel with 5 slides showing different ball handling drills with clear step-by-step instructions and visual demonstrations",
      "scheduledDate": "2025-08-03T18:00:00.000Z",
      "status": "scheduled",
      "createdAt": "2025-08-02T21:40:00.000Z"
    },
    {
      "id": "content-002",
      "planId": "plan-002",
      "platform": "TikTok", 
      "contentType": "Short Video",
      "title": "30-Second Shooting Form Fix",
      "caption": "Fix your shooting form in 30 seconds! 🎯\\n\\nThe most common mistake: dropping your elbow\\n\\nHere''s the fix: Keep that elbow under the ball! \\n\\n#BasketballTips #ShootingForm #QuickFix #Basketball #ScamDunk",
      "visualDescription": "Split-screen video showing wrong vs right shooting form, with slow-motion breakdown of proper elbow positioning",
      "scheduledDate": "2025-08-03T19:00:00.000Z", 
      "status": "scheduled",
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
  }'::jsonb
WHERE id = 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d';