# MedLedger Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm package manager

### Setup Steps

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Development Server**
   ```bash
   pnpm dev
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:3000`
   - The app will be available instantly with HMR (Hot Module Replacement)

4. **Test the Application**
   - Click "Connect Wallet" on the landing page
   - You'll receive a mock wallet address
   - Navigate through all dashboard pages
   - Try uploading a file and generating hashes
   - Test the grant access feature
   - Verify records using the verify page

## Production Build

### Building

```bash
pnpm build
```

This will:
- Compile TypeScript
- Optimize React components
- Generate static pages where possible
- Create optimized bundles

### Starting Production Server

```bash
pnpm start
```

The app will run on port 3000 by default.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the best platform for Next.js applications:

1. **Connect Repository**
   - Push code to GitHub
   - Link repository to Vercel

2. **Deploy**
   - Vercel automatically detects Next.js
   - Builds and deploys on every push
   - Automatic preview deployments for PRs

3. **Environment Variables** (if needed in future)
   - Add in Vercel dashboard under Settings > Environment Variables
   - No env variables required for current version

4. **Custom Domain**
   - Add domain in Vercel dashboard
   - Configure DNS records as shown

### Option 2: Netlify

1. **Connect Repository**
   - Link GitHub repo to Netlify

2. **Configure Build**
   - Build command: `pnpm build`
   - Publish directory: `.next`

3. **Deploy**
   - Automatic deployments on push

### Option 3: Traditional Server (Node.js)

1. **Prerequisites**
   - Node.js 18+ installed on server
   - pnpm or npm installed

2. **Clone and Install**
   ```bash
   git clone <repo>
   cd medledger
   pnpm install
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Run with Process Manager**
   
   Using PM2:
   ```bash
   npm install -g pm2
   pm2 start "pnpm start" --name medledger
   pm2 save
   pm2 startup
   ```

5. **Setup Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Setup SSL (Let's Encrypt)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 4: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile
   
   COPY . .
   
   RUN pnpm build
   
   EXPOSE 3000
   
   CMD ["pnpm", "start"]
   ```

2. **Build Image**
   ```bash
   docker build -t medledger:latest .
   ```

3. **Run Container**
   ```bash
   docker run -p 3000:3000 medledger:latest
   ```

4. **Push to Registry**
   ```bash
   docker tag medledger:latest yourusername/medledger:latest
   docker push yourusername/medledger:latest
   ```

## Performance Optimization

### Current Optimizations
- Next.js 16 with Turbopack bundler
- Automatic code splitting
- Image optimization (ready for images)
- CSS minification
- JavaScript minification
- React Server Components ready

### Additional Optimizations for Production

1. **Enable Compression**
   ```bash
   # Nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Set Cache Headers**
   - Static assets: 1 year
   - HTML: no cache
   - API routes: based on content

3. **Enable CDN**
   - Vercel automatically uses edge network
   - For self-hosted, use Cloudflare

4. **Monitor Performance**
   - Use Vercel Analytics
   - Monitor bundle size
   - Track Core Web Vitals

## Security Checklist

- [x] TypeScript for type safety
- [x] Input validation with zod
- [x] No SQL injection (no database yet)
- [x] No XSS vulnerabilities (React escapes by default)
- [x] CSRF protection (built into Next.js)
- [ ] Add HTTPS (do in production)
- [ ] Add security headers (implement if needed)
- [ ] Add rate limiting (needed if adding API)
- [ ] Add authentication (mock currently)
- [ ] Add database encryption (when adding real data)

### Recommended Security Headers

```javascript
// next.config.js
export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}
```

## Environment Variables (for Future Use)

When implementing real blockchain:

```env
# Ethereum RPC
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Optional: For deployment
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## Monitoring

### Vercel Analytics
- Available in Vercel dashboard
- Tracks Core Web Vitals
- Real user monitoring

### Uptime Monitoring
- Use services like Uptime Robot
- Monitor API endpoints
- Get alerts on downtime

### Error Tracking
- Implement Sentry for error monitoring
- Track production errors
- Get alerts for critical issues

## Database Setup (Future)

When moving from localStorage to real database:

1. **Choose Database**
   - Supabase (PostgreSQL)
   - MongoDB Atlas
   - AWS RDS

2. **Add ORM**
   - Prisma (recommended)
   - Drizzle ORM
   - Sequelize

3. **Create Schema**
   - Users table
   - Records table
   - AccessLogs table
   - Transactions table

4. **Add Migrations**
   - Version control for schema changes
   - Easy rollback

## Blockchain Integration (Future)

When connecting to real blockchain:

1. **Install Web3 Libraries**
   ```bash
   pnpm add ethers wagmi @rainbow-me/rainbowkit
   ```

2. **Setup Wallet Connection**
   - MetaMask
   - WalletConnect
   - Rainbow Kit

3. **Deploy Smart Contract**
   - Hardhat or Foundry
   - Testnet first (Goerli, Sepolia)
   - Mainnet deployment

4. **Update Web3 Utilities**
   - Replace mock functions with real calls
   - Add error handling
   - Add transaction tracking

## Troubleshooting

### Build Fails
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
- Check Node version: `node --version` (should be 18+)

### App Won't Start
- Check port 3000 is available
- Check all environment variables
- Check browser console for errors

### Performance Issues
- Use Vercel Analytics to identify bottlenecks
- Check bundle size: `pnpm build --analyze`
- Monitor database queries
- Use React DevTools Profiler

### Deployment Issues
- Check build logs in Vercel/Netlify dashboard
- Verify environment variables are set
- Check file permissions
- Verify Node version on server

## Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

## Maintenance

### Regular Tasks
- Update dependencies: `pnpm update`
- Check for security vulnerabilities: `pnpm audit`
- Monitor error logs
- Check performance metrics
- Review analytics

### Backup Strategy
- GitHub as primary backup
- Tag releases
- Keep backup of production database
- Document deployment procedures

---

**Last Updated**: February 12, 2026
**Status**: Ready for Production
