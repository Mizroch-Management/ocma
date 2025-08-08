# OCMA Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Deploy to Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Mizroch-Management/ocma)

1. Click the button above
2. Connect your GitHub account
3. Configure environment variables (see below)
4. Deploy!

### Option 2: Deploy to Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Mizroch-Management/ocma)

1. Click the button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy!

### Option 3: Manual Deployment

#### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (for database)
- Domain name (optional)

## 📋 Step-by-Step Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/Mizroch-Management/ocma.git
cd ocma
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database migrations:
```sql
-- Copy contents from /supabase/migrations/ files
```
3. Enable Row Level Security (RLS)
4. Copy your project URL and anon key

### 4. Configure Environment Variables

Create a `.env.production` file:
```bash
cp .env.production.example .env.production
```

Edit the file with your values:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
# ... other variables
```

### 5. Build the Application
```bash
npm run build
```

### 6. Deploy

#### Using Vercel CLI:
```bash
npx vercel --prod
```

#### Using Netlify CLI:
```bash
npx netlify deploy --prod
```

#### Using Docker:
```bash
docker build -t ocma-app .
docker run -p 80:80 ocma-app
```

## 🔐 Required Environment Variables

### Essential (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### AI Features (Optional but Recommended)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_OPENAI_API_KEY` | OpenAI API key | [platform.openai.com](https://platform.openai.com) |
| `VITE_ANTHROPIC_API_KEY` | Anthropic Claude key | [anthropic.com](https://anthropic.com) |
| `VITE_GOOGLE_AI_API_KEY` | Google AI key | [makersuite.google.com](https://makersuite.google.com) |

### Social Platforms (For Integrations)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_INSTAGRAM_CLIENT_ID` | Instagram app ID | [developers.facebook.com](https://developers.facebook.com) |
| `VITE_TWITTER_CLIENT_ID` | Twitter app ID | [developer.twitter.com](https://developer.twitter.com) |
| `VITE_LINKEDIN_CLIENT_ID` | LinkedIn app ID | [linkedin.com/developers](https://linkedin.com/developers) |

## 🌐 Custom Domain Setup

### Vercel
1. Go to your project settings
2. Add your domain under "Domains"
3. Update DNS records as instructed

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Configure DNS

### DNS Records
Add these records to your domain:
```
A     @     76.76.21.21
CNAME www   your-app.vercel.app
```

## 🔒 Security Checklist

Before going live:
- [ ] Set strong Supabase RLS policies
- [ ] Configure CORS properly
- [ ] Enable HTTPS only
- [ ] Set secure headers
- [ ] Rotate all API keys
- [ ] Enable 2FA on all services
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

## 📊 Post-Deployment

### 1. Verify Deployment
- Check all pages load correctly
- Test authentication flow
- Verify API connections
- Test AI features

### 2. Set Up Monitoring
- Configure error tracking (Sentry)
- Set up analytics (Google Analytics)
- Enable performance monitoring
- Configure uptime monitoring

### 3. Configure Backups
- Enable Supabase automatic backups
- Set up database replication
- Configure media backup to S3/CDN

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Environment Variables Not Loading
- Ensure `.env.production` exists
- Check variable names start with `VITE_`
- Restart build process

### Supabase Connection Issues
- Verify URL and key are correct
- Check RLS policies
- Ensure tables are created

### Performance Issues
- Enable CDN for static assets
- Implement caching strategy
- Use production build only

## 📞 Support

- GitHub Issues: [github.com/Mizroch-Management/ocma/issues](https://github.com/Mizroch-Management/ocma/issues)
- Documentation: Check `/docs` folder
- Email: support@ocma.app

## 🎉 Success!

Once deployed, your OCMA app will be available at:
- Vercel: `https://your-app.vercel.app`
- Netlify: `https://your-app.netlify.app`
- Custom: `https://yourdomain.com`

Remember to:
1. Test all features thoroughly
2. Monitor performance
3. Keep dependencies updated
4. Regular backups
5. Monitor security alerts

---

**Congratulations! Your OCMA app is now live!** 🚀