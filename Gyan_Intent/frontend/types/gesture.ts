export interface GestureState {
  isDrawing: boolean;
  isMoving: boolean;
  isErasing: boolean;
  isPinching: boolean;
  isOpenPalm: boolean;
  cursorPosition: { x: number; y: number };
  gestureType: GestureType;
  confidence: number;
}

export type GestureType =
  | "drawing"
  | "moving"
  | "erasing"
  | "pinch"
  | "open_palm"
  | "thumbs_up"
  | "thumbs_down"
  | "none";

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureConfig {
  drawThreshold: number;
  eraseThreshold: number;
  pinchThreshold: number;
  smoothingFactor: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  drawThreshold: 0.08,
  eraseThreshold: 0.08,
  pinchThreshold: 0.05,
  smoothingFactor: 0.7,
};
