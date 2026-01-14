import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  feature: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar', nullable: true })
  type: string;

  @CreateDateColumn()
  created_at: Date;
}
