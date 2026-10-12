const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT || process.env.BUILD_VERSION || 'local-build';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use('/api/chat', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Juda ko‘p so‘rov yuborildi. 15 daqiqadan keyin qayta urinib ko‘ring.' }
}));

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});
app.get('/api/version', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ version: BUILD_VERSION });
});
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Serverda GEMINI_API_KEY sozlanmagan. Sayt egasi hosting sozlamalarini tekshirishi kerak.' });
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'free';
  if (!prompt) return res.status(400).json({ error: 'Savol bo‘sh bo‘lmasligi kerak.' });
  if (prompt.length > 6000) return res.status(413).json({ error: 'Savol juda uzun. 6000 belgidan qisqaroq yozing.' });

  const modeInstructions = {
    explain: 'Explain English grammar clearly for an English learner. Give simple examples and explain in Uzbek when useful.',
    translate: 'Translate accurately. Explain important nuances in Uzbek when useful.',
    correct: 'Correct the user’s English sentence, show a natural version, and explain the errors kindly in Uzbek.',
    quiz: 'Create a useful English practice quiz. Include answers separately at the end.',
    ielts: 'Act as a supportive IELTS tutor. Give realistic IELTS guidance and explain in Uzbek when useful.',
    free: 'Be a helpful, accurate English-learning assistant. Respond in the language that best fits the user’s request.'
  };
  const systemInstruction = 'You are BEKPO’LAT IELTS AI Teacher, a safe and encouraging English tutor. ' + (modeInstructions[mode] || modeInstructions.free) + ' Do not claim a score is official. Keep explanations structured and age-appropriate.';

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1800 }
      }),
      signal: AbortSignal.timeout(55000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || 'Gemini API so‘rovni bajara olmadi.';
      const status = response.status === 429 ? 429 : (response.status === 401 || response.status === 403 ? 502 : 502);
      return res.status(status).json({ error: `Gemini API xatosi (${response.status}): ${message}` });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!text) return res.status(502).json({ error: 'Gemini bo‘sh javob qaytardi. Qayta urinib ko‘ring.' });
    res.set('Cache-Control', 'no-store');
    return res.json({ text });
  } catch (error) {
    const msg = error?.name === 'TimeoutError' ? 'Gemini javobi kechikdi. Qayta urinib ko‘ring.' : 'Gemini serveriga ulanib bo‘lmadi. Hosting loglarini tekshiring.';
    return res.status(502).json({ error: msg });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: 0 }));
app.get(/.*/, (_req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.listen(PORT, () => console.log(`BEKPO'LAT IELTS server running on port ${PORT}; model=${MODEL}; build=${BUILD_VERSION}`));
