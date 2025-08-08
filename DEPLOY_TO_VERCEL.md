# 🚀 Deploy OCMA to ocma.dev on Vercel

## Your Project Details:
- **Vercel Project**: https://vercel.com/eli-mizrochs-projects/ocma
- **Production URL**: https://ocma.dev
- **Supabase Project**: https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox
- **GitHub Repo**: https://github.com/Mizroch-Management/ocma

## ✅ Quick Deploy Steps:

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to your Vercel project:**
   https://vercel.com/eli-mizrochs-projects/ocma

2. **Click "Settings" → "Environment Variables"** and add:
   ```
   VITE_SUPABASE_URL=https://wxxjbkqnvpbjywejfrox.supabase.co
   VITE_SUPABASE_ANON_KEY=[Your Supabase Anon Key - get from Supabase dashboard]
   ```

3. **Go to "Deployments" tab and click "Redeploy"**
   - Or trigger by pushing to GitHub (automatic)

### Option 2: Deploy via Git Push (Automatic)

Since your Vercel is connected to GitHub, simply:
```bash
git push origin main
```

This will automatically trigger a deployment to ocma.dev

### Option 3: Deploy via Vercel CLI

1. **Login to Vercel CLI:**
   ```bash
   npx vercel login
   ```

2. **Deploy to production:**
   ```bash
   npx vercel --prod
   ```
   - When prompted, select: "eli-mizrochs-projects"
   - Select existing project: "ocma"

## 🔑 Required Environment Variables

Get your Supabase Anon Key:
1. Go to: https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox/settings/api
2. Copy the "anon public" key
3. Add to Vercel Environment Variables

### In Vercel Dashboard:
Go to: https://vercel.com/eli-mizrochs-projects/ocma/settings/environment-variables

Add these variables for Production, Preview, and Development:

```env
VITE_SUPABASE_URL=https://wxxjbkqnvpbjywejfrox.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key from Supabase)

# Optional - Add these for full features:
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GOOGLE_AI_API_KEY=...

# Social Platform OAuth (optional):
VITE_INSTAGRAM_CLIENT_ID=...
VITE_TWITTER_CLIENT_ID=...
VITE_LINKEDIN_CLIENT_ID=...
```

## 📊 Supabase Setup

Your Supabase project (wxxjbkqnvpbjywejfrox) needs these tables:

1. **Run migrations** in Supabase SQL Editor:
   ```sql
   -- Go to: https://supabase.com/dashboard/project/wxxjbkqnvpbjywejfrox/sql/new
   -- Copy and run the SQL from: /supabase/migrations/
   ```

2. **Enable Row Level Security (RLS)**:
   - Go to Authentication → Policies
   - Enable RLS on all tables
   - Add appropriate policies

3. **Configure Auth**:
   - Go to Authentication → Settings
   - Add ocma.dev to "Site URL"
   - Add https://ocma.dev/* to "Redirect URLs"

## 🌐 Domain Configuration (ocma.dev)

If not already configured:

1. **In Vercel:**
   - Go to Settings → Domains
   - Add "ocma.dev" if not already added
   
2. **DNS Settings:**
   Add these records to your domain provider:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## ✨ Features Ready to Use:

Once deployed, your ocma.dev will have:

- ✅ **AI-Powered Content Generation** (7+ AI models)
- ✅ **Multi-Platform Publishing** (Instagram, Twitter, LinkedIn)
- ✅ **CMS with Version Control**
- ✅ **Media Library with CDN**
- ✅ **Real-time Collaboration**
- ✅ **Advanced Analytics**
- ✅ **Team Management & Workflows**
- ✅ **Enterprise Features** (SSO ready, white-label)
- ✅ **Mobile-Responsive Design**
- ✅ **Dark Mode Support**

## 🔍 Verify Deployment:

After deployment, check:

1. **Homepage loads**: https://ocma.dev
2. **Auth works**: Try signing up/logging in
3. **Supabase connection**: Check console for errors
4. **All pages accessible**: Navigate through the app

## 🆘 Troubleshooting:

### If deployment fails:
- Check Environment Variables in Vercel
- Verify Supabase keys are correct
- Check build logs in Vercel dashboard

### If Supabase connection fails:
- Verify URL and anon key
- Check RLS policies
- Ensure tables are created

### Build issues:
```bash
# Clear cache and rebuild locally
rm -rf node_modules dist
npm install
npm run build
```

## 📈 Monitor Your Deployment:

- **Vercel Dashboard**: https://vercel.com/eli-mizrochs-projects/ocma
- **Analytics**: Built into Vercel dashboard
- **Logs**: Check Functions tab for API logs
- **Performance**: Monitor Core Web Vitals

## 🎉 Success!

Once deployed, your OCMA app will be live at:
- **Production**: https://ocma.dev
- **Preview**: https://ocma-git-main-eli-mizrochs-projects.vercel.app

---

**Your world-class OCMA platform is ready to launch on ocma.dev!** 🚀