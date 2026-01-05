import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { ProposalJobData } from '../../proposals/entities/proposal.entity';

export class GeneralInfoAgent {
  private readonly logger = new Logger(GeneralInfoAgent.name);

  constructor(private openai: OpenAI) {}

  async execute(jobData: ProposalJobData): Promise<{
    'executive-summary': string;
    objectives: string;
    'training-and-support': string;
    'team-structure-min-experiance': string;
    'team-structure-table': Array<{
      Designation: string;
      Count: string;
      'Key Responsibilities': string;
      Experience: string;
    }>;
  }> {
    const startTime = Date.now();
    this.logger.log(`[GENERAL-INFO] Starting agent for proposal: ${jobData.id}`);

    const systemPrompt = `You are a professional proposal writer. Your task is to generate professional content for a business proposal based on the provided information. You must respond with valid JSON only, no markdown or additional text.

Output the following JSON structure:
{
  "executive-summary": "A compelling executive summary paragraph",
  "objectives": "Clear project objectives",
  "training-and-support": "Training and support details",
  "team-structure-min-experiance": "Minimum experience requirements for the team**ONLY NUMBER",
  "team-structure-table": [
    {
      "Designation": "Role title",
      "Count": "Number of people",
      "Key Responsibilities": "Main responsibilities",
      "Experience": "Years of experience required"
    }
  ]
}`;

    const userPrompt = `Generate proposal content based on the following information:

Title: ${jobData.title || 'N/A'}
Client Name: ${jobData.client_name || 'N/A'}
Industry: ${jobData.industry || 'N/A'}
Summary: ${jobData.summary || 'N/A'}
Goals: ${jobData.goals || 'N/A'}
Scope: ${jobData.scope || 'N/A'}
Deliverables: ${jobData.deliverables?.join(', ') || 'N/A'}
Team Members: ${JSON.stringify(jobData.team_members) || 'N/A'}
Start Date: ${jobData.start_date || 'N/A'}
End Date: ${jobData.end_date || 'N/A'}

Please generate the executive summary, objectives, training and support section, and team structure information.`;

    this.logger.debug(`[GENERAL-INFO] System prompt length: ${systemPrompt.length} chars`);
    this.logger.debug(`[GENERAL-INFO] User prompt length: ${userPrompt.length} chars`);
    this.logger.log(`[GENERAL-INFO] Calling OpenAI GPT-4o-mini...`);

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

      this.logger.log(`[GENERAL-INFO] OpenAI response received - ${tokensUsed} tokens used`);
      this.logger.debug(`[GENERAL-INFO] Response content length: ${content.length} chars`);
      this.logger.log(`[GENERAL-INFO] Raw response: ${content}`);

      const parsed = JSON.parse(content);

      this.logger.log(`[GENERAL-INFO] Parsed output keys: ${Object.keys(parsed).join(', ')}`);
      this.logger.log(`[GENERAL-INFO] Team structure rows: ${parsed['team-structure-table']?.length || 0}`);
      this.logger.log(`[GENERAL-INFO] Parsed response: ${JSON.stringify(parsed, null, 2)}`);
      this.logger.log(`[GENERAL-INFO] Agent completed in ${Date.now() - startTime}ms`);

      return parsed;
    } catch (error: any) {
      this.logger.error(`[GENERAL-INFO] FAILED: ${error.message}`);
      this.logger.error(`[GENERAL-INFO] Stack: ${error.stack}`);
      throw error;
    }
  }
}
