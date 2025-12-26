import { Injectable } from '@nestjs/common';
import {
  ProposalJobData,
  AIGeneratedContent,
  TeamStructureRow,
  TimelineRow,
} from '../proposals/entities/proposal.entity';

@Injectable()
export class DataTransformService {
  addTeamStructureHeader(
    table: TeamStructureRow[],
  ): TeamStructureRow[] {
    if (!table || table.length === 0) {
      return [];
    }

    const headerRow: TeamStructureRow = {
      Designation: 'Designation',
      Count: 'Count',
      'Key Responsibilities': 'Key Responsibilities',
      Experience: 'Experience',
    };

    return [headerRow, ...table];
  }

  addTimelineHeader(
    table: TimelineRow[],
  ): TimelineRow[] {
    if (!table || table.length === 0) {
      return [];
    }

    const headerRow: TimelineRow = {
      phase: 'Phase',
      scope: 'Activities',
      timeline: 'Duration',
    };

    return [headerRow, ...table];
  }

  mergeOutputs(
    jobData: ProposalJobData,
    generalInfoOutput: {
      'executive-summary': string;
      objectives: string;
      'training-and-support': string;
      'team-structure-min-experiance': string;
      'team-structure-table': TeamStructureRow[];
    },
    scopeOutput: {
      'scope-of-work-introduction': string;
      'scope-of-work-summary': string;
      'scope-of-work': string;
      'scope-of-work-main-points': string;
    },
    timelineOutput: {
      'duration-business-days': string;
      'implementation-timeline-table': TimelineRow[];
    },
  ): Record<string, any> {
    const teamTableWithHeader = this.addTeamStructureHeader(
      generalInfoOutput['team-structure-table'],
    );

    const timelineTableWithHeader = this.addTimelineHeader(
      timelineOutput['implementation-timeline-table'],
    );

    return {
      ...jobData,
      'executive-summary': generalInfoOutput['executive-summary'],
      objectives: generalInfoOutput.objectives,
      'training-and-support': generalInfoOutput['training-and-support'],
      'team-structure-min-experiance': generalInfoOutput['team-structure-min-experiance'],
      'team-structure-table': teamTableWithHeader,
      'scope-of-work-introduction': scopeOutput['scope-of-work-introduction'],
      'scope-of-work-summary': scopeOutput['scope-of-work-summary'],
      'scope-of-work': scopeOutput['scope-of-work'],
      'scope-of-work-main-points': scopeOutput['scope-of-work-main-points'],
      'duration-business-days': timelineOutput['duration-business-days'],
      'implementation-timeline-table': timelineTableWithHeader,
    };
  }
}
