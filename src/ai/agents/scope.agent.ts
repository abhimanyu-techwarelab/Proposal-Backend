import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { ProposalJobData } from '../../proposals/entities/proposal.entity';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

export class ScopeAgent {
  private readonly logger = new Logger(ScopeAgent.name);

  constructor(
    private openai: OpenAI,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {}

  async execute(
    jobData: ProposalJobData,
    fileStoreName: string | null,
  ): Promise<{
    'scope-of-work-introduction': string;
    'scope-of-work-summary': string;
    'scope-of-work': string;
    'scope-of-work-main-points': string;
  }> {
    const startTime = Date.now();
    this.logger.log(`[SCOPE] Starting agent for proposal: ${jobData.proposal_id}`);
    this.logger.log(`[SCOPE] File store available: ${fileStoreName ? 'YES' : 'NO'}`);

    let kbContext = '';

    if (fileStoreName) {
      const queries = [
        'What are the main requirements and deliverables mentioned in the documents?',
        'What technical specifications or implementation details are discussed?',
        'What are the key milestones and phases of the project?',
      ];

      this.logger.log(`[SCOPE] Querying knowledge base with ${queries.length} queries...`);

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const queryStartTime = Date.now();

        try {
          this.logger.debug(`[SCOPE] KB Query ${i + 1}/${queries.length}: ${query.substring(0, 50)}...`);
          const result = await this.knowledgeBaseService.queryFileStore(fileStoreName, query);
          kbContext += `\n\nKB Query: ${query}\nResponse: ${result}`;
          this.logger.log(`[SCOPE] KB Query ${i + 1} completed in ${Date.now() - queryStartTime}ms - ${result.length} chars`);
        } catch (error: any) {
          this.logger.warn(`[SCOPE] KB Query ${i + 1} FAILED: ${error.message}`);
        }
      }

      this.logger.log(`[SCOPE] Knowledge base context gathered - ${kbContext.length} chars total`);
    } else {
      this.logger.log(`[SCOPE] Skipping KB queries - no file store`);
    }

    const systemPrompt = `You are a professional proposal writer specializing in scope of work documentation. Your task is to generate a comprehensive scope of work section based on the provided information. You must respond with valid JSON only, no markdown or additional text.

Output the following JSON structure:
{
  "scope-of-work-introduction": "An introduction paragraph for the scope of work",
  "scope-of-work-summary": "A summary of the scope of work",
  "scope-of-work": "Detailed scope of work in markdown format with headers and bullet points",
  "scope-of-work-main-points": "Key main points of the scope, comma-separated"
}`;

    const userPrompt = `Generate a comprehensive scope of work based on the following information:

Title: ${jobData.title || 'N/A'}
Client Name: ${jobData.client_name || 'N/A'}
Industry: ${jobData.industry || 'N/A'}
Summary: ${jobData.summary || 'N/A'}
Goals: ${jobData.goals || 'N/A'}
Scope: ${jobData.scope || 'N/A'}
Deliverables: ${jobData.deliverables?.join(', ') || 'N/A'}
Milestones: ${JSON.stringify(jobData.milestones) || 'N/A'}
Start Date: ${jobData.start_date || 'N/A'}
End Date: ${jobData.end_date || 'N/A'}

${kbContext ? `Additional context from knowledge base:${kbContext}` : ''}

Please generate a detailed scope of work section.`;

    this.logger.debug(`[SCOPE] System prompt length: ${systemPrompt.length} chars`);
    this.logger.debug(`[SCOPE] User prompt length: ${userPrompt.length} chars`);
    this.logger.log(`[SCOPE] Calling OpenAI GPT-4o-mini...`);

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

      this.logger.log(`[SCOPE] OpenAI response received - ${tokensUsed} tokens used`);
      this.logger.debug(`[SCOPE] Response content length: ${content.length} chars`);

      const parsed = JSON.parse(content);

      this.logger.log(`[SCOPE] Parsed output keys: ${Object.keys(parsed).join(', ')}`);
      this.logger.debug(`[SCOPE] Main points: ${parsed['scope-of-work-main-points']?.substring(0, 100)}...`);
      this.logger.log(`[SCOPE] Agent completed in ${Date.now() - startTime}ms`);

      return parsed;
    } catch (error: any) {
      this.logger.error(`[SCOPE] FAILED: ${error.message}`);
      this.logger.error(`[SCOPE] Stack: ${error.stack}`);
      throw error;
    }
  }
}
