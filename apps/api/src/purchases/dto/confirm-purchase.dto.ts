import { IsBoolean, IsOptional } from 'class-validator';

export class ConfirmPurchaseDto {
  /** Lança itens no estoque ao confirmar (padrão: true). */
  @IsOptional()
  @IsBoolean()
  postToStock?: boolean;

  /** Cria produto no estoque quando o item não estiver vinculado (padrão: true). */
  @IsOptional()
  @IsBoolean()
  autoCreateProducts?: boolean;
}
