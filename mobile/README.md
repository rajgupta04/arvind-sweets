# Arvind Sweets Mobile (Expo)

React Native mobile app bootstrapped with **Expo (managed workflow)** using **JavaScript**.

## Setup

### 1) Install deps

From `Arvind sweets/mobile`:

- `npm install`

### 2) Configure environment variables

Edit `Arvind sweets/mobile/.env`:

- `EXPO_PUBLIC_API_BASE_URL=https://api.arvindsweets.com/api`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...`
- (Optional) `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` for Google sign-in

Notes:
- Expo exposes only `EXPO_PUBLIC_*` variables to the JS bundle.
- Native Google Maps keys are injected via `app.config.js`.

### 3) Run the app

- `npm start`
- `npm run android`

## Features (wired to existing backend)

- Auth (JWT):
  - `POST /auth/login`
  - `POST /auth/google`
  - `GET /auth/profile`
- Orders:
  - `GET /orders/my`
  - `GET /orders/:id`
- Live tracking:
  - `GET /orders/:id/tracking`
  - `POST /tracking/update`

## Folder structure

- `src/context/AuthContext.js` — auth state + token persistence (AsyncStorage)
- `src/services/api.js` — Axios instance + JWT interceptor
- `src/services/*.js` — backend API wrappers (auth/orders/tracking)
- `src/navigation/*` — React Navigation stacks
- `src/screens/*` — app screens

## iOS note (Google Maps)

`react-native-maps` uses Apple Maps on iOS by default.
If you want Google Maps on iOS, you’ll typically need:

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set
- a **development build** / EAS build (not plain Expo Go)

