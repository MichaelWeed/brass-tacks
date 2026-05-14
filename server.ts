import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory job store for the prototype
const jobs = new Map<string, any>();

// Event bus/streams for SSE
const clients = new Map<string, express.Response>();

function sendEvent(jobId: string, event: string, data: any) {
  const client = clients.get(jobId);
  if (client) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

app.post('/api/generate', async (req, res) => {
  const { vomitProfile, jobDescription, weirdness, vibe } = req.body;
  const jobId = randomUUID();
  
  jobs.set(jobId, { status: 'queued', progress: 0 });
  
  // Start async generation process
  processJob(jobId, vomitProfile, jobDescription, weirdness, vibe).catch(err => {
    console.error(`Job ${jobId} failed:`, err);
    jobs.set(jobId, { status: 'failed', progress: 100, error: err.message });
    sendEvent(jobId, 'error', { error: err.message });
  });

  res.json({ jobId });
});

app.get('/api/generate/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  clients.set(jobId, res);
  
  const currentJob = jobs.get(jobId);
  if (currentJob) {
    res.write(`event: status\ndata: ${JSON.stringify(currentJob)}\n\n`);
    
    // Close early if already done
    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      res.end();
      clients.delete(jobId);
    }
  }

  req.on('close', () => {
    clients.delete(jobId);
  });
});

async function processJob(jobId: string, vomitProfile: string, jobDescription: string, weirdness: number, vibe: string) {
  // 1. CANONIZATION / VECTOR INGEST
  jobs.set(jobId, { status: 'canonizing', progress: 10 });
  sendEvent(jobId, 'status', jobs.get(jobId));
  
  // Minimal canonization step (extract actionable fragments)
  const canonResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      { text: `Extract the most relevant key skills, metrics, experiences, and anecdotes from this "vomit" profile that match this job description:\n\nJob: ${jobDescription}\n\nProfile: ${vomitProfile}` }
    ]
  });
  const canonizedContext = canonResponse.text;

  // 2. NOISE / DRAFTING (Flash-Lite / Flash equivalent)
  jobs.set(jobId, { status: 'drafting', progress: 40 });
  sendEvent(jobId, 'status', jobs.get(jobId));
  
  // Hybrid Noise Logic
  const temperature = 0.2 + (weirdness * 0.8);
  const topP = 0.95 - (weirdness * 0.2);
  const styleInstruction = vibe ? `Adopt a tone that is: ${vibe}.` : "Keep it professional but differentiated.";
  
  const draftResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [
        { text: `You are TailorForge, a differentiated career agent. ${styleInstruction}\n\n` +
                 `Draft a targeted, highly compelling, non-homogenized resume or cover letter draft (format as markdown) based on the context.\n\n` +
                 `Context details extracted: ${canonizedContext}\n\n` +
                 `Job Description: ${jobDescription}`
        }
      ]}
    ],
    config: {
      temperature,
      topP: Math.max(topP, 0),
    }
  });
  const draft = draftResponse.text;

  // 3. DETERMINISTIC / GUARDRAIL VALIDATION
  jobs.set(jobId, { status: 'validating', progress: 70 });
  sendEvent(jobId, 'status', jobs.get(jobId));
  // In a real implementation, this would use spaCy. Here we simulate a slight delay for processing.
  await new Promise(r => setTimeout(r, 1500));
  
  // 4. CRITIQUE (Pro)
  jobs.set(jobId, { status: 'critiquing', progress: 85 });
  sendEvent(jobId, 'status', jobs.get(jobId));
  
  const critiqueResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      { text: `You are the Critique Node. Evaluate this draft against the job description and original requirements. Return a JSON structure evaluating coverage, fidelity, tone, uniqueness score (0-100), and suggested fixes.\n\nDraft:\n${draft}` }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coverageScore: { type: Type.INTEGER },
          fidelityScore: { type: Type.INTEGER },
          uniquenessScore: { type: Type.INTEGER },
          toneCritique: { type: Type.STRING },
          suggestedFixes: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["coverageScore", "fidelityScore", "uniquenessScore", "toneCritique", "suggestedFixes"]
      }
    }
  });

  const critique = JSON.parse(critiqueResponse.text || "{}");

  // 5. COMPLETE
  const result = { status: 'completed', progress: 100, draft, critique };
  jobs.set(jobId, result);
  sendEvent(jobId, 'status', result);
  sendEvent(jobId, 'completed', result);
  
  // End SSE connection
  const client = clients.get(jobId);
  if (client) {
    client.end();
    clients.delete(jobId);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
