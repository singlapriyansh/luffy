# Luffy AI · Gear 5 Experience

A full-stack, production-ready AI chatbot inspired by Monkey D. Luffy's **Gear 5** transformation, featuring a full-screen one-time YouTube background video, glassmorphic ChatGPT-style interface, real-time OpenAI streaming, local conversation persistence, and secure server-side API handling.

## Features

- **One-Time YouTube Background (`nhr0igKYIMQ`)**: Uses the official YouTube IFrame Player API to autoplay muted in full-screen cover mode, plays **once** without looping, stops on completion, includes a sound toggle, and falls back gracefully to a Gear 5 animated backdrop on error.
- **ChatGPT-Style Interface**: Collapsible conversation sidebar, New Chat, `localStorage` persistence, Markdown & code block rendering with copy buttons, regenerate response, clear conversation, and functional text/code file attachments.
- **Secure Backend (`/api/chat`)**: Server-side Next.js Route Handler with input validation, streaming SSE responses, and safe error handling—`OPENAI_API_KEY` is never exposed to the browser.

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Groq or OpenAI API key to `.env.local` (or `.env`):
   ```env
   GROQ_API_KEY=gsk_your-real-key-here
   # or OPENAI_API_KEY=sk-your-real-key-here
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy on Vercel

1. Push this project to a GitHub repository (never commit `.env` or `.env.local`—both are in `.gitignore`).
2. Go to [Vercel](https://vercel.com/) and click **Add New → Project**, then import your GitHub repository.
3. Under **Environment Variables**, add `GROQ_API_KEY` (or `OPENAI_API_KEY`) with your API key.
4. Click **Deploy**.
