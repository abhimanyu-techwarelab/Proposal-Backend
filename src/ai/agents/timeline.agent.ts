import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { ProposalJobData } from '../../proposals/entities/proposal.entity';

export class TimelineAgent {
  private readonly logger = new Logger(TimelineAgent.name);

  constructor(private openai: OpenAI) {}

  async execute(
    jobData: ProposalJobData,
    scopeMainPoints: string,
  ): Promise<{
    'duration-business-days': string;
    'implementation-timeline-table': Array<{
      phase: string;
      scope: string;
      timeline: string;
    }>;
  }> {
    const startTime = Date.now();
    this.logger.log(`[TIMELINE] Starting agent for proposal: ${jobData.id}`);
    this.logger.debug(`[TIMELINE] Scope main points: ${scopeMainPoints?.substring(0, 100)}...`);

    const systemPrompt = `You are a professional project manager and proposal writer. Your task is to generate a realistic implementation timeline based on the provided scope of work. You must respond with valid JSON only, no markdown or additional text.

Output the following JSON structure:
{
  "duration-business-days": "Total number of business days **ONLY NUMBER.",
  "implementation-timeline-table": [
    {
      "phase": "Phase name",
      "scope": "Activities in this phase",
      "timeline": "Duration (e.g., '2 weeks', '10 business days')"
    }
  ]
}`;

    const userPrompt = `Generate an implementation timeline based on the following information:

Title: ${jobData.title || 'N/A'}
Start Date: ${jobData.start_date || 'N/A'}
End Date: ${jobData.end_date || 'N/A'}
Milestones: ${JSON.stringify(jobData.milestones) || 'N/A'}

Scope of Work Main Points:
${scopeMainPoints}

Please generate a realistic implementation timeline with phases, activities, and durations.`;

    this.logger.debug(`[TIMELINE] System prompt length: ${systemPrompt.length} chars`);
    this.logger.debug(`[TIMELINE] User prompt length: ${userPrompt.length} chars`);
    this.logger.log(`[TIMELINE] Calling OpenAI GPT-4o-mini...`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;

      this.logger.log(`[TIMELINE] OpenAI response received - ${tokensUsed} tokens used`);
      this.logger.debug(`[TIMELINE] Response content length: ${content.length} chars`);
      this.logger.log(`[TIMELINE] Raw response: ${content}`);

      const parsed = JSON.parse(content);

      this.logger.log(`[TIMELINE] Parsed output - Duration: ${parsed['duration-business-days']}`);
      this.logger.log(`[TIMELINE] Timeline phases: ${parsed['implementation-timeline-table']?.length || 0}`);
      this.logger.log(`[TIMELINE] Parsed response: ${JSON.stringify(parsed, null, 2)}`);
      this.logger.log(`[TIMELINE] Agent completed in ${Date.now() - startTime}ms`);

      return parsed;
    } catch (error: any) {
      this.logger.error(`[TIMELINE] FAILED: ${error.message}`);
      this.logger.error(`[TIMELINE] Stack: ${error.stack}`);
      throw error;
    }
  }
}
