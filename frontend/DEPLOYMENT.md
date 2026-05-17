# Gametime Web — Vercel Deployment Guide

## One-Click Deploy (Recommended)

### 1. Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Select **"Import Git Repository"**
4. Authenticate GitHub → Select `Gametime` repo
5. Click **"Import"**

### 2. Configure Project Settings

```
Framework: Vite
Build Command: npm run build
Output Directory: dist
Environment Variables: (configure below)
```

### 3. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

**Production:**
```
VITE_API_URL=https://<your-production-api-host>
```

**Preview (staging):**
```
VITE_API_URL=https://<your-staging-api-host>
```

**Development:**
```
VITE_API_URL=http://localhost:4000
```

### 4. Deploy

Click **"Deploy"** — Vercel will:
- Clone repository
- Install dependencies (`npm install`)
- Build (`npm run build`)
- Deploy to `gametime.vercel.app`

**That's it!** 🎉

---

## Manual Deployment (Advanced)

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy from Frontend Directory

```bash
cd /workspaces/Gametime/frontend

# Deploy to production
vercel --prod

# Deploy to preview/staging
vercel
```

### 4. Configure After First Deploy

```bash
# Reconfigure environment variables
vercel env pull
```

---

## CI/CD Pipeline (GitHub Actions)

Once connected to Vercel, automatic deployments happen:

- **Push to `main`** → Production deployment
- **Create PR** → Preview deployment (temporary URL)
- **Merge PR** → Promote preview to production

---

## Verify Deployment

1. Check Vercel Dashboard for deployment status
2. Visit `https://gametime.vercel.app` (or your custom domain)
3. Open browser DevTools → Network tab
4. Verify API calls go to the backend host you set in `VITE_API_URL` (e.g. `GET …/healthz` in the Network tab)

---

## Custom Domain Setup

### 1. In Vercel Dashboard

- Project → Settings → Domains
- Click **"Add"**
- Enter your domain (e.g., `gametime.app`)

### 2. Update DNS Records

Add CNAME record pointing to Vercel:
```
CNAME  gametime.app  cname.vercel-dns.com
```

### 3. Wait for SSL Certificate

Vercel auto-generates Let's Encrypt certificate (~5 minutes)

---

## Update Backend API URL

When your backend is deployed:

1. Update backend API URL in Vercel environment:
   ```
   VITE_API_URL=https://api.yourdomain.com
   ```

2. Trigger new deployment:
   ```bash
   vercel --prod
   ```

Or in GitHub: Push to `main` branch → Auto-deploy

---

## Troubleshooting

### Build fails with "npm ERR! missing scripts"
```bash
cd frontend
npm install
npm run build
# Test locally first
```

### API calls return 404
- Check `VITE_API_URL` env var in Vercel
- Verify backend API is running and accessible
- Check CORS headers from backend

### Blank white page
```
DevTools → Console tab
Check for JavaScript errors
Verify all imports and fonts load correctly
```

### Slow performance
- Use Vercel Analytics to identify bottlenecks
- Enable image optimization
- Check Network tab for unoptimized assets

---

## Performance Optimization

### 1. Caching Headers (Already Set)
```
/dist/* → 1 year cache (immutable)
/index.html → No cache (always fetch fresh)
```

### 2. Monitor Performance
- Vercel Analytics dashboard
- Lighthouse scores
- Real User Monitoring (RUM)

### 3. Optimize Images
```javascript
// In components, use Next.js Image or lazy loading
<img loading="lazy" src="..." />
```

### 4. Bundle Analysis
```bash
npm run build -- --analyze
```

---

## Rollback Deployment

If something breaks after deployment:

### Via Vercel Dashboard
1. Project → Deployments
2. Find previous stable deployment
3. Click **"..."** → **"Promote to Production"**

### Via CLI
```bash
vercel list
vercel promote <deployment-url>
```

---

## Monitoring & Logging

### View Runtime Logs
```bash
vercel logs [variable]
```

### Monitor Errors with Sentry (Optional)
```bash
# Add Sentry DSN to environment
VITE_SENTRY_DSN=https://...@sentry.io/...
```

---

## Staging/Preview Environment

For testing before production:

### 1. Create preview branch
```bash
git checkout -b staging
```

### 2. Make changes, push
```bash
git push origin staging
```

### 3. Vercel auto-creates preview
- Gets unique URL: `gametime-staging-abc123.vercel.app`
- Full environment with database access
- Share URL with team for QA

### 4. Merge to main when ready
```bash
git checkout main
git merge staging
git push origin main
```

Production deploys automatically! 🚀

---

## Cost Estimation

**Vercel Free Tier:**
- ✅ Unlimited deployments
- ✅ Preview builds
- ✅ 100 GB/month bandwidth
- ✅ Custom domains
- ✅ SSL certificates

**Perfect for MVP/launch!** Pro plan ($20+/month) if you exceed bandwidth.

---

## Quick Checklist

- [ ] GitHub repo connected to Vercel
- [ ] Environment variables configured (VITE_API_URL)
- [ ] First deployment successful
- [ ] API calls working (verify in DevTools)
- [ ] Custom domain setup (if applicable)
- [ ] SSL certificate active (lock icon in browser)
- [ ] Performance acceptable (Lighthouse 80+)
- [ ] Error logging setup (Sentry or similar)

---

## Next Steps

1. ✅ Deploy to `gametime.vercel.app` (production)
2. ⬜ Setup custom domain (e.g., `gametime.app`)
3. ⬜ Monitor performance in Vercel Analytics
4. ⬜ Setup error tracking (Sentry)
5. ⬜ Create staging environment for QA
6. ⬜ Setup automated backups for database
7. ⬜ Plan App Store screenshots & marketing

---

**Commands Reference:**

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Show project config
vercel env list

# Pull env vars
vercel env pull

# Monitor logs
vercel logs [project-name]

# List all deployments
vercel list

# Promote preview to production
vercel promote <deployment-url>
```
