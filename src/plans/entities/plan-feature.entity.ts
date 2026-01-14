import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { Feature } from '../../features/entities/feature.entity';

@Entity('plan_features')
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'uuid' })
  feature_id: string;

  @Column({ type: 'int', nullable: true })
  limit: number;

  @Column({ type: 'boolean', default: false })
  is_true: boolean;

  @ManyToOne(() => Plan, (plan) => plan.plan_features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @ManyToOne(() => Feature, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feature_id' })
  feature: Feature;
}
