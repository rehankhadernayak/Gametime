# SideQuest Mobile (React Native / Expo)

## 1) Install dependencies

From project root:

```bash
cd /Users/28rehank/Documents/SideQuest
npm install
```

## 2) Start backend

```bash
npm run dev -w backend
```

## 3) Start mobile app

```bash
npm run start -w mobile
```

Press `i` in Expo terminal to open iOS simulator.

## 4) Configure API URL in app

Open `Account` tab in app and set API Base URL:

- iOS simulator with local backend: `http://localhost:4000`
- Physical iPhone on same Wi-Fi: `http://YOUR_MAC_LOCAL_IP:4000`

Example local IP command (macOS):

```bash
ipconfig getifaddr en0
```

## Notes

- Parent and child dashboards are separate tabs after login.
- Child task evidence upload supports camera/photo/video and is mandatory.
- Push token appears in Account tab when permissions are granted on a physical device.
- App uses secure token storage via `expo-secure-store`.
