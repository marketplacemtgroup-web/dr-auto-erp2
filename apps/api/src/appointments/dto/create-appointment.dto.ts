import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString()
  vehicleId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  mechanicMemberId?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  bay?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
