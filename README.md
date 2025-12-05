<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1wIk5V1xvIVxi9zQWSrkXOoS8JDEhrars

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Set your `GEMINI_API_KEY` in `.env.local` (get it from [AI Studio](https://aistudio.google.com/app/apikey))
   - Configure Firebase credentials (see [API_KEYS_INSTRUCTIONS.md](API_KEYS_INSTRUCTIONS.md) for details)

3. Run the app:
   ```bash
   npm run dev
   ```

## Firebase Setup

This app uses Firebase for Authentication, Firestore Database, Storage, and Cloud Functions. To enable full functionality:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password), Firestore, and Storage
3. Copy your Firebase config values to `.env.local`

See [API_KEYS_INSTRUCTIONS.md](API_KEYS_INSTRUCTIONS.md) for detailed setup instructions.
