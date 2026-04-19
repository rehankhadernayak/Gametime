# Gametime Mobile — EAS Build Setup Guide

## Quick Start (Local Development)

```bash
# Start dev server
npm start

# Preview on iOS simulator (macOS only)
npm run ios

# Preview on Android emulator
npm run android

# Web preview
npm run web
```

---

## App Store Deployment (iOS)

### 1. Create Apple Developer Account
- Go to [developer.apple.com](https://developer.apple.com)
- Enroll in Apple Developer Program ($99/year)
- Create App ID and Provisioning Profile in App Store Connect

### 2. Setup EAS Credentials
```bash
# Authenticate with Expo
eas login

# Configure iOS credentials (one-time setup)
eas credentials configure --platform ios

# Follow prompts to create or select:
# - Apple Team ID
# - App ID
# - Provisioning Profile
# - Distribution Certificate
```

### 3. Build for TestFlight
```bash
# Create preview build (for internal testing)
eas build --platform ios --profile preview

# Create production build
eas build --platform ios --profile production
```

### 4. Submit to App Store
```bash
# Automatic submission (requires App Store credentials)
eas submit --platform ios --latest

# Or manual: Use TestFlight to test, then submit via App Store Connect
```

---

## Google Play Deployment (Android)

### 1. Create Google Play Developer Account
- Go to [play.google.com/console](https://play.google.com/console)
- Pay $25 one-time registration fee
- Create app listing

### 2. Setup EAS Credentials
```bash
# Configure Android credentials
eas credentials configure --platform android

# Generate or upload keystore file:
# - Method 1: EAS builds and stores it for you (recommended)
# - Method 2: Provide your own keystore
```

### 3. Build for Play Store
```bash
# Create internal testing build
eas build --platform android --profile preview

# Create production build
eas build --platform android --profile production
```

### 4. Submit to Play Store
```bash
# Download signed APK/AAB from EAS
# Upload manually to Google Play Console (requires review period ~2-4 hours for release)

# Or automatic (if credentials configured):
eas submit --platform android --latest
```

---

## Update API URLs

**Before building for staging/production:**

1. Update backend API endpoints in `eas.json`:
   ```json
   "preview": {
     "env": {
       "EXPO_PUBLIC_API_URL": "https://your-staging-api.com"
     }
   },
   "production": {
     "env": {
       "EXPO_PUBLIC_API_URL": "https://your-production-api.com"
     }
   }
   ```

2. Rebuild:
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

---

## Troubleshooting

### Build fails with "Pod install error"
```bash
# Clean and retry
eas build --platform ios --profile production --clear-cache
```

### Credentials not found
```bash
# Reconfigure credentials
eas credentials configure --platform ios --clear
eas credentials configure --platform ios
```

### App crashes on launch
- Check `EXPO_PUBLIC_API_URL` is correct in eas.json
- Verify backend API is accessible
- Check iOS/Android logs: `eas logs --platform ios --status in-progress`

### Version conflicts
```bash
# Auto-increment build number
# (configured in eas.json: "autoIncrement": true)
```

---

## Environment Variables

All public variables must start with `EXPO_PUBLIC_`:
```json
{
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.example.com",
    "EXPO_PUBLIC_SENTRY_DSN": "https://...",
    "EXPO_PUBLIC_FEATURE_FLAGS": "{...}"
  }
}
```

---

## Next Steps

1. ✅ Get EAS credentials set up (credentials configured in EAS dashboard)
2. ⬜ Update `EXPO_PUBLIC_API_URL` to your production backend
3. ⬜ Configure App Store Connect and Google Play Console
4. ⬜ Build first internal test build
5. ⬜ Test on actual devices (TestFlight for iOS, Play Store for Android)
6. ⬜ Submit for App Store review
7. ⬜ Monitor reviews and plan updates

---

## Useful Commands

```bash
# List all builds
eas build:list

# Cancel a build
eas build:cancel <build-id>

# View build logs
eas logs --platform ios --status in-progress

# List available credentials
eas credentials list

# Update app in App Store (submit an update)
eas submit --platform ios --latest
```

---

## Performance Tips

- **Staging build**: Use `preview` profile for testing
- **Production build**: Use `production` profile for App Store submission
- **Development**: Fastest locally with `npm run ios/android`
- **Build time**: ~5-10 minutes per platform on EAS
