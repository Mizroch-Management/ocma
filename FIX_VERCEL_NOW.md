# 🚨 URGENT: Fix Your Vercel Deployment - Step by Step

## The Problem
Your domain `ocma.dev` is showing an OLD project called "bloom-ai-marketing-suite" instead of your NEW OCMA project.

## Step-by-Step Fix Instructions

### Step 1: Open Vercel Dashboard
1. Open your browser
2. Go to: https://vercel.com/dashboard
3. Sign in if needed

### Step 2: Find ALL Your Projects
Look at your dashboard. You should see a list of projects. Look for:
- A project named "ocma" 
- A project with "bloom" in the name
- Any project that mentions "lovable" or "bloom-ai-marketing-suite"

**Write down the names of ALL projects you see.**

### Step 3: Check Which Project Has ocma.dev Domain

For EACH project you found:
1. Click on the project name
2. Click on "Settings" tab (at the top)
3. Click on "Domains" (in the left sidebar)
4. Look if `ocma.dev` is listed there

**The project that has ocma.dev is the one currently showing on your website.**

### Step 4: Remove ocma.dev from Wrong Project

If you found `ocma.dev` on a "bloom" or "lovable" project:
1. Stay on that project's Domains page
2. Find `ocma.dev` in the list
3. Click the "..." menu next to it
4. Click "Remove"
5. Confirm the removal

### Step 5: Find or Create the Correct OCMA Project

#### Option A: If you have an "ocma" project:
1. Click on the "ocma" project
2. Go to Settings → Git
3. Check if it shows: `Mizroch-Management/ocma` as the repository
   - If YES: Continue to Step 6
   - If NO or if it shows a different repository:
     - Click "Disconnect"
     - Then click "Connect a Git Repository"
     - Choose GitHub
     - Select `Mizroch-Management/ocma`
     - Choose the `main` branch

#### Option B: If you DON'T have an "ocma" project:
1. Go back to dashboard
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Find and select: `Mizroch-Management/ocma`
5. Click "Import"
6. Keep all default settings
7. Click "Deploy"

### Step 6: Add ocma.dev Domain to Correct Project
1. Make sure you're in the OCMA project (connected to Mizroch-Management/ocma)
2. Go to Settings → Domains
3. Type: `ocma.dev`
4. Click "Add"
5. Follow any DNS verification if needed

### Step 7: Add Environment Variables
While still in the OCMA project:
1. Go to Settings → Environment Variables
2. Add these THREE variables (copy exactly):

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://wxxjbkqnvpbjywejfrox.supabase.co`
- Click "Save"

**Variable 2:**
- Key: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4`
- Click "Save"

**Variable 3:**
- Key: `VITE_APP_OWNER_EMAIL`
- Value: `elimizroch@gmail.com`
- Click "Save"

### Step 8: Trigger Fresh Deployment
1. Go to the "Deployments" tab
2. Click on the three dots "..." next to the latest deployment
3. Click "Redeploy"
4. IMPORTANT: Turn OFF "Use existing Build Cache"
5. Click "Redeploy"

### Step 9: Wait and Verify
1. Wait 2-3 minutes for deployment
2. Open a new browser tab
3. Go to: https://ocma.dev
4. You should now see "OCMA" in the title, not "bloom"!

## Still Seeing Old Site?

If you still see the old "bloom" site after 5 minutes:

1. Clear your browser cache:
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or open the site in Incognito/Private mode

2. Check DNS propagation:
   - It might take up to 10 minutes for DNS changes

3. Verify the deployment succeeded:
   - Go back to Vercel dashboard
   - Check if the deployment shows "Ready" with a green checkmark

## Need More Help?

If you're stuck on any step, tell me:
1. Which step you're on
2. What you see on your screen
3. Any error messages

---

**Your GitHub Repository:** https://github.com/Mizroch-Management/ocma
**This has all the correct OCMA code ready to deploy!**