-- Instância single-tenant Scalibur: padroniza o nome da organização
UPDATE organizations
SET
  name = 'OFICINA SCALIBUR',
  trade_name = 'OFICINA SCALIBUR';

SELECT id, name, trade_name FROM organizations;
