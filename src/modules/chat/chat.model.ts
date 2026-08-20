export interface ChatRequest {
  message: string;
  model: string;
  think?: boolean;
}

export interface ChatResponse {
  message: string;
}
