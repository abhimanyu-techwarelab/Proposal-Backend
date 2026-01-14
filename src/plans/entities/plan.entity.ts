import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanFeature } from './plan-feature.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  plan_code: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  billing_interval: string;

  @Column({ type: 'varchar', nullable: true })
  pg_product_id: string;

  @Column({ type: 'varchar', nullable: true })
  pg_price_id: string;

  @Column({ type: 'decimal', nullable: true })
  price: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;

  @OneToMany(() => PlanFeature, (planFeature) => planFeature.plan)
  plan_features: PlanFeature[];
}
