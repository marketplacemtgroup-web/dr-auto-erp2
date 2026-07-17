import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  take?: number = DEFAULT_PAGE_SIZE;

  /** Alias for take (Prisma convention). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  get skip(): number {
    const page = this.page ?? 1;
    return (page - 1) * this.resolvedTake;
  }

  get resolvedTake(): number {
    return this.take ?? this.limit ?? DEFAULT_PAGE_SIZE;
  }
}

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
};

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  take: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    take,
    totalPages: total === 0 ? 0 : Math.ceil(total / take),
  };
}
