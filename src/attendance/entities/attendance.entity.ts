import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('attendance')
export class Attendance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    // Se llena automáticamente con la fecha/hora actual al insertar
    @CreateDateColumn({ type: 'timestamp' })
    entry_time: Date;

    // Permite nulos porque al entrar, aún no hay hora de salida
    @Column({ type: 'timestamp', nullable: true })
    exit_time: Date;

    // Relación con la tabla Users (Opcional, pero muy útil para consultas complejas después)
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}