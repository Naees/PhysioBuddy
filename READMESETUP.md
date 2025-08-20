# PhysioBuddy Setup Guide

Set this up for the very first time working on the project. The setup is broken down into 3 sections: React Native, Flask, and PostgreSQL DB.

## React Native (Expo Go)

### 1. Install Expo Go
Download the Expo Go application from App Store or Google Play Store.

### 2. Setup React Native App
Navigate to the `PhysioBuddy/Physiobuddy/` directory:

```bash
npm install
```

Create a `.env` file with your ngrok HTTPS URL:
```env
EXPO_PUBLIC_API_URL=https://your-domain.ngrok-free.app
```

### 3. Run the Application
Choose one of the following options:

**For Emulators:**
```bash
npm run android
npm run ios
npm run web
```

**For Expo Go Mobile App:**
```bash
npx expo start
```

## Flask Backend
No action required (containerized with Docker).

## PostgreSQL Database & Docker Setup

### 1. Environment Configuration
Create a `.env` file in the root directory:

```env
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database_name
NGROK_URL=your-domain.ngrok-free.app
NGROK_AUTHTOKEN=your_ngrok_auth_token
```

### 2. Start Services
```bash
docker compose build
docker compose up
```

This will start:
- PostgreSQL database
- Flask backend
- ngrok HTTPS tunnel

## Testing
Navigate to the "Testing" tab in your React Native app to verify database connectivity through HTTPS.