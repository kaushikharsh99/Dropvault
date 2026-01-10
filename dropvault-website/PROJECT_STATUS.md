# DropVault Project Status

## ✅ Working Features
1.  **Google Authentication** (Firebase Auth)
    - Users can sign in/out.
    - User data is protected.
2.  **Universal Drop Zone (Notes & Links)**
    - You can type notes.
    - You can paste links.
    - These save to **Firestore Database** (Free Tier).

## ⚠️ Optional Feature: File Storage
- **Status:** Not Configured yet.
- **Impact:** You cannot upload Images, PDFs, or Videos.
- **Fix:** If the Firebase Console asks for payment, you can skip this!
    - The app works 100% for text and links without it.
    - If you want to enable it later, select `us-central1` (Iowa) region for the free tier.

## 🚀 How to Run
```bash
cd knowledge-tree
npm run dev
```
