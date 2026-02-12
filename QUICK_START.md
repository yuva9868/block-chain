# MedLedger - Quick Start Guide

Get up and running with MedLedger in 5 minutes.

## Installation (30 seconds)

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:3000 in your browser. Done! ✅

---

## First Steps (2 minutes)

### 1. **Landing Page**
   - You'll see the MedLedger landing page
   - Click **"Connect Wallet"** button
   - You'll be assigned a mock wallet address

### 2. **Dashboard Overview**
   - You're now on the dashboard
   - See quick statistics (Total Records, Access Granted, Views)
   - View recent records and activity

### 3. **Upload Your First Record**
   - Click **"Upload Record"** in the sidebar
   - Select any file (PDF, DOCX, JPG, etc.)
   - Add a description
   - Click **"Upload Record"**
   - A hash will be generated automatically
   - Toast notification shows success

### 4. **Grant Access**
   - Go to **"My Records"**
   - Click **"Grant Access"** on a record
   - Paste any Ethereum address (or use the mock one)
   - Click **"Grant Access"**
   - Success notification appears

### 5. **View Access Logs**
   - Click **"Access Logs"** in sidebar
   - See who accessed what and when
   - Filter by record ID or doctor name

### 6. **Verify a Record**
   - Go to **"Verify Record"**
   - Upload the same file you uploaded before
   - The hash will be generated automatically
   - Paste the original hash from "My Records"
   - Click **"Verify Record"**
   - See if the file matches (green checkmark = verified)

---

## Key Features Explained

### 🔐 Immutable Records
- Files are hashed with SHA-256 (browser-native crypto)
- Hash is stored locally (simulating blockchain)
- If file is modified, hash will be different

### 🔑 Grant Access
- Share specific records with doctors
- Each access is logged
- You control who sees what

### 📋 Access Logs
- Complete history of who accessed what
- Searchable by record or doctor
- Timestamps for audit trail

### ✅ Verify Records
- Upload a file and compare hashes
- Detects if file has been tampered
- Shows verification result clearly

---

## Navigation

```
Landing Page (/)
    ↓
    Connect Wallet
    ↓
Dashboard (/dashboard)
├── Dashboard Overview (/dashboard)
├── Upload Record (/dashboard/upload)
├── My Records (/dashboard/records)
├── Access Logs (/dashboard/logs)
└── Verify Record (/dashboard/verify)
```

---

## Useful Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Clean build cache
rm -rf .next && pnpm build
```

---

## Testing Scenarios

### Scenario 1: Upload & Verify Same File
1. Upload a file → Note the hash
2. Go to Verify Record
3. Upload the same file
4. Paste the hash from step 1
5. Result: ✅ Record Verified

### Scenario 2: Verify Tampered File
1. Upload a file → Note the hash
2. Create a slightly different file
3. Go to Verify Record
4. Upload the different file
5. Paste the original hash
6. Result: ❌ Record Invalid

### Scenario 3: Grant & Check Access Logs
1. Upload a record
2. Grant access to a doctor address
3. Go to Access Logs
4. You'll see the grant entry
5. Try viewing again for another access entry

---

## File Upload Examples

You can upload any file type:
- **Documents**: PDF, DOCX, TXT
- **Images**: JPG, PNG, GIF
- **Medical Records**: DICOM, HL7
- **Data**: CSV, JSON, XML

File size is unlimited (for demo purposes).

---

## Mock Wallet Address

When you click "Connect Wallet", you get:
```
0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1
```

This is used for all operations. In production, you'd connect MetaMask.

---

## Troubleshooting

### "Wallet not connected" error
- Click disconnect button in sidebar
- Click connect wallet on landing page
- Refresh if needed

### File hash not generating
- Check browser console for errors
- Try a different file
- Refresh the page

### Verify showing incorrect result
- Make sure you copied the hash correctly
- Use the full hash, not the shortened version
- Try uploading the exact same file

### Dark mode not visible
- Dark mode is automatic based on system settings
- To change: System Settings → Appearance → Light/Dark

---

## Code Structure

### Pages
```
/app/page.tsx                 - Landing page
/app/dashboard/page.tsx       - Dashboard overview
/app/dashboard/upload/page.tsx - Upload records
/app/dashboard/records/page.tsx - Manage records
/app/dashboard/logs/page.tsx  - Access logs
/app/dashboard/verify/page.tsx - Verify records
```

### Components
```
/components/dashboard/sidebar.tsx    - Navigation
/components/ui/*                     - Reusable UI components
```

### Utilities
```
/lib/web3.ts                - Blockchain functions
/lib/web3-context.tsx       - Wallet state management
/lib/records-context.tsx    - Records state management
/lib/hash.ts                - SHA-256 hashing
```

---

## Important Notes

⚠️ **This is a Demo Application**
- Data is stored in browser localStorage
- Data is lost if cache is cleared
- Not suitable for real medical records yet
- Perfect for hackathons and demonstrations

✅ **For Production**
- Add real blockchain integration (Ethereum)
- Add database backend (Supabase/MongoDB)
- Add proper authentication (Auth.js)
- Add encryption for sensitive data
- Deploy on Vercel or your server

---

## Next Steps

1. **Explore the code** - Open files and understand the structure
2. **Modify colors** - Edit `/app/globals.css` to change theme
3. **Add features** - Create new pages in `/app` folder
4. **Deploy** - See `DEPLOYMENT_GUIDE.md`
5. **Upgrade to real blockchain** - Add ethers.js and smart contracts

---

## Useful Links

- 📖 [README.md](./README.md) - Full documentation
- 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - How to deploy
- ✅ [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md) - What's included
- 📊 [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) - Technical details

---

## Getting Help

### Common Issues

**Port 3000 already in use?**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
pnpm dev -- -p 3001
```

**Module not found?**
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**TypeScript errors?**
```bash
# Clear build cache
rm -rf .next
pnpm build
```

---

## Development Tips

### Hot Reload
- Save any file and changes appear instantly
- No need to refresh browser
- Works for components, styles, and logic

### Console Debugging
```bash
# Open browser DevTools (F12)
# Check Console tab for any errors
# Check Network tab for API calls (none in this version)
```

### React DevTools
- Install React DevTools browser extension
- Inspect component props and state
- Profile component performance

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires Web Crypto API support (all modern browsers).

---

## Performance

- **Page Load**: < 2 seconds
- **File Upload**: Instant (no server)
- **Hash Generation**: < 1 second
- **Navigation**: Instant (SPA)

---

## Ready to Code?

1. Start the dev server: `pnpm dev`
2. Open http://localhost:3000
3. Start exploring!

Need more details? Check out the full [README.md](./README.md).

---

**Happy coding! 🚀**

Questions? See the documentation files in the project root.
