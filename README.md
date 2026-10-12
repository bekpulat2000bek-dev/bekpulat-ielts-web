# BEKPO'LAT IELTS — web deployment bundle

## What this includes
- `public/index.html`: existing app + cinematic intro, updated to call a same-origin backend. No Gemini API key is embedded in the browser app.
- `server.js`: Express backend with `/api/chat`, `/api/health`, `/api/version`, request size checks, and per-IP rate limiting.
- `render.yaml`: Render Blueprint starter configuration.

## Deploy to Render
1. Create a new GitHub repository and upload the files/folders in this project (the contents of this folder, not the zip itself).
2. In Render, create a **Web Service** connected to that GitHub repository. Runtime: Node. Build command: `npm install`; Start command: `npm start`.
3. In Render → your service → **Environment**, add `GEMINI_API_KEY` with your secret Gemini API key. Do not put it in `public/index.html`, GitHub, or messages.
4. Set `GEMINI_MODEL` to `gemini-3.8-flash` (current default used by this project).
5. Deploy. Open the Render URL, open AI Teacher, and press **TEST AI**.

## Updates
Connect Render to GitHub with auto-deploy enabled. Whenever you commit/push changes to the connected branch, Render rebuilds and deploys the site. Existing open tabs poll `/api/version` every 60 seconds and reload when a new deployment is detected. A visitor may need to wait up to about one minute for an open tab to reload.

## Security and cost
- The API key stays in Render environment variables and is sent only by the server to Google Gemini.
- `/api/chat` has a simple per-IP rate limit and prompt size limit. Since this is a public app, review usage and billing limits in Google AI Studio and Render. Rate limits reduce abuse but are not a guarantee against all misuse.
- Free hosting may sleep or have limits. A public AI app may generate API usage costs.
- User profile data is still stored locally in each visitor's browser; this bundle does not add shared accounts or cloud profile sync.

## Local test (optional)
Requires Node.js 20+:
```bash
npm install
# Set GEMINI_API_KEY in your local environment, then:
npm start
```
Open `http://localhost:3000`.
