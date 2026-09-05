import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

import {
  buildPlanPrompt,
  buildDebriefPrompt,
  buildProgressPrompt,
} from './prompts/ai.prompts';

import {
  SessionDebrief,
  SessionDebriefSchema,
  SessionPlan,
  SessionPlanSchema,
} from 'src/model/ai.schemas';

interface GeminiClient {
  key: string;
  genAI: GoogleGenerativeAI;
  model: GenerativeModel;
  plainModel: GenerativeModel;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private readonly clients: GeminiClient[] = [];

  private currentKeyIndex = 0;

  /**
   * Keys that recently failed.
   *
   * We temporarily skip these keys instead of immediately
   * trying them again.
   */
  private readonly keyCooldowns = new Map<string, number>();

  /**
   * How long a failed key should be skipped.
   *
   * 60 seconds is useful for rate-limit/quota errors.
   */
  private readonly KEY_COOLDOWN_MS = 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.initializeGeminiClients();
  }

  private initializeGeminiClients(): void {
    const apiKeys = [
      this.configService.get<string>('GEMINI_API_KEY_1'),
      this.configService.get<string>('GEMINI_API_KEY_2'),
      this.configService.get<string>('GEMINI_API_KEY_3'),
      this.configService.get<string>('GEMINI_API_KEY_4'),
    ].filter((key): key is string => Boolean(key?.trim()));

    if (apiKeys.length === 0) {
      this.logger.error(
        'No Gemini API keys configured. Please configure GEMINI_API_KEY_1 through GEMINI_API_KEY_4.',
      );

      return;
    }

    const modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-1.5-pro',
    );

    apiKeys.forEach((key, index) => {
      const genAI = new GoogleGenerativeAI(key);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const plainModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
        },
      });

      this.clients.push({
        key,
        genAI,
        model,
        plainModel,
      });

      this.logger.log(`Gemini API key ${index + 1} initialized successfully.`);
    });

    this.logger.log(
      `Gemini initialized with ${this.clients.length} API key(s). Model: ${modelName}`,
    );
  }

  private getNextAvailableClient(): GeminiClient | null {
    if (this.clients.length === 0) {
      return null;
    }

    const now = Date.now();

    for (let i = 0; i < this.clients.length; i++) {
      const index = (this.currentKeyIndex + i) % this.clients.length;

      const client = this.clients[index];

      const cooldownUntil = this.keyCooldowns.get(client.key);

      if (!cooldownUntil || cooldownUntil <= now) {
        this.currentKeyIndex = (index + 1) % this.clients.length;

        if (cooldownUntil) {
          this.keyCooldowns.delete(client.key);
        }

        return client;
      }
    }

    const client = this.clients[this.currentKeyIndex];

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.clients.length;

    return client;
  }

  private markKeyAsFailed(client: GeminiClient): void {
    const cooldownUntil = Date.now() + this.KEY_COOLDOWN_MS;

    this.keyCooldowns.set(client.key, cooldownUntil);

    const keyIndex = this.clients.indexOf(client) + 1;

    this.logger.warn(
      `Gemini API key ${keyIndex} temporarily disabled for 60 seconds.`,
    );
  }

  private shouldRotateKey(error: unknown): boolean {
    const errorObject = error as {
      status?: number;
      statusCode?: number;
      message?: string;
      response?: {
        status?: number;
      };
    };

    const status =
      errorObject?.status ??
      errorObject?.statusCode ??
      errorObject?.response?.status;

    const message = String(errorObject?.message ?? error ?? '').toLowerCase();

    if (status === 429) {
      return true;
    }

    if (status === 401 || status === 403) {
      return true;
    }

    if (
      message.includes('429') ||
      message.includes('resource exhausted') ||
      message.includes('quota exceeded') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('api key') ||
      message.includes('permission denied') ||
      message.includes('unauthorized')
    ) {
      return true;
    }

    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    if (
      message.includes('internal error') ||
      message.includes('service unavailable') ||
      message.includes('temporarily unavailable')
    ) {
      return true;
    }

    return false;
  }

  private async executeWithFailover<T>(
    operationName: string,
    operation: (client: GeminiClient) => Promise<T>,
  ): Promise<T> {
    if (this.clients.length === 0) {
      throw new ServiceUnavailableException(
        'Gemini AI service is not configured. Please configure GEMINI_API_KEY_1 through GEMINI_API_KEY_4.',
      );
    }

    const attemptedKeys = new Set<string>();

    let lastError: unknown = null;

    for (let attempt = 0; attempt < this.clients.length; attempt++) {
      const client = this.getNextAvailableClient();

      if (!client) {
        break;
      }

      if (attemptedKeys.has(client.key)) {
        continue;
      }

      attemptedKeys.add(client.key);

      const keyIndex = this.clients.indexOf(client) + 1;

      try {
        this.logger.debug(
          `${operationName}: trying Gemini API key ${keyIndex}.`,
        );

        const result = await operation(client);

        this.logger.debug(
          `${operationName}: Gemini API key ${keyIndex} succeeded.`,
        );

        return result;
      } catch (error: unknown) {
        lastError = error;

        const rotateKey = this.shouldRotateKey(error);

        if (rotateKey) {
          this.markKeyAsFailed(client);

          this.logger.warn(
            `${operationName}: Gemini API key ${keyIndex} failed. Trying another key.`,
          );

          continue;
        }

        this.logger.error(
          `${operationName}: Gemini request failed with a non-retryable error.`,
          error instanceof Error ? error.stack : String(error),
        );

        throw error;
      }
    }

    this.logger.error(
      `${operationName}: all configured Gemini API keys failed.`,
      lastError instanceof Error ? lastError.stack : String(lastError),
    );

    throw new ServiceUnavailableException(
      'AI service is temporarily unavailable. All configured Gemini API keys are currently unavailable. Please try again later.',
    );
  }

  async generateSessionPlan(context: {
    student: {
      name: string;
      subject: string;
      currentLevel: string;
      learningGoals: string[];
      weakAreas: string[];
    };
    topic: string;
    pastSessions: Array<{
      topic: string;
      notes: string;
      aiDebrief?: any;
      scheduledAt: Date;
    }>;
  }): Promise<SessionPlan> {
    try {
      const prompt = buildPlanPrompt(context);

      return await this.executeWithFailover(
        'generateSessionPlan',
        async (client) => {
          const result = await client.model.generateContent(prompt);

          const response = result.response;

          const text = response.text();

          if (!text) {
            throw new Error(
              'Gemini returned an empty response for session plan.',
            );
          }

          const parsed = JSON.parse(text);

          return SessionPlanSchema.parse(parsed);
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to generate session plan:',
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  async generateDebrief(context: {
    student: {
      name: string;
      subject: string;
      currentLevel: string;
      learningGoals: string[];
      weakAreas: string[];
    };
    topic: string;
    notes: string;
    pastSessions: Array<{
      topic: string;
      aiDebrief?: any;
      scheduledAt: Date;
    }>;
  }): Promise<SessionDebrief> {
    try {
      const prompt = buildDebriefPrompt(context);

      return await this.executeWithFailover(
        'generateDebrief',
        async (client) => {
          const result = await client.model.generateContent(prompt);

          const response = result.response;

          const text = response.text();

          if (!text) {
            throw new Error(
              'Gemini returned an empty response for session debrief.',
            );
          }

          const parsed = JSON.parse(text);

          return SessionDebriefSchema.parse(parsed);
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to generate debrief:',
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  async generateProgressSummary(context: {
    student: {
      name: string;
      subject: string;
      currentLevel: string;
      learningGoals: string[];
      weakAreas: string[];
    };
    pastDebriefs: Array<{
      summary: string;
      homework: string[];
      nextFocus: string;
      topic: string;
      scheduledAt: Date;
    }>;
  }): Promise<string> {
    try {
      if (context.pastDebriefs.length === 0) {
        return 'Not enough completed session history is available to generate a meaningful progress summary yet.';
      }

      const prompt = buildProgressPrompt(context);

      return await this.executeWithFailover(
        'generateProgressSummary',
        async (client) => {
          const result = await client.plainModel.generateContent(prompt);

          const response = result.response;

          const text = response.text();

          return text.trim() || 'No summary generated.';
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to generate progress summary:',
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }
}
