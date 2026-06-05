# ChatApp — Setup Guide

## Environment Variables

`.env` file project root mein banao aur yeh values fill karo:

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

    // User profiles
    // get  = single document read (getUserProfile)
    // list = collection query (getAllUsers / search in Explore)
    match /users/{uid} {
      allow get, list: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Usernames — uniqueness check ke liye
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.uid == request.auth.uid;
    }

    // Contacts — sirf apne contacts par full access
    match /contacts/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // Sender apna entry receiver ke contacts mein update/create kar sake
    // (last message preview + unread count ke liye)
    match /contacts/{receiverId}/list/{senderId} {
      allow update, create: if request.auth != null
                    && (request.auth.uid == senderId || request.auth.uid == receiverId);
    }

    // Friend Requests
    // get  = single doc read (non-existent bhi) — requestId se check karo
    //        resource null ho sakta hai (doc exist nahi karta), isliye requestId use karo
    // list = collection query (onSnapshot) — sirf existing docs, resource.data safe hai
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

    // Typing indicators — sirf conversation participants dekh sakein
    match /typing/{convId}/users/{uid} {
      allow read: if request.auth != null
                  && convId.split('_').hasAny([request.auth.uid]);
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Messages — sirf conversation participants padh/likh sakein
    match /messages/{convId}/msgs/{msgId} {
      allow read: if request.auth != null
                  && convId.split('_').hasAny([request.auth.uid]);
      allow create: if request.auth != null
                    && convId.split('_').hasAny([request.auth.uid])
                    && request.resource.data.senderId == request.auth.uid;
      // update = read receipts (readAt field)
      allow update: if request.auth != null
                    && convId.split('_').hasAny([request.auth.uid]);
    }
  }
}
```

#### Firestore Indexes
Koi custom index nahi chahiye — sab queries automatically kaam karti hain.

---

### 3. Firebase Storage
Firebase Storage requires **Blaze (pay-as-you-go) plan**.

**Agar Cloudinary use kar rahe ho** (free alternative) → Storage skip karo.

**Agar Storage enable kiya hai:**
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

Firebase Storage ki jagah Cloudinary use kar sakte hain (free tier).

### 1. Account banao
> [cloudinary.com](https://cloudinary.com) → Sign up free

### 2. Cloud name note karo
> Dashboard → top-left mein cloud name dikh raha hoga (e.g. `dqypvawr6`)

### 3. Unsigned Upload Preset banao
> Settings → Upload → Upload presets → **Add upload preset**
> - **Preset name:** `chatapp_media` (ya koi bhi naam)
> - **Signing mode:** `Unsigned` ← zaroori hai
> - Save

### 4. Config update karo
`.env` mein:
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

**iOS (Apple Developer Account chahiye — $99/year):**
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
  └── createdAt: timestamp

usernames/{username}
  └── uid: string

contacts/{myUid}/list/{otherUid}
  ├── uid: string
  ├── name: string
  ├── username: string
  ├── color: string
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
  └── timestamp: timestamp

friendRequests/{fromUid_toUid}
  ├── from: string (sender uid)
  ├── to: string (receiver uid)
  ├── fromName: string
  ├── fromUsername: string
  ├── fromColor: string
  ├── status: 'pending' | 'accepted'
  └── createdAt: timestamp
```

> **Note:** Conversation ID = `[uid1, uid2].sort().join('_')` — alphabetically sorted so both users use same document path.

---

## App Permissions

### iOS (automatically added via app.json)
- Camera — photos/videos lene ke liye
- Photo Library — gallery se share karne ke liye
- Microphone — audio recording ke liye

### Android (automatically added via app.json)
- CAMERA
- READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO
- READ/WRITE_EXTERNAL_STORAGE
- RECORD_AUDIO
- INTERNET
