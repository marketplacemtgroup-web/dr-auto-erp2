-- Domínio de login da oficina (parte após o @), definido no cadastro inicial.
ALTER TABLE "organizations" ADD COLUMN "login_email_domain" TEXT;

UPDATE "organizations"
SET "login_email_domain" = LOWER(SPLIT_PART("email", '@', 2))
WHERE "email" IS NOT NULL
  AND "email" LIKE '%@%'
  AND "login_email_domain" IS NULL;
