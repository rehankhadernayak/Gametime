# Gametime Mobile

React Native app (Expo, SDK 54) with parent + child flows wired to the existing Gametime backend.

## Features implemented

- Parent auth:
  - Login
  - Signup with OTP verification
- Child auth:
  - Email/password login
  - 4-digit PIN login (for younger-child profiles as enforced by backend)
- Parent tabs:
  - Home overview (children/tasks/rewards/alerts stats)
  - Child account creation/list
  - Task creation/list/delete
  - Approval queue with approve/reject + notes + AI recommendation display
  - Rewards create/list/delete
  - Points adjustment + transactions
  - Notifications list + mark read
  - Account (logout, API URL, health test)
- Child tabs:
  - Welcome + points
  - Task completion with mandatory photo/video evidence upload
  - Dispute flow for rejected tasks
  - Rewards list + redeem
  - Notifications list + mark read
  - Account (logout, API URL, health test)

## Prerequisites

- Backend running from root workspace.
- Root `.env` CORS origin for Expo web:

```env
FRONTEND_ORIGIN=http://localhost:8081
```

## Run (web first)

Terminal 1 (backend):

```bash
cd /Users/28rehank/Documents/Gametime
npm run dev -w backend
```

Terminal 2 (mobile):

```bash
cd /Users/28rehank/Documents/Gametime/mobile
npm install
npm run web
```

Open the Expo web URL (usually `http://localhost:8081`).

## Run on iPhone (Expo Go)

```bash
cd /Users/28rehank/Documents/Gametime/mobile
npm run start
```

Scan QR from Expo Go.

In app `Account` or `Connection Settings`:
- Browser on same Mac: `http://localhost:4000`
- iPhone on same Wi-Fi: `http://YOUR_MAC_IP:4000`

Get local IP:

```bash
ipconfig getifaddr en0
```
