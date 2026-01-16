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

    const systemPrompt = `You are a professional project manager and proposal writer. Your task is to generate a realistic implementation timeline based ONLY on the provided context.

OUTPUT RULES:
- Respond with valid JSON only.
- Do not wrap response in markdown code blocks.
- Strictly escape all double quotes within string values using a backslash (e.g., \") to ensure valid JSON parsing.

QUALITY GUIDELINES:
- Create realistic phase durations based on scope complexity.
- Phases should be sequential and logically ordered.
- Account for dependencies between phases (e.g., design before development).
- Ensure "duration-business-days" represents the total elapsed time, accounting for any overlapping phases.
- If start/end dates are provided, calculate and provide specific date ranges for each phase.
- If dates are missing, use relative durations (e.g., "2 weeks").

JSON SCHEMA:
{
  "duration-business-days": "string (number only, e.g. '45')",
  "implementation-timeline-table": [
    {
      "phase": "string (phase name)",
      "scope": "string (key activities in this phase)",
      "timeline": "string (date range if dates provided, e.g., 'Mar 1 - Mar 15', otherwise duration like '2 weeks')"
    }
  ]
}

EXAMPLE:
Input: {title: "E-Commerce Platform Modernization", start_date: "2024-03-01", end_date: "2024-05-15", scopeMainPoints: "React storefront development, Node.js API layer, Stripe payment integration, Admin dashboard"}

Output:
{
  "duration-business-days": "55",
  "implementation-timeline-table": [
    {"phase": "Discovery & Planning", "scope": "Requirements finalization, architecture design, environment setup", "timeline": "Mar 1 - Mar 8"},
    {"phase": "Backend API Development", "scope": "Node.js API layer, database schema, user authentication", "timeline": "Mar 11 - Mar 29"},
    {"phase": "Frontend Development", "scope": "React storefront, responsive design, product catalog, shopping cart", "timeline": "Mar 18 - Apr 12"},
    {"phase": "Payment Integration", "scope": "Stripe integration, checkout flow, payment security", "timeline": "Apr 8 - Apr 19"},
    {"phase": "Admin Dashboard", "scope": "Order management, inventory updates, sales analytics", "timeline": "Apr 15 - Apr 26"},
    {"phase": "Testing & QA", "scope": "Integration testing, UAT, performance testing, bug fixes", "timeline": "Apr 29 - May 10"},
    {"phase": "Deployment & Handover", "scope": "Production deployment, documentation, training", "timeline": "May 13 - May 15"}
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
