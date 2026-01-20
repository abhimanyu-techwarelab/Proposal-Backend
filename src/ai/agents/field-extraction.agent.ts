import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { ExtractedFields } from '../../proposals/interfaces/extracted-fields.interface';

export class FieldExtractionAgent {
  private readonly logger = new Logger(FieldExtractionAgent.name);

  constructor(private openai: OpenAI) {}

  async extract(
    documentText: string,
    transcribedAudio?: string,
  ): Promise<ExtractedFields> {
    const startTime = Date.now();
    this.logger.log(`[EXTRACT] Starting field extraction`);

    // Combine all source content
    let combinedContent = '';
    if (documentText) {
      combinedContent += `=== DOCUMENT CONTENT ===\n${documentText}\n\n`;
    }
    if (transcribedAudio) {
      combinedContent += `=== AUDIO TRANSCRIPTION ===\n${transcribedAudio}\n\n`;
    }

    const systemPrompt = `You are a proposal data extraction assistant. Extract structured data from the provided content (documents and/or audio transcriptions) to pre-fill a business proposal form.

EXTRACTION RULES:
1. Extract ONLY information explicitly stated in the content
2. Leave fields as null if not found - do NOT invent or assume data
3. For dates, convert to ISO format (YYYY-MM-DD)
4. For budget, extract numeric value and currency separately
5. For arrays (deliverables, milestones, team members), extract as many as mentioned
6. Be conservative - only extract data you're confident about

OUTPUT FORMAT (JSON):
{
  "title": "string or null - project/proposal title",
  "clientName": "string or null - client company or person name",
  "clientEmail": "string or null - client email address",
  "industry": "string or null - must be one of: Technology, Healthcare, Finance, Education, Manufacturing, Retail, Real Estate, Consulting, Marketing, Legal, Non-Profit, Government, Entertainment, Transportation, Energy, Other",
  "summary": "string or null - project summary/overview",
  "goals": "string or null - project goals/objectives",
  "scope": "string or null - project scope",
  "startDate": "string or null - ISO date YYYY-MM-DD",
  "endDate": "string or null - ISO date YYYY-MM-DD",
  "totalBudget": "number or null - numeric budget value",
  "currency": "string or null - one of: USD, EUR, GBP, CAD, AUD, INR, JPY",
  "billingType": "string or null - one of: fixed, hourly, milestone, retainer",
  "deliverables": ["string array of deliverable items"] or null,
  "milestones": [{"title": "milestone name"}] or null,
  "teamMembers": [{"role": "role name", "experience": "experience level"}] or null,
  "links": ["url strings"] or null,
  "recipients": [{"salutation": "Mr./Ms./Dr.", "name": "full name"}] or null
}

IMPORTANT:
- Output valid JSON only, no markdown code blocks
- Use null for any field where data is not clearly present
- Extract email addresses carefully - validate they look like real emails
- For budget, extract only the number (no currency symbols)`;

    const userPrompt = `Extract proposal form fields from the following content:\n\n${combinedContent}`;

    this.logger.log(`[EXTRACT] Content length: ${combinedContent.length} chars`);
    this.logger.log(`[EXTRACT] Calling OpenAI GPT-4o-mini...`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more deterministic extraction
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;

      this.logger.log(`[EXTRACT] Response received - ${tokensUsed} tokens`);

      const parsed = JSON.parse(content);

      // Clean up null values to undefined for cleaner merging
      const cleaned: ExtractedFields = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== null && value !== undefined) {
          (cleaned as any)[key] = value;
        }
      }

      this.logger.log(
        `[EXTRACT] Extracted ${Object.keys(cleaned).length} fields`,
      );
      this.logger.log(`[EXTRACT] Completed in ${Date.now() - startTime}ms`);

      return cleaned;
    } catch (error: any) {
      this.logger.error(`[EXTRACT] FAILED: ${error.message}`);
      throw error;
    }
  }
}
