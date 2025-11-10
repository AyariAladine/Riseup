# Firebase Push Notifications Setup

## 🔐 Security Notice

The `firebase-messaging-sw.js` file is **automatically generated** and contains your Firebase credentials. This file is:

✅ **Gitignored** - Never committed to version control  
✅ **Auto-generated** - Created on `npm run dev` and `npm run build`  
✅ **Environment-based** - Uses your `.env.local` variables  

## 🚀 How It Works

### Development
1. Add Firebase credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```

2. Run dev server:
   ```bash
   pnpm run dev
   ```
   
3. The service worker is automatically generated in `public/firebase-messaging-sw.js`

### Production (Vercel/Netlify)

1. **Add Environment Variables** in your hosting platform dashboard
2. **The build script automatically generates** the service worker with production credentials
3. **No manual steps needed** - it's all automated!

## 🔒 Is This Secure?

**Yes!** Firebase client-side API keys are designed to be public. Security comes from:

1. **Domain Restrictions** - Set in Firebase Console under Project Settings → API Keys
2. **Firebase Security Rules** - Control access to Firestore/Storage
3. **Server-side secrets** - Only `FIREBASE_SERVICE_ACCOUNT_KEY` is truly sensitive

### Setting Domain Restrictions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **General**
4. Under **Your apps** → **Web apps** → Click settings
5. Add **Authorized domains**:
   - `localhost` (for development)
   - `yourdomain.com` (for production)
   - `*.yourdomain.com` (for subdomains)

## 📝 Files

- `public/firebase-messaging-sw.js` - ❌ Auto-generated, gitignored, contains real credentials
- `public/firebase-messaging-sw.template.js` - ✅ Template, committed to git, no credentials
- `scripts/generate-firebase-sw.js` - ✅ Generator script, committed to git

## 🛠️ Manual Generation

If needed, manually generate the service worker:

```bash
npm run generate-firebase-sw
```

## 📦 Deployment Checklist

- [ ] Add all Firebase env vars to Vercel/Netlify
- [ ] Set domain restrictions in Firebase Console
- [ ] Test notifications in production
- [ ] Verify service worker loads correctly

## ❓ Troubleshooting

**Service worker not loading?**
- Check browser console for errors
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Hard refresh browser: `Ctrl + Shift + R`

**Notifications not appearing?**
- Check browser notification permissions
- Verify Firebase credentials are correct
- Check server logs for FCM token errors

**Build fails?**
- Ensure `dotenv` package is installed
- Verify `scripts/generate-firebase-sw.js` exists
- Check that `predev` and `prebuild` scripts are in `package.json`
