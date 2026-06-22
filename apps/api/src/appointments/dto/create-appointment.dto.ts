import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AppointmentSource, AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString()
  vehicleId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  mechanicMemberId?: string;

  @IsOptional()
  @Type(() => Number)
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

  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @IsOptional()
  @IsString()
  requestedNotes?: string;
}
