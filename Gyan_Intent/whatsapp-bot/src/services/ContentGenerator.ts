/**
 * ContentGenerator
 * Interfaces with FastAPI backend LangGraph agents and OpenAI to generate educational content
 */

import axios, { AxiosInstance } from 'axios';
import path from 'path';
import fs from 'fs';
import { UserSession, VideoResult, IntentProcessResponse, VideoStatusResponse } from '../types';
import { logger } from '../utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 180; // 15 min max wait for Manim renders

// Prebuilt video files served from frontend/public/videos/
const BUILTIN_VIDEOS: Record<string, { file: string; label: string }> = {
  'pythagorean theorem': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'pythagorean': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'pythagoras theorem': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'pythagoras': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'pythagorus theorem': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'pythagorus': { file: 'pythagorean.mp4', label: 'Pythagorean Theorem' },
  'binary search': { file: 'binary-search.mp4', label: 'Binary Search' },
  'what is binary search': { file: 'binary-search.mp4', label: 'Binary Search' },
  'binary search algorithm': { file: 'binary-search.mp4', label: 'Binary Search' },
  'dfs': { file: 'dfs.mp4', label: 'Depth First Search' },
  'depth first search': { file: 'dfs.mp4', label: 'Depth First Search' },
  'what is dfs': { file: 'dfs.mp4', label: 'Depth First Search' },
  'dfs algorithm': { file: 'dfs.mp4', label: 'Depth First Search' },
  'ಸ್ಟಾಕ್': { file: 'stack-kannada.mp4', label: 'Stack Data Structure (Kannada)' },
  'ಸ್ಟಾಕ್ ಡೇಟಾ ಸ್ಟ್ರಕ್ಚರ್': { file: 'stack-kannada.mp4', label: 'Stack Data Structure (Kannada)' },
  'stack in kannada': { file: 'stack-kannada.mp4', label: 'Stack Data Structure (Kannada)' },
  'dijkstra': { file: 'dijkstra.mp4', label: 'Dijkstra Algorithm' },
  'dijkstra algorithm': { file: 'dijkstra.mp4', label: 'Dijkstra Algorithm' },
  'what is dijkstra': { file: 'dijkstra.mp4', label: 'Dijkstra Algorithm' },
  'shortest path': { file: 'dijkstra.mp4', label: 'Dijkstra Algorithm' },
  'photosynthesis': { file: 'photosynthesis.mp4', label: 'Photosynthesis' },
  'newton': { file: 'newton.mp4', label: "Newton's Laws" },
  "newton's laws": { file: 'newton.mp4', label: "Newton's Laws" },
  'laws of motion': { file: 'newton.mp4', label: "Newton's Laws" },
  'dna': { file: 'dna.mp4', label: 'DNA Replication' },
  'dna replication': { file: 'dna.mp4', label: 'DNA Replication' },
  'chemical bonding': { file: 'bonding.mp4', label: 'Chemical Bonding' },
  'bonding': { file: 'bonding.mp4', label: 'Chemical Bonding' },
  'calculus': { file: 'calculus.mp4', label: 'Calculus Basics' },
  'calculus basics': { file: 'calculus.mp4', label: 'Calculus Basics' },
};

// Resolve path to frontend/public/videos relative to whatsapp-bot dir
const VIDEOS_DIR = process.env.VIDEOS_DIR
  || path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', 'videos');

