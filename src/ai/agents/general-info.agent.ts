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

    const systemPrompt = `You are a professional proposal writer. Your task is to generate a business proposal based ONLY on the provided context.

OUTPUT RULES:
- Respond with valid JSON only.
- Do not wrap response in markdown code blocks.
- Strictly escape all double quotes within string values using a backslash (e.g., \") to ensure valid JSON parsing.
- Content fields should use markdown formatting (headers, bullets, bold) for rich display.

QUALITY GUIDELINES:
- Avoid fluff phrases (e.g., "cutting-edge", "world-class", "comprehensive solution").
- Use specific, concrete language referencing the client's industry and goals.
- Use quantifiable metrics (e.g., "5+ years" instead of "highly experienced").
- If information is missing, provide a professional estimate based on project scope.

JSON SCHEMA:
{
  "executive-summary": "string (2-3 paragraphs with markdown, summarizing project value)",
  "objectives": "string (markdown bulleted list)",
  "training-and-support": "string (markdown formatted training plan)",
  "team-structure-min-experiance": "string (number only, e.g. '3')",
  "team-structure-table": [
    {
      "Designation": "string",
      "Count": "string (e.g. '2')",
      "Key Responsibilities": "string",
      "Experience": "string (e.g. '5+ years')"
    }
  ]
}

EXAMPLE:
Input: {title: "E-Commerce Platform Modernization", client_name: "RetailMax Inc", industry: "Retail", goals: "Reduce page load times by 50%, increase mobile conversion", deliverables: ["React storefront", "Node.js API", "Stripe integration"], team_members: [{"role": "Tech Lead"}, {"role": "Frontend Developer"}]}

Output:
{
  "executive-summary": "This proposal outlines our approach to modernizing **RetailMax Inc's** e-commerce platform, targeting a **50% reduction in page load times** and improved mobile conversion rates. We will deliver a React-based storefront backed by a Node.js API layer with Stripe payment integration.\n\nOur team brings deep experience in retail e-commerce transformations, having delivered similar projects that achieved 40%+ improvements in conversion rates. The proposed architecture follows industry best practices for headless commerce, ensuring RetailMax can scale efficiently during peak shopping seasons.",
  "objectives": "- Reduce average page load time to under 2 seconds (50% improvement from current baseline)\n- Implement mobile-first responsive design targeting 25%+ increase in mobile conversions\n- Integrate Stripe payment gateway supporting credit cards, Apple Pay, and Google Pay\n- Deploy real-time analytics dashboard for sales and user behavior monitoring\n- Establish CI/CD pipeline for rapid, safe deployments",
  "training-and-support": "## Knowledge Transfer Program\n\nOur engagement includes structured knowledge transfer:\n\n- **Developer Training (8 hours):** Hands-on sessions covering React component patterns and API integration\n- **Admin Training (4 hours):** Dashboard walkthrough for the operations team\n- **Documentation:** Complete technical docs including API specs, deployment runbooks, and troubleshooting guides\n\n## Post-Launch Support\n\n- 30-day support period with 4-hour response time for critical issues\n- Access to client portal for ticket submission and knowledge base",
  "team-structure-min-experiance": "3",
  "team-structure-table": [
    {"Designation": "Technical Lead", "Count": "1", "Key Responsibilities": "Architecture design, code reviews, client communication, sprint planning", "Experience": "7+ years"},
    {"Designation": "Senior Frontend Developer", "Count": "2", "Key Responsibilities": "React component development, performance optimization, unit testing", "Experience": "5+ years"},
    {"Designation": "Backend Developer", "Count": "1", "Key Responsibilities": "Node.js API development, Stripe integration, database design", "Experience": "4+ years"},
    {"Designation": "QA Engineer", "Count": "1", "Key Responsibilities": "Test automation, cross-browser testing, performance benchmarking", "Experience": "3+ years"}
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
