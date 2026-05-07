export interface InputContent {
  text: string;
  file?: {
    data: string;
    mimeType: string;
    name: string;
  };
}

export interface ScreeningResult {
  cvIndex: number;
  score: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  matchPercentage: number;
}
