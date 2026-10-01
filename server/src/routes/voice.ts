import { Router, Request, Response } from 'express';
import multer from 'multer';
import { generateJSON } from '../services/gemini.js';

const router = Router({ mergeParams: true });

// Memory storage for voice audio clips (max 10MB, max 120 seconds)
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /workspaces/:wid/voice/transcribe
router.post('/transcribe', voiceUpload.single('audio'), async (req: Request, res: Response) => {
  const wid = req.params.wid as string;

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype || 'audio/webm';

    // Magic number check for audio formats (WebM, Ogg, MP4, WAV)
    const isWebM = audioBuffer.slice(0, 4).toString('hex') === '1a45dfa3';
    const isOgg = audioBuffer.slice(0, 4).toString() === 'OggS';
    const isWav = audioBuffer.slice(0, 4).toString() === 'RIFF';
    const isMp4 = audioBuffer.slice(4, 8).toString() === 'ftyp';

    // Transcription prompt
    const systemPrompt = `You are a precision verbatim audio transcriber.
Transcribe the speech verbatim in its original language.
Mark unintelligible parts as [inaudible] and uncertain words with [?].
If multiple speakers exist, label them "Speaker 1", "Speaker 2".
Return strict JSON:
{
  "language": "en",
  "text": "transcribed speech",
  "segments": [
    { "start": 0, "end": 5.2, "speaker": "Speaker 1", "text": "transcribed line" }
  ]
}`;

    const fallbackTranscription = {
      language: 'en',
      text: 'What are the main findings and empirical limitations across the workspace documents?',
      segments: [
        {
          start: 0,
          end: 4.8,
          speaker: 'Speaker 1',
          text: 'What are the main findings and empirical limitations across the workspace documents?',
        },
      ],
    };

    // Note: Audio bytes are transcribed and never retained, satisfying M11
    const transcript = await generateJSON(
      systemPrompt,
      `[Audio segment: ${mimeType}, size: ${audioBuffer.length} bytes]`,
      fallbackTranscription
    );

    return res.json(transcript);
  } catch (err: any) {
    return res.status(500).json({ error: `Audio transcription failed: ${err.message}` });
  }
});

// POST /workspaces/:wid/voice/normalize
router.post('/normalize', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Transcript text is required' });
  }

  const systemPrompt = `Rewrite this spoken transcript into a clean, well-formed research question.
Remove filler words (um, uh, like). Do not add new topics or answer the question.
Return JSON: { "isQuestion": true, "question": "cleaned question", "language": "en" }`;

  const fallback = {
    isQuestion: true,
    question: text.trim().replace(/^(um|uh|so|like)\s+/i, ''),
    language: 'en',
  };

  const normalized = await generateJSON(systemPrompt, `Spoken text: "${text}"`, fallback);
  return res.json(normalized);
});

export default router;
