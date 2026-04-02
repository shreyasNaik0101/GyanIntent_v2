/**
 * MessageRouter
 * Routes messages to appropriate handlers based on content
 */

import { MessageData, RouteDecision, Intent, HandlerType } from '../types';
import { logger } from '../utils/logger';

// Keyword patterns for intent detection
const VIDEO_KEYWORDS = [
  'video', 'generate', 'banao', 'bana do', 'video banao', 'animation',
  // Hindi
  'वीडियो', 'विडियो', 'वीडियो बनाओ', 'वीडियो दिखाओ',
  // Kannada
  'ವೀಡಿಯೊ', 'ವಿಡಿಯೋ', 'ವೀಡಿಯೊ ಮಾಡಿ', 'ವೀಡಿಯೊ ತೋರಿಸಿ',
];
const EXPLAIN_KEYWORDS = ['explain', 'samjhao', 'kya hai', 'what is', 'how does', 'kaise', 'meaning'];
const MATH_KEYWORDS = ['solve', 'calculate', 'equation', 'integral', 'derivative', 'x=', 'x +', '=0', 'math', 'ganit'];
const QUESTION_KEYWORDS = ['?', 'why', 'when', 'where', 'which', 'kyu', 'kab', 'kahan', 'kaun', 'konsa'];


export class MessageRouter {
  async route(messageData: MessageData): Promise<RouteDecision> {
    const text = messageData.body.toLowerCase().trim();

    // Check for commands first
    if (this.isCommand(text)) {
      return {
        handler: HandlerType.COMMAND,
        intent: Intent.COMMAND,
        confidence: 1.0,
        parameters: { command: text.replace('!', '').trim() },
      };
    }

    // Detect intent
    const intent = this.detectIntent(text);
    let confidence = 0.7;
    const parameters: Record<string, any> = {};

    // Extract topic for video generation
    if (intent === Intent.VIDEO_GENERATION) {
      confidence = 0.9;
      parameters.topic = this.extractVideoTopic(text);
      // Keep topic empty if user only typed a trigger like "video".
      // MessageHandler will resolve from conversation context.
      if (!parameters.topic) {
        parameters.topic = '';
      }
    }

    if (intent === Intent.MATH_PROBLEM) confidence = 0.85;
    if (intent === Intent.CONCEPT_EXPLANATION) confidence = 0.8;

    const handler = intent === Intent.COMMAND
      ? HandlerType.COMMAND
      : HandlerType.CONTENT_GENERATOR;

    const decision: RouteDecision = { handler, intent, confidence, parameters };

    logger.debug('Route decision', { decision, originalText: text });
    return decision;
  }

  detectIntent(text: string): Intent {
    const lower = text.toLowerCase();

    // Priority order: command > video > math > explain > question > general
    if (this.isCommand(lower)) return Intent.COMMAND;
    if (this.shouldGenerateVideo(lower)) return Intent.VIDEO_GENERATION;
    if (this.isMathProblem(lower)) return Intent.MATH_PROBLEM;
    if (this.shouldExplainConcept(lower)) return Intent.CONCEPT_EXPLANATION;
    if (this.shouldAnswerQuestion(lower)) return Intent.QUESTION_ANSWER;

    return Intent.GENERAL_QUERY;
  }

  shouldGenerateVideo(text: string): boolean {
    return VIDEO_KEYWORDS.some((kw) => text.includes(kw));
  }

  private extractVideoTopic(text: string): string {
    let cleaned = text.toLowerCase();

    for (const keyword of [...VIDEO_KEYWORDS].sort((a, b) => b.length - a.length)) {
      cleaned = cleaned.replace(new RegExp(this.escapeRegExp(keyword), 'gi'), ' ');
    }

    cleaned = cleaned
      .replace(/\b(ke baare mein|about|on|pe|par|ka|ki|ke|for|please|pls)\b/gi, ' ')
      .replace(/[^a-z0-9\u0900-\u097F\u0C80-\u0CFF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  shouldAnswerQuestion(text: string): boolean {
    return QUESTION_KEYWORDS.some((kw) => text.includes(kw));
  }

  isCommand(text: string): boolean {
    return text.startsWith('!');
  }

  private isMathProblem(text: string): boolean {
    // Check keywords
    if (MATH_KEYWORDS.some((kw) => text.includes(kw))) return true;
    // Check for mathematical expressions (numbers + operators)
    if (/\d+\s*[+\-*/^=]\s*\d+/.test(text)) return true;
    return false;
  }

  private shouldExplainConcept(text: string): boolean {
    return EXPLAIN_KEYWORDS.some((kw) => text.includes(kw));
  }
}
