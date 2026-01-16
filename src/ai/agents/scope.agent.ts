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
    namespace: string | null,
  ): Promise<{
    'scope-of-work-introduction': string;
    'scope-of-work-summary': string;
    'scope-of-work': string;
    'scope-of-work-main-points': string;
  }> {
    const startTime = Date.now();
    this.logger.log(`[SCOPE] Starting agent for proposal: ${jobData.id}`);
    this.logger.log(`[SCOPE] Knowledge base namespace: ${namespace ? namespace : 'NONE'}`);

    let kbContext = '';

    if (namespace) {
      // Step 1: Use AI to generate dynamic queries based on proposal context
      this.logger.log(`[SCOPE] Generating AI-powered dynamic queries based on proposal content...`);
      const queries = await this.generateDynamicQueries(jobData);

      this.logger.log(`[SCOPE] Generated ${queries.length} dynamic queries`);
      queries.forEach((q, i) => this.logger.log(`[SCOPE]   Query ${i + 1}: "${q}"`));

      this.logger.log(`[SCOPE] Querying knowledge base...`);

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const queryStartTime = Date.now();

        try {
          this.logger.log(`[SCOPE] KB Query ${i + 1}/${queries.length}: "${query}"`);
          const result = await this.knowledgeBaseService.queryKnowledgeBase(namespace, query, 5);
          kbContext += `\n\nKB Query: ${query}\nResponse: ${result}`;
          this.logger.log(`[SCOPE] KB Query ${i + 1} completed in ${Date.now() - queryStartTime}ms - ${result.length} chars`);
        } catch (error: any) {
          this.logger.warn(`[SCOPE] KB Query ${i + 1} FAILED: ${error.message}`);
        }
      }

      this.logger.log(`[SCOPE] Knowledge base context gathered - ${kbContext.length} chars total`);
    } else {
      this.logger.log(`[SCOPE] Skipping KB queries - no namespace`);
    }

    const systemPrompt = `You are a professional proposal writer specializing in scope of work documentation. Your task is to generate a comprehensive scope of work section based ONLY on the provided context.

OUTPUT RULES:
- Respond with valid JSON only.
- Do not wrap response in markdown code blocks.
- Strictly escape all double quotes within string values using a backslash (e.g., \") to ensure valid JSON parsing.
- Content fields should use markdown formatting (headers, bullets, bold) for rich display.

QUALITY GUIDELINES:
- Avoid fluff phrases (e.g., "cutting-edge", "robust", "seamless integration").
- Be specific about what will and won't be included in scope.
- Reference actual deliverables, technologies, and client requirements.
- Use the knowledge base context to inform technical details when available.
- If information is missing, provide a professional estimate based on project scope.

JSON SCHEMA:
{
  "scope-of-work-introduction": "string (1-2 paragraphs introducing the engagement)",
  "scope-of-work-summary": "string (brief markdown summary of key deliverables)",
  "scope-of-work": "string (detailed markdown with ## headers, bullets, and specifics)",
  "scope-of-work-main-points": "string (comma-separated key points for timeline agent)"
}

EXAMPLE:
Input: {title: "E-Commerce Platform Modernization", client_name: "RetailMax Inc", industry: "Retail", scope: "Frontend rebuild, API development, payment integration", deliverables: ["React storefront", "Node.js API", "Stripe integration", "Admin dashboard"]}

Output:
{
  "scope-of-work-introduction": "This engagement covers the end-to-end modernization of **RetailMax Inc's** e-commerce platform, replacing the legacy monolithic architecture with a modern headless commerce solution. Our team will deliver a production-ready platform that addresses current performance bottlenecks while establishing a foundation for future growth.",
  "scope-of-work-summary": "**Key Deliverables:** React-based storefront, Node.js API layer, Stripe payment integration, and admin dashboard.\n\n**Approach:** Phased delivery with milestone-based releases ensuring continuous validation.",
  "scope-of-work": "## Frontend Development\n\n- **React Storefront:** Server-side rendered React application with Next.js\n- **Product Catalog:** Category navigation, search with filters, product detail pages\n- **Shopping Cart:** Persistent cart, quantity management, saved items\n- **Checkout Flow:** Multi-step checkout with address validation and order confirmation\n- **Responsive Design:** Mobile-first approach supporting iOS, Android, and desktop browsers\n\n## Backend API Development\n\n- **Node.js API Layer:** RESTful API built with Express.js/NestJS\n- **Product Service:** Inventory management, pricing, product variants\n- **Order Service:** Order processing, status tracking, email notifications\n- **User Service:** Authentication, profile management, order history\n\n## Payment Integration\n\n- **Stripe Integration:** Credit/debit cards, Apple Pay, Google Pay\n- **Payment Security:** PCI-compliant implementation, tokenization\n- **Refund Handling:** Partial and full refund processing\n\n## Admin Dashboard\n\n- **Order Management:** View, filter, and process orders\n- **Inventory Updates:** Stock level management and alerts\n- **Sales Analytics:** Revenue reports, conversion metrics\n\n## Out of Scope\n\n- Legacy data migration (separate engagement)\n- Mobile native apps (iOS/Android)\n- Third-party marketplace integrations",
  "scope-of-work-main-points": "React storefront development, Node.js API layer, Stripe payment integration, Admin dashboard, Responsive design implementation, User authentication system"
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
      this.logger.log(`[SCOPE] Raw response: ${content}`);

      const parsed = JSON.parse(content);

      this.logger.log(`[SCOPE] Parsed output keys: ${Object.keys(parsed).join(', ')}`);
      this.logger.debug(`[SCOPE] Main points: ${parsed['scope-of-work-main-points']?.substring(0, 100)}...`);
      this.logger.log(`[SCOPE] Parsed response: ${JSON.stringify(parsed, null, 2)}`);
      this.logger.log(`[SCOPE] Agent completed in ${Date.now() - startTime}ms`);

      return parsed;
    } catch (error: any) {
      this.logger.error(`[SCOPE] FAILED: ${error.message}`);
      this.logger.error(`[SCOPE] Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Generate dynamic queries using AI based on proposal content
   */
  private async generateDynamicQueries(jobData: ProposalJobData): Promise<string[]> {
    const queryGenStartTime = Date.now();

    const systemPrompt = `You are a search query generator. Based on the proposal context provided, generate 3-5 specific search queries that would help retrieve relevant information from uploaded documents (PDFs, DOCXs, transcriptions) to write a comprehensive scope of work.

The queries should focus on extracting:
1. Project requirements and specifications
2. Technical details and implementation approach
3. Deliverables and milestones
4. Any industry-specific or client-specific requirements

Output ONLY a JSON array of query strings. No explanation, just the JSON array.
Example: ["query 1", "query 2", "query 3"]`;

    const userPrompt = `Generate search queries for this proposal:

Title: ${jobData.title || 'N/A'}
Client: ${jobData.client_name || 'N/A'}
Industry: ${jobData.industry || 'N/A'}
Summary: ${jobData.summary || 'N/A'}
Goals: ${jobData.goals || 'N/A'}
Scope: ${jobData.scope || 'N/A'}
Deliverables: ${jobData.deliverables?.join(', ') || 'N/A'}`;

    try {
      this.logger.log(`[SCOPE] Calling OpenAI to generate dynamic queries...`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const tokensUsed = response.usage?.total_tokens || 0;

      this.logger.log(`[SCOPE] Query generation completed - ${tokensUsed} tokens used`);
      this.logger.log(`[SCOPE] Raw query response: ${content}`);

      // Parse the JSON array
      const queries = JSON.parse(content);

      if (Array.isArray(queries) && queries.length > 0) {
        this.logger.log(`[SCOPE] Successfully generated ${queries.length} dynamic queries in ${Date.now() - queryGenStartTime}ms`);
        return queries;
      }

      // Fallback if parsing fails
      this.logger.warn(`[SCOPE] Invalid query response, using fallback queries`);
      return this.getFallbackQueries(jobData);
    } catch (error: any) {
      this.logger.error(`[SCOPE] Failed to generate dynamic queries: ${error.message}`);
      this.logger.log(`[SCOPE] Using fallback queries`);
      return this.getFallbackQueries(jobData);
    }
  }

  /**
   * Fallback queries if AI generation fails - still context-aware
   */
  private getFallbackQueries(jobData: ProposalJobData): string[] {
    const queries: string[] = [];

    // Base queries
    queries.push('What are the main project requirements and deliverables?');
    queries.push('What technical specifications or implementation details are mentioned?');

    // Context-aware queries based on available data
    if (jobData.industry) {
      queries.push(`What ${jobData.industry} industry-specific requirements are mentioned?`);
    }

    if (jobData.title) {
      queries.push(`What are the key objectives for ${jobData.title}?`);
    }

    if (jobData.goals) {
      queries.push(`What approach is recommended to achieve: ${jobData.goals.substring(0, 100)}?`);
    }

    // Ensure we have at least 3 queries
    if (queries.length < 3) {
      queries.push('What are the project milestones and timeline expectations?');
    }

    this.logger.log(`[SCOPE] Generated ${queries.length} fallback queries`);
    return queries.slice(0, 5); // Max 5 queries
  }
}
