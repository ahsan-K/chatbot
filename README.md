# ChatApp

A real-time chat application built with **React Native** and **Expo**, powered by **Firebase** for authentication and messaging.

## Features

- Real-time messaging with Firebase Firestore
- User authentication (login / signup)
- Send images, videos, audio messages, and documents
- Conversations list with live updates
- Dark/light mode support
- Cross-platform — iOS, Android, and Web

## Tech Stack

- **Expo** v56 with Expo Router (file-based routing)
- **React Native** 0.85 + React 19
- **Firebase** v12 (Auth + Firestore)
- **Cloudinary** (media storage)
- **TypeScript**
- **NativeWind / CSS** for styling

## Project Structure

```
src/
├── app/              # Screens (Expo Router)
│   ├── index.tsx     # Entry / home
│   ├── login.tsx
│   ├── signup.tsx
│   ├── setup.tsx
│   ├── conversations.tsx
│   └── chat/[id].tsx # Individual chat screen
├── components/       # Reusable UI components
├── services/         # Firebase auth, messages, storage, users
├── store/            # App state (conversations, app store)
├── hooks/            # Custom hooks
├── config/           # Firebase & Cloudinary config
└── constants/        # Theme tokens
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or physical device with Expo Go

### Installation

```bash
npm install
```

### Run the app

```bash
# Start dev server
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Environment Setup

Configure your Firebase credentials in `src/config/firebase.ts` and Cloudinary settings in `src/config/cloudinary.ts`.

## Build

This project uses EAS Build for production builds.

```bash
eas build --platform android
eas build --platform ios
```
