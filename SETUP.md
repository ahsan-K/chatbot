# ChatApp — Setup Guide

## Environment Variables

Create a `.env` file in the project root and fill in the values:

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
```

> **Firebase values** → Firebase Console → Project Settings → Your apps → Web app config
> **Cloudinary values** → cloudinary.com/console → Cloud name + Settings → Upload → Upload Presets

---

## Firebase Setup

### 1. Authentication
Firebase Console → **Build → Authentication → Sign-in method**
- ✅ **Email/Password** → Enable → Save

### 2. Firestore Database
Firebase Console → **Build → Firestore Database → Create database → Production mode**

#### Firestore Rules
Firebase Console → Firestore → **Rules** tab → paste → **Publish**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow get, list: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.uid == request.auth.uid;
    }

    match /contacts/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    match /contacts/{receiverId}/list/{senderId} {
      allow update, create: if request.auth != null
                    && (request.auth.uid == senderId || request.auth.uid == receiverId);
    }

    match /friendRequests/{requestId} {
      allow get: if request.auth != null
                 && (requestId.split('_')[0] == request.auth.uid
                     || requestId.split('_')[1] == request.auth.uid);
      allow list: if request.auth != null
                  && (resource.data.from == request.auth.uid
                      || resource.data.to == request.auth.uid);
      allow create: if request.auth != null
                    && request.resource.data.from == request.auth.uid;
      allow update, delete: if request.auth != null
                    && (resource.data.from == request.auth.uid
                        || resource.data.to == request.auth.uid);
    }

    match /typing/{convId}/users/{uid} {
      allow read: if request.auth != null
                  && convId.split('_').hasAny([request.auth.uid]);
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /messages/{convId}/msgs/{msgId} {
      allow read: if request.auth != null
                  && convId.split('_').hasAny([request.auth.uid]);
      allow create: if request.auth != null
                    && convId.split('_').hasAny([request.auth.uid])
                    && request.resource.data.senderId == request.auth.uid;
      allow update: if request.auth != null
                    && convId.split('_').hasAny([request.auth.uid]);
    }

    match /calls/{callId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.callerId == request.auth.uid;
      allow update, delete: if request.auth != null
                        && (resource.data.callerId == request.auth.uid
                            || resource.data.receiverId == request.auth.uid);
    }

    match /calls/{callId}/callerCandidates/{candidateId} {
      allow read, write: if request.auth != null;
    }

    match /calls/{callId}/receiverCandidates/{candidateId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Firestore Indexes
No custom indexes needed — all queries work automatically.

---

### 3. Push Notifications (FCM) Setup

Push notifications (call alerts + messages) require native Firebase configuration files.

#### Android — google-services.json
1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your apps"** → **Add app** → Android
3. Package name: `com.chatapp.app`
4. **Download `google-services.json`**
5. Place the file in the project root: `chatbot/google-services.json`

#### iOS — GoogleService-Info.plist
1. Firebase Console → **Project Settings** → **Your apps** → **Add app** → iOS
2. Bundle ID: `com.chatapp.app`
3. **Download `GoogleService-Info.plist`**
4. Place the file in the project root: `chatbot/GoogleService-Info.plist`

> **Note:** These files contain Firebase credentials. Keep the repository private or add them to `.gitignore` for public repos.

---

### 4. Firebase Storage
Firebase Storage requires the **Blaze (pay-as-you-go) plan**.

**If using Cloudinary** (free alternative) → skip Storage.

**If enabling Storage:**
Firebase Console → **Build → Storage → Get started → Production mode**

#### Storage Rules
Firebase Console → Storage → **Rules** tab → paste → **Publish**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 50 * 1024 * 1024; // 50MB limit
    }
  }
}
```

---

## Cloudinary Setup (Free Media Hosting)

Use Cloudinary instead of Firebase Storage (free tier available).

### 1. Create an account
> [cloudinary.com](https://cloudinary.com) → Sign up free

### 2. Note your cloud name
> Dashboard → cloud name shown in the top-left (e.g. `dqypvawr6`)

### 3. Create an Unsigned Upload Preset
> Settings → Upload → Upload presets → **Add upload preset**
> - **Preset name:** `chatapp_media` (or any name)
> - **Signing mode:** `Unsigned` ← required
> - Save

### 4. Update config
In `.env`:
```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dqypvawr6
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=chatapp_media
```

---

## Build Setup

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### Build Commands

**Android APK (testing):**
```bash
eas build --platform android --profile preview
```

**iOS (requires Apple Developer Account — $99/year):**
```bash
eas build --platform ios --profile preview
```

**Production:**
```bash
eas build --platform all --profile production
```

### Build Profiles (eas.json)

| Profile | Use Case | Android | iOS |
|---|---|---|---|
| `development` | Local dev with dev client | APK | Simulator |
| `preview` | Internal testing | APK | Device (Ad Hoc) |
| `production` | App Store / Play Store | AAB | IPA |

---

## Firestore Data Structure

```
users/{uid}
  ├── uid: string
  ├── name: string
  ├── username: string (unique, lowercase)
  ├── email: string
  ├── color: string (hex)
  ├── photoURL: string (optional)
  ├── expoPushToken: string (set automatically on app open)
  ├── online: boolean
  ├── lastSeen: timestamp
  └── createdAt: timestamp

usernames/{username}
  └── uid: string

contacts/{myUid}/list/{otherUid}
  ├── uid: string
  ├── name: string
  ├── username: string
  ├── color: string
  ├── photoURL: string (optional)
  ├── lastMessage: string
  ├── lastMessageAt: timestamp
  ├── lastSenderId: string
  ├── unreadCount: number
  └── addedAt: timestamp

messages/{uid1_uid2}/msgs/{msgId}
  ├── text: string (optional)
  ├── mediaUrl: string (optional)
  ├── mediaType: 'image' | 'video' | 'audio' | 'document' (optional)
  ├── mediaName: string (optional)
  ├── mediaMime: string (optional)
  ├── senderId: string
  ├── readAt: timestamp (optional — set when recipient reads)
  └── timestamp: timestamp

friendRequests/{fromUid_toUid}
  ├── from: string (sender uid)
  ├── to: string (receiver uid)
  ├── fromName: string
  ├── fromUsername: string
  ├── fromColor: string
  ├── status: 'pending' | 'accepted'
  └── createdAt: timestamp

calls/{callId}
  ├── callerId: string
  ├── callerName: string
  ├── callerColor: string
  ├── callerPhotoURL: string (optional)
  ├── receiverId: string
  ├── status: 'ringing' | 'active' | 'ended' | 'rejected'
  ├── offer: object (WebRTC SDP)
  ├── answer: object (WebRTC SDP)
  └── createdAt: string
```

> **Note:** Conversation ID = `[uid1, uid2].sort().join('_')` — alphabetically sorted so both users share the same document path.

---

## App Permissions

### iOS (configured via app.json)
- Camera — for photos/videos
- Photo Library — for sharing from gallery
- Microphone — for audio recording and calls

### Android (configured via app.json)
- CAMERA
- READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO
- READ/WRITE_EXTERNAL_STORAGE
- RECORD_AUDIO
- INTERNET
- POST_NOTIFICATIONS (Android 13+)