export class ContentGenerator {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BACKEND_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_API_KEY ? { 'X-API-Key': INTERNAL_API_KEY } : {}),
      },
    });
  }

  private normalizeTopic(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\u0C80-\u0CFF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  findBuiltinVideo(topic: string): { filePath: string; label: string } | null {
    const normalized = this.normalizeTopic(topic);
    for (const [key, value] of Object.entries(BUILTIN_VIDEOS)) {
      if (
        normalized === key
        || normalized.startsWith(`${key} `)
        || normalized.endsWith(` ${key}`)
        || normalized.includes(` ${key} `)
      ) {
        const filePath = path.join(VIDEOS_DIR, value.file);
        if (fs.existsSync(filePath)) {
          return { filePath, label: value.label };
        }
        logger.warn('Builtin video file not found on disk', { key, filePath });
      }
    }
    return null;
  }

  async generateVideo(topic: string, context: UserSession): Promise<VideoResult> {
    try {
      // Check for prebuilt video first — instant response
      const builtin = this.findBuiltinVideo(topic);
      if (builtin) {
        logger.info('Serving builtin video', { topic, file: builtin.filePath });
        return {
          success: true,
          videoUrl: builtin.filePath, // local path — MediaHandler.sendLocalVideo will handle it
          topic: builtin.label,
        };
      }

      logger.info('Requesting video generation', { topic, userId: context.userId });

      const response = await this.api.post('/api/v1/video/generate', {
        concept: topic,
        language: context.language || 'english',
        visual_style: 'diagram-heavy',
        user_id: context.userId,
      });

      const jobId = response.data.job_id;
      if (!jobId) {
        return {
          success: false,
          errorMessage: 'No job ID returned from video generation',
        };
      }

      // Poll for completion
      const result = await this.pollVideoStatus(jobId);
      return result;
    } catch (error: any) {
      logger.error('Video generation failed', { error: error.message, topic });
      return {
        success: false,
        errorMessage: error.message || 'Video generation failed',
      };
    }
  }

  async pollVideoStatus(jobId: string): Promise<VideoResult> {
    let consecutiveConnectionErrors = 0;

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      try {
        const response = await this.api.get<VideoStatusResponse>(
          `/api/v1/video/status/${jobId}`
        );
        consecutiveConnectionErrors = 0;
        const status = response.data;

        if (status.status === 'completed') {
          return {
            success: true,
            videoUrl: status.video_url,
            topic: jobId,
          };
        }

        if (status.status === 'failed') {
          return {
            success: false,
            errorMessage: status.error_message || status.error || 'Video generation failed',
          };
        }

        // Still processing, continue polling
        logger.debug('Video still processing', { jobId, attempt: i + 1 });
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;

          // In-memory jobs are lost on backend restart. Stop polling and notify user fast.
          if (statusCode === 404) {
            return {
              success: false,
              errorMessage: 'Video job was lost after a backend restart. Please send the same topic again.',
            };
          }

          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            consecutiveConnectionErrors += 1;
            if (consecutiveConnectionErrors >= 3) {
              return {
                success: false,
                errorMessage: 'Backend is temporarily unavailable while checking video status. Please try again in a minute.',
              };
            }
          }
        }

        logger.warn('Error polling video status', { jobId, error });
      }
    }

    return {
      success: false,
      errorMessage: 'Video generation timed out',
    };
  }

  async generateVideosFromPDF(
    pdfBuffer: Buffer,
    context: UserSession
  ): Promise<{
    paperTitle: string;
    topics: Array<{ index: number; title: string; description?: string; job_id: string; status?: string; video_url?: string }>;
    allCached: boolean;
  }> {
    let pdfText = '';
    let pages = 0;

    try {
      const runtimeRequire = eval('require');
      const pdfParseModule: any = runtimeRequire('pdf-parse');
      const callableParser = pdfParseModule?.default;

      if (typeof callableParser === 'function') {
        const pdfData = await callableParser(pdfBuffer);
        pdfText = pdfData.text || '';
        pages = Number(pdfData.numpages || 0);
      } else if (typeof pdfParseModule?.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data: pdfBuffer });
        const pdfData = await parser.getText();
        pdfText = pdfData.text || '';
        pages = Number(pdfData.total || 0);
        await parser.destroy();
      } else {
        throw new Error('Unsupported pdf-parse module shape');
      }
    } catch (error: any) {
      throw new Error(`PDF parsing failed: ${error?.message || 'Unknown parser error'}`);
    }

    logger.info('PDF parsed', { pages, textLength: pdfText.length });

    const response = await this.api.post('/api/v1/video/generate-from-pdf', {
      pdf_text: pdfText,
      language: context.language || 'english',
      num_topics: 7,
      user_id: context.userId,
    });

    return {
      paperTitle: response.data.paper_title,
      topics: response.data.topics,
      allCached: response.data.all_cached || false,
    };
  }

  async explainConcept(query: string, context: UserSession): Promise<string> {
    try {
      logger.info('Requesting concept explanation', { query, userId: context.userId });

      const response = await this.api.post<IntentProcessResponse>('/api/v1/intent/analyze', {
        query,
        modality: 'text',
        language: context.language || 'hinglish',
        user_id: context.userId,
      });

      return response.data.explanation || 'Concept explanation generate nahi ho paya. Please try again!';
    } catch (error: any) {
      logger.error('Concept explanation failed', { error: error.message, query });
      return this.generateFallbackResponse(query);
    }
  }

  async answerQuestion(question: string, context: UserSession): Promise<string> {
    try {
      logger.info('Answering question', { question, userId: context.userId });

      const response = await this.api.post<IntentProcessResponse>('/api/v1/intent/analyze', {
        query: question,
        modality: 'text',
        language: context.language || 'hinglish',
        user_id: context.userId,
      });

      return response.data.explanation || 'Jawab generate nahi ho paya. Please try again!';
    } catch (error: any) {
      logger.error('Question answering failed', { error: error.message, question });
      return this.generateFallbackResponse(question);
    }
  }

  async solveMathProblem(problem: string, context: UserSession): Promise<string> {
    try {
      logger.info('Solving math problem', { problem, userId: context.userId });

      const response = await this.api.post<IntentProcessResponse>('/api/v1/intent/analyze', {
        query: `Solve this math problem step by step: ${problem}`,
        modality: 'text',
        language: context.language || 'hinglish',
        user_id: context.userId,
      });

      return response.data.explanation || 'Math problem solve nahi ho paya. Please try again!';
    } catch (error: any) {
      logger.error('Math problem solving failed', { error: error.message, problem });
      return this.generateFallbackResponse(problem);
    }
  }

  async solveImage(imageBase64: string, caption: string, context: UserSession): Promise<string> {
    try {
      logger.info('Solving image', { userId: context.userId, hasCaption: !!caption, imgLen: imageBase64.length });

      const response = await this.api.post<IntentProcessResponse>('/api/v1/intent/analyze', {
        query: caption || 'Analyze and solve this',
        modality: 'visual',
        image: imageBase64,
        language: context.language || 'english',
        user_id: context.userId,
      }, {
        timeout: 60000,
      });

      return response.data.explanation || 'Image analyze nahi ho paya. Please try again!';
    } catch (error: any) {
      logger.error('Image solving failed', { error: error.message });
      return this.generateFallbackResponse(caption || 'image analysis');
    }
  }

  private generateFallbackResponse(query: string): string {
    return `📝 Aapne pucha: "${query}"\n\nAbhi backend se connect nahi ho pa raha. Please thodi der baad try karo.\n\n🎬 Video chahiye? "video ${query}" likh ke bhejo!`;
  }
}
