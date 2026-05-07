export class TokenizerService {
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
}

export const tokenizerService = new TokenizerService();
