import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Handlebars from 'handlebars';
import { marked } from 'marked';

interface Template {
  template_id: string;
  template_design: string;
  template_name: string;
}

interface MergedProposalData {
  title?: string;
  date_of_proposal?: string;
  submitted_to?: string;
  'executive-summary'?: string;
  objectives?: string;
  'scope-of-work-introduction'?: string;
  'scope-of-work-summary'?: string;
  'scope-of-work'?: string;
  end_date?: string;
  'training-and-support'?: string;
  start_date?: string;
  'duration-business-days'?: string;
  'team-structure-min-experiance'?: string;
  'team-structure-table'?: Array<{
    Designation: string;
    Count: string;
    'Key Responsibilities': string;
    Experience: string;
  }>;
  'implementation-timeline-table'?: Array<{
    phase: string;
    scope: string;
    timeline: string;
  }>;
  [key: string]: any;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_SERVICE_KEY') || '',
    );

    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('markdown', (text: string) => {
      if (!text) return '';
      return new Handlebars.SafeString(marked.parse(text) as string);
    });

    Handlebars.registerHelper('table', (rows: any[], options: Handlebars.HelperOptions) => {
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return '';
      }

      const headers = Object.keys(rows[0]);
      let html = '<table class="proposal-table"><thead><tr>';

      headers.forEach((header) => {
        html += `<th>${header}</th>`;
      });

      html += '</tr></thead><tbody>';

      rows.forEach((row) => {
        html += '<tr>';
        headers.forEach((header) => {
          html += `<td>${row[header] || ''}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      return new Handlebars.SafeString(html);
    });
  }

  async fetchTemplate(templateId: string): Promise<Template> {
    this.logger.log(`Fetching template: ${templateId}`);

    const { data, error } = await this.supabase
      .from('templates')
      .select('template_id, template_design, template_name')
      .eq('template_id', templateId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch template ${templateId}: ${error.message}`);
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    this.logger.log(`Template fetched: ${data.template_name}`);
    return data as Template;
  }

  renderTemplate(templateDesign: string, data: MergedProposalData): string {
    this.logger.log('Rendering template with data...');

    const mappedData = {
      'project-title': data.title,
      'date-of-proposal': data.date_of_proposal,
      'submitted-to': data.submitted_to,
      'executive-summary': data['executive-summary'],
      objectives: data.objectives,
      'scope-of-work-introduction': data['scope-of-work-introduction'],
      'scope-of-work-summary': data['scope-of-work-summary'],
      'scope-of-work': data['scope-of-work'],
      'estimated-go-live': data.end_date,
      'training-and-support': data['training-and-support'],
      'estimated-project-start-date': data.start_date,
      'duration-business-days': data['duration-business-days'],
      'team-structure-min-experiance': data['team-structure-min-experiance'],
      'team-structure-table': data['team-structure-table'],
      'implementation-timeline-table': data['implementation-timeline-table'],
      ...data,
    };

    try {
      const template = Handlebars.compile(templateDesign);
      const renderedHtml = template(mappedData);
      this.logger.log(`Template rendered, length: ${renderedHtml.length} characters`);
      return renderedHtml;
    } catch (error: any) {
      this.logger.error(`Failed to render template: ${error.message}`);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }
}
