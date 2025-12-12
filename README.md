<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CryptoTruth - AI-Powered KOL Verification

AI-powered background checks for Crypto Twitter. We scrape history to find the wins, the rug pulls, and the truth.

View your app in AI Studio: https://ai.studio/apps/drive/1tbXHPbb5LHL5RCmlmKeyJPGeLAlnOntl

## 🔒 Security Notice

**IMPORTANT**: This application now uses a secure backend architecture to protect API keys. The Gemini API key is **never** exposed to the browser. See [SECURITY.md](SECURITY.md) for details.

## Architecture

```
Frontend (Vite + React) → Backend (Express API) → Gemini API
```

- **Frontend**: Client-side React application (port 3000)
- **Backend**: Express.js API server (port 3001)
- **Security**: API keys stored server-side only, rate limiting, CORS protection

## Run Locally

**Prerequisites:** Node.js 18+

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run install:server
```

### 2. Configure Environment Variables

**Backend Configuration** (create `.env` in root):
```bash
cp .env.example .env
```
Edit `.env` and add your Gemini API key:
```
CRYPTOTRUTH_GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Frontend Configuration** (create `.env.local`):
```bash
cp .env.local.example .env.local
```
Content should be:
```
VITE_API_URL=http://localhost:3001
```

⚠️ **NEVER commit `.env` or `.env.local` files!**

### 3. Run the Application

You need to run both frontend and backend:

**Terminal 1 - Backend**:
```bash
npm run server:dev
```

**Terminal 2 - Frontend**:
```bash
npm run dev
```

The application will be available at: http://localhost:3000

## Available Scripts

- `npm run dev` - Run frontend development server
- `npm run server:dev` - Run backend development server with auto-reload
- `npm run server` - Run backend production server
- `npm run install:server` - Install backend dependencies
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## Security Features

- ✅ API keys stored server-side only
- ✅ Rate limiting (10 req/min per IP)
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Secure error handling
- ✅ Environment variable separation

See [SECURITY.md](SECURITY.md) for complete security documentation.

## Project Structure

```
cryptotruth/
├── server/                 # Backend API server
│   ├── index.js           # Express server & routes
│   ├── services/          # Backend services
│   │   └── geminiService.js
│   └── package.json       # Backend dependencies
├── services/              # Frontend API client
│   ├── geminiService.ts   # API client
│   └── cacheService.ts    # Client-side caching
├── components/            # React components
├── App.tsx                # Main application
└── vite.config.ts         # Vite configuration

## Deployment

For production deployment, ensure:
1. Set `FRONTEND_URL` to your production domain
2. Use HTTPS for all connections
3. Configure proper firewall rules
4. Set up monitoring and logging
5. Implement API key rotation policy

See [SECURITY.md](SECURITY.md) for complete deployment recommendations.
