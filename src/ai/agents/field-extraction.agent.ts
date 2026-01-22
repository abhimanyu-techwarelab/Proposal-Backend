import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import { ExtractedFields } from '../../proposals/interfaces/extracted-fields.interface';

export interface CurrentProposalValues {
  title?: string;
  clientName?: string;
  clientEmail?: string;
  industry?: string;
  summary?: string;
  goals?: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
  billingType?: string;
  deliverables?: string[];
  milestones?: Array<{ title: string }>;
  teamMembers?: Array<{ role: string; experience: string }>;
  links?: string[];
  recipients?: Array<{ salutation?: string; name: string }>;
}

export class FieldExtractionAgent {
  private readonly logger = new Logger(FieldExtractionAgent.name);

  constructor(private openai: OpenAI) {}

  async extract(
    documentText: string,
    transcribedAudio?: string,
    currentValues?: CurrentProposalValues,
  ): Promise<ExtractedFields> {
    const startTime = Date.now();
    this.logger.log(`[EXTRACT] Starting field extraction`);
    this.logger.log(`[EXTRACT] Has current values: ${!!currentValues}`);

    // Combine all source content
    let combinedContent = '';
    if (documentText) {
      combinedContent += `=== DOCUMENT CONTENT ===\n${documentText}\n\n`;
    }
    if (transcribedAudio) {
      combinedContent += `=== AUDIO TRANSCRIPTION ===\n${transcribedAudio}\n\n`;
    }

    // Build prompt based on whether we have existing values
    const hasExistingValues = currentValues && Object.keys(currentValues).some(
      key => currentValues[key as keyof CurrentProposalValues] !== undefined &&
             currentValues[key as keyof CurrentProposalValues] !== null &&
             currentValues[key as keyof CurrentProposalValues] !== ''
    );

    const systemPrompt = hasExistingValues
      ? this.getMergeSystemPrompt()
      : this.getExtractionSystemPrompt();

    let userPrompt: string;
    if (hasExistingValues) {
      userPrompt = `=== CURRENT FORM VALUES (may include user edits) ===
${JSON.stringify(currentValues, null, 2)}

=== NEW CONTENT TO EXTRACT FROM ===
${combinedContent}

Analyze and intelligently merge the extracted data with existing values.`;
    } else {
      userPrompt = `Extract proposal form fields from the following content:\n\n${combinedContent}`;
    }

    this.logger.log(`[EXTRACT] Content length: ${combinedContent.length} chars`);
    this.logger.log(`[EXTRACT] Calling OpenAI GPT-4o-mini...`);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // Lower temperature for more deterministic extraction
        response_format: { type: 'json_object' },
        max_tokens: 4000, // Increased for comprehensive extraction
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

  private getExtractionSystemPrompt(): string {
    return `You are an expert proposal data extraction assistant. Your goal is to extract MAXIMUM information from the provided content (documents and/or audio transcriptions) to pre-fill a business proposal form comprehensively.

EXTRACTION PHILOSOPHY:
- Be THOROUGH - extract every piece of relevant information you can find
- Be INTELLIGENT - infer reasonable values when context strongly suggests them
- Be COMPREHENSIVE - for text fields like summary, goals, scope, combine ALL relevant information found
- Look for information in different formats: tables, lists, paragraphs, headers, footers, signatures

FIELD-SPECIFIC EXTRACTION GUIDANCE:

**title**: Look for project names, proposal titles, subject lines, document headers, "RE:" lines, or "Project:" labels. If multiple candidates exist, choose the most descriptive one.

**clientName**: Extract company names, organization names, or individual names. Look in letterheads, "To:", "Attention:", "Client:", addressed sections, email headers, or meeting participants. Include full legal names when available.

**clientEmail**: Search for email addresses anywhere in the content - signatures, contact sections, headers, body text. Extract ALL valid email addresses found related to the client.

**industry**: Analyze the content to determine the industry. Look for industry-specific terminology, company descriptions, or explicit mentions. Map to: Technology, Healthcare, Finance, Education, Manufacturing, Retail, Real Estate, Consulting, Marketing, Legal, Non-Profit, Government, Entertainment, Transportation, Energy, or Other.

**summary**: Create a comprehensive summary by combining:
- Executive summaries
- Project overviews
- Introduction sections
- Abstract or synopsis
- Key points from the entire document
Make it detailed and informative (2-4 paragraphs if content supports it).

**goals**: Extract ALL objectives, goals, aims, targets, and desired outcomes. Look for:
- "Objectives" sections
- Bullet points listing goals
- "We aim to...", "The goal is...", "Target outcomes..."
- Success criteria
- Expected benefits
Combine into a comprehensive goals statement.

**scope**: Extract EVERYTHING related to project scope:
- What's included
- Work to be performed
- Services to be delivered
- Features to be developed
- Areas of coverage
- Phases of work
Be thorough - this should capture the full extent of work.

**startDate / endDate**: Look for:
- Explicit dates ("Project starts January 15, 2024")
- Timeline sections
- "Duration: 3 months starting March 2024"
- Kickoff dates, completion dates, delivery dates
- Contract period specifications
Convert relative dates to absolute when possible based on document date.

**totalBudget**: Extract budget figures from:
- Cost sections, pricing tables
- "Total: $X", "Budget: $X", "Investment: $X"
- Sum of line items if itemized
- Fee proposals, quotations
Extract the TOTAL project value as a number.

**currency**: Identify currency from symbols ($, €, £, ₹), abbreviations (USD, EUR), or context (American company = likely USD). Default to USD if unclear but price exists.

**billingType**: Determine from payment terms:
- "Fixed price/fee" → fixed
- "Hourly rate", "per hour" → hourly
- "Payment upon milestone" → milestone
- "Monthly retainer" → retainer

**deliverables**: Extract ALL deliverable items:
- Explicit deliverables sections
- "We will deliver...", "Outputs include..."
- Items in scope that will be handed over
- Documentation, reports, systems, features
- Training materials, support documentation
Create individual entries for EACH deliverable mentioned.

**milestones**: Extract ALL project milestones:
- Phase completions
- Key deliverable dates
- Review points, approval gates
- Sprint completions, release dates
Include as many milestones as mentioned with descriptive titles.

**teamMembers**: Extract ALL mentioned team members and roles:
- "Team" sections
- Organizational charts
- "Resources required"
- Named individuals with their roles
- Required positions/expertise
Include role and experience level for each.

**links**: Extract ALL URLs and links:
- Website URLs
- Portfolio links
- Reference project links
- Documentation links
- GitHub, LinkedIn, company website URLs

**recipients**: Extract ALL people the proposal is addressed to:
- "To:", "Attention:", "Dear..."
- Names in email headers
- Decision makers mentioned
- Stakeholders listed
Include salutation (Mr./Ms./Dr.) and full name.

OUTPUT FORMAT (JSON):
{
  "title": "string or null - most descriptive project/proposal title found",
  "clientName": "string or null - client company or person name",
  "clientEmail": "string or null - client email address",
  "industry": "string or null - one of: Technology, Healthcare, Finance, Education, Manufacturing, Retail, Real Estate, Consulting, Marketing, Legal, Non-Profit, Government, Entertainment, Transportation, Energy, Other",
  "summary": "string or null - comprehensive project summary (be detailed)",
  "goals": "string or null - all objectives and goals combined",
  "scope": "string or null - complete scope of work",
  "startDate": "string or null - ISO date YYYY-MM-DD",
  "endDate": "string or null - ISO date YYYY-MM-DD",
  "totalBudget": "number or null - total budget as numeric value",
  "currency": "string or null - one of: USD, EUR, GBP, CAD, AUD, INR, JPY",
  "billingType": "string or null - one of: fixed, hourly, milestone, retainer",
  "deliverables": ["array of ALL deliverable items as strings"] or null,
  "milestones": [{"title": "descriptive milestone name"}] or null,
  "teamMembers": [{"role": "specific role name", "experience": "experience level/years"}] or null,
  "links": ["all URLs found"] or null,
  "recipients": [{"salutation": "Mr./Ms./Dr.", "name": "full name"}] or null
}

CRITICAL INSTRUCTIONS:
- Output valid JSON only, no markdown code blocks
- MAXIMIZE extraction - fill every field possible
- For text fields (summary, goals, scope), be COMPREHENSIVE - include all relevant details
- For array fields, extract ALL items found, not just a few
- Only use null when information is genuinely absent
- Combine information from multiple sections when relevant`;
  }

  private getMergeSystemPrompt(): string {
    return `You are an expert proposal data extraction and merging assistant. You will receive:
1. CURRENT FORM VALUES - data that may have been edited by the user
2. NEW CONTENT - documents/audio to extract additional data from

Your job is to INTELLIGENTLY MERGE the newly extracted data with existing values while MAXIMIZING the information captured.

EXTRACTION FIRST - Before merging, extract MAXIMUM information from the new content:
- Be THOROUGH - extract every piece of relevant information
- Be COMPREHENSIVE - for text fields, combine ALL relevant information found
- Look in all document sections: headers, body, tables, lists, footers, signatures

MERGE RULES:
1. PRESERVE user edits - if existing value looks intentionally modified, keep it
2. ENHANCE empty fields - if a field is empty/null and you can extract it, use the extracted value
3. MERGE arrays - for deliverables, milestones, team members, links: combine BOTH sources, removing exact duplicates
4. ENHANCE text fields - for summary/goals/scope: if existing is brief but extracted has more detail, COMBINE them intelligently
5. PREFER specificity - if extracted value is more specific/complete than existing, use extracted
6. ACCUMULATE information - the goal is to have MORE complete data after merging, not less

FIELD-SPECIFIC MERGE LOGIC:

**title**: Keep existing if specific; use extracted if existing is generic or empty
**clientName/clientEmail**: Keep existing if valid; add extracted if different and valid
**industry**: Keep existing unless empty
**summary**: If existing is short (< 100 chars) and extracted is longer, COMBINE both or use extracted. Otherwise keep existing.
**goals**: COMBINE existing goals with any new goals found. Merge into comprehensive list.
**scope**: COMBINE existing scope with any new scope details. More detail is better.
**startDate/endDate**: Keep existing unless empty or obviously invalid format
**totalBudget/currency**: Keep existing unless empty
**billingType**: Keep existing unless empty

**Array fields (deliverables, milestones, teamMembers, links, recipients)**:
- ALWAYS merge both arrays
- Remove exact duplicates
- Keep ALL unique items from both sources
- For milestones/teamMembers: merge based on title/role similarity

DECISION MATRIX:
- Empty existing + extracted available → USE EXTRACTED
- Existing has value + no extraction → KEEP EXISTING
- Both have values:
  - For arrays: MERGE ALL items, deduplicate
  - For short text (<100 chars) + longer extracted: COMBINE or use extracted
  - For long text + different extracted: KEEP EXISTING
  - For numbers/dates: KEEP EXISTING unless invalid

OUTPUT FORMAT (JSON):
{
  "title": "string or null - most descriptive title",
  "clientName": "string or null",
  "clientEmail": "string or null",
  "industry": "string or null - one of: Technology, Healthcare, Finance, Education, Manufacturing, Retail, Real Estate, Consulting, Marketing, Legal, Non-Profit, Government, Entertainment, Transportation, Energy, Other",
  "summary": "string or null - comprehensive merged summary",
  "goals": "string or null - all goals combined",
  "scope": "string or null - complete merged scope",
  "startDate": "string or null - ISO date YYYY-MM-DD",
  "endDate": "string or null - ISO date YYYY-MM-DD",
  "totalBudget": "number or null",
  "currency": "string or null - one of: USD, EUR, GBP, CAD, AUD, INR, JPY",
  "billingType": "string or null - one of: fixed, hourly, milestone, retainer",
  "deliverables": ["ALL merged deliverable items"] or null,
  "milestones": [{"title": "milestone name"}] or null,
  "teamMembers": [{"role": "role name", "experience": "experience level"}] or null,
  "links": ["ALL merged URLs"] or null,
  "recipients": [{"salutation": "Mr./Ms./Dr.", "name": "full name"}] or null,
  "_mergeNotes": "brief explanation of key merge decisions (for logging)"
}

CRITICAL INSTRUCTIONS:
- Output valid JSON only, no markdown code blocks
- MAXIMIZE information capture - the merged result should be MORE complete
- For arrays, include ALL items from both sources
- For text fields, prefer COMPREHENSIVE over minimal
- Only lose information if it's clearly duplicate`;
  }
}
