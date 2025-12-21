# Contributing to CryptoTruth

Thank you for your interest in contributing! This document provides guidelines for contributing.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

- Check existing issues to avoid duplicates
- Include a clear title and description
- Provide steps to reproduce
- Include screenshots if applicable

### Pull Requests

1. Fork the repository and create your branch from `main`
2. Run `npm install` to install dependencies
3. Make your changes following the code style
4. Test locally with `npm run dev`
5. Ensure the build passes: `npm run build`
6. Submit a pull request with a clear description

## Development Setup

```bash
git clone https://github.com/your-username/cryptotruth.git
cd cryptotruth
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local
npm run dev
```

## Code Style

- Use TypeScript for all code
- Use functional React components with hooks
- Use Tailwind CSS for styling
- Write clear commit messages

## Project Structure

```
api/           # Serverless API endpoints
components/    # React components
services/      # API services
public/        # Static assets
```

Thank you for contributing!
