import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PortalCreateAppointmentDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  requestedNotes?: string;
}
