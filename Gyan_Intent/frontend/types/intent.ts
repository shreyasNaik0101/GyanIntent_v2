export type IntentModality = "visual" | "voice" | "gesture" | "text" | "mixed";

export type IntentCategory =
  | "math"
  | "coding"
  | "visual"
  | "general"
  | "video_request";

export interface IntentInput {
  modality: IntentModality;
  content: string;
  imageData?: string;
  gestureData?: GestureData;
  language: string;
  timestamp: number;
}

export interface GestureData {
  gestureType: string;
  points: Array<{ x: number; y: number }>;
  canvasSnapshot?: string;
}

export interface IntentResult {
  id: string;
  category: IntentCategory;
  explanation: string;
  videoUrl?: string;
  subtitlesUrl?: string;
  duration?: number;
  confidence: number;
  processingTime: number;
}

export interface VideoGenerationRequest {
  concept: string;
  explanation: string;
  language: string;
  visualStyle?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  subtitlesUrl: string;
  duration: number;
  thumbnailUrl?: string;
}
