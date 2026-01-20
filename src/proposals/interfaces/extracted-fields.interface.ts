export interface ExtractedFields {
  // Basic Information
  title?: string;
  clientName?: string;
  clientEmail?: string;
  industry?: string;

  // Project Description
  summary?: string;
  goals?: string;
  scope?: string;

  // Timeline
  startDate?: string; // ISO format YYYY-MM-DD
  endDate?: string; // ISO format YYYY-MM-DD

  // Budget
  totalBudget?: number;
  currency?: string;
  billingType?: string;

  // Arrays
  deliverables?: string[];
  milestones?: Array<{ title: string }>;
  teamMembers?: Array<{ role: string; experience: string }>;
  links?: string[];
  recipients?: Array<{ salutation: string; name: string }>;
}

export interface ExtractFieldsResponse {
  success: boolean;
  fields: ExtractedFields;
  sources: {
    documents: number;
    audio: number;
  };
  confidence: 'high' | 'medium' | 'low';
}
