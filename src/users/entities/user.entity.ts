import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'varchar', nullable: true })
  middle_name: string;

  @Column({ type: 'varchar', nullable: true })
  curp: string;

  @Column({ type: 'varchar', nullable: true })
  rfc: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  department: string;

  @Column({ type: 'varchar', nullable: true })
  position: string;

  @Column({ type: 'varchar', nullable: true })
  email_work: string;

  @Column({ type: 'varchar', select: false, nullable: true })
  password_hash: string;

  @Column({ type: 'boolean', nullable: true })
  privacy_notice: boolean;

  @Column({ type: 'int', nullable: true })
  biometric_id: number | null;

  @Column({ type: 'boolean', default: false })
  is_pending_deletion: boolean;

  @Column({ type: 'char', length: 1, default: 'A' })
  status: 'A' | 'B';

  /** NSS mexicano (11 dígitos): no cabe en int4; usar bigint en PostgreSQL. */
  @Column({ type: 'bigint', nullable: true })
  nss: string | null;

  @Column({ type: 'varchar', default: 'User' })
  role: 'Admin' | 'User';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
