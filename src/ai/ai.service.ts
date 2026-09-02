import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  buildPlanPrompt,
  buildDebriefPrompt,
  buildProgressPrompt,
} from './prompts/ai.prompts';
import { SessionDebrief, SessionDebriefSchema, SessionPlan, SessionPlanSchema } from 'src/model/ai.schemas';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy');
    this.model = this.genAI.getGenerativeModel({
      model: this.configService.get('GEMINI_MODEL', 'gemini-1.5-pro'),
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      return SessionPlanSchema.parse(parsed);
    } catch (error) {
      this.logger.error('Failed to generate session plan:', error);
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.'
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      return SessionDebriefSchema.parse(parsed);
    } catch (error) {
      this.logger.error('Failed to generate debrief:', error);
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.'
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
      // For plain text, use a different generation config
      const plainModel = this.genAI.getGenerativeModel({
        model: this.configService.get('GEMINI_MODEL', 'gemini-1.5-pro'),
        generationConfig: {
          temperature: 0.7,
        },
      });
      const result = await plainModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return text.trim() || 'No summary generated.';
    } catch (error) {
      this.logger.error('Failed to generate progress summary:', error);
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.'
      );
    }
  }
}