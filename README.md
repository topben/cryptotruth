# CryptoTruth

AI-powered due diligence platform for analyzing cryptocurrency Key Opinion Leaders (KOLs) and Twitter influencers.

## Features

- **Trust Score Analysis** - AI-driven reputation scoring (0-100) based on track record
- **Track Record Verification** - Identify successful predictions vs. failed calls
- **Controversy Detection** - Surface rug pulls, scams, and paid promotions
- **Evidence Sources** - Provides links to sources backing up claims
- **Event Timeline** - Visual timeline of significant events
- **Multi-language Support** - English and Traditional Chinese (zh-TW)
- **Caching** - 24-hour caching for performance optimization
- **Rate Limiting** - Built-in protection (10 requests/hour per IP)

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **AI**: Google Gemini 2.0 Flash with web search capabilities
- **Backend**: Vercel Serverless Functions
- **Caching**: Vercel Blob Storage
- **i18n**: Built-in language support (English, Traditional Chinese)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cryptotruth.git
   cd cryptotruth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your API key:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Gemini API key.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key |
| `BLOB_READ_WRITE_TOKEN` | For production | Vercel Blob storage token (auto-configured on Vercel) |

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add your `GEMINI_API_KEY` as an environment variable
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/cryptotruth)

### Manual Build

```bash
npm run build
npm run preview
```

## Project Structure

```
cryptotruth/
├── api/
│   └── analyze.ts        # Serverless API endpoint
├── components/
│   ├── HistoryTimeline.tsx
│   ├── SearchInput.tsx
│   └── TrustMeter.tsx
├── services/
│   └── geminiService.ts
├── public/
├── App.tsx
├── index.tsx
├── types.ts
└── vite.config.ts
```

## API Rate Limits

- **10 requests per hour** per IP address
- Results are cached for **24 hours**
- Rate limit resets every hour

## Disclaimer

This tool provides AI-generated analysis based on publicly available information. It should not be considered financial advice. Always do your own research before making investment decisions. The accuracy of the analysis depends on the AI model and available web data.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Powered by [Google Gemini](https://ai.google.dev/)
- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Deployed on [Vercel](https://vercel.com/)
