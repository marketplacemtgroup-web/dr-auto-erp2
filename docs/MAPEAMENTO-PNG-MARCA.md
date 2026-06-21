# Mapeamento — arquivos PNG (marca / Oficina do Beto)

Inventário gerado em **18/06/2026** no repositório `E:\OFICINA BETO\oficina-beto`.

> Varredura recursiva de todos os `.png`, excluindo `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.turbo`, `.gradle`.

**Total de arquivos PNG no projeto:** 31

---

## Resumo rápido

| Grupo | Qtd | Descrição |
|-------|-----|-----------|
| Marca Oficina do Beto (nome com *oficina* / *beto*) | 6 | Logos e fundos usados no ERP, portal e app Android |
| ERP (`app/public`) | 2 | Logo + favicon |
| Portal (`apps/portal/public`) | 4 | Logo, fundo, branding legado |
| App Android | 14 | Logo, fundo, ícones launcher, screenshot de teste |
| Legado WTEC / referência | 2 | Logos antigos na raiz e em `docs/` |
| Raiz / `public/` / capturas | 10 | Screenshots, imagens soltas, uploads de exemplo |
| Uploads da API (runtime) | 1 | Foto enviada por usuário na OS |

---

## 1. PNGs de marca — nome contém "oficina" ou "beto"

Estes são os arquivos **diretamente ligados à marca Oficina do Beto**.

| Caminho completo | Tamanho | Uso no sistema |
|------------------|---------|----------------|
| `E:\OFICINA BETO\oficina-beto\app\public\logo-oficinadobeto.png` | 64 KB | Logo principal do **ERP** — favicon, PWA, login, watermark, impressões |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\logo-oficinadobeto.png` | 64 KB | Logo principal do **Portal do cliente** — favicon, PWA, login |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina do beto.png` | 2,2 MB | **Fundo** do portal (login/splash) — `VITE_BRAND_BACKGROUND_URL` |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina-dobeto.png` | 2,2 MB | Cópia/alternativa do fundo (mesmo tamanho; incluída no PWA) |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable\logo_oficina_beto.png` | 64 KB | Logo no **app Android** — cabeçalho, ícone launcher |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable-nodpi\bg_oficina_beto.png` | 167 KB | **Fundo fotográfico** do app Android (tela login/home) |

### Onde o código referencia esses PNGs

| Arquivo de código | PNG referenciado |
|-------------------|------------------|
| `E:\OFICINA BETO\oficina-beto\app\src\lib\branding.ts` | `/logo-oficinadobeto.png` |
| `E:\OFICINA BETO\oficina-beto\app\index.html` | `/logo-oficinadobeto.png` (favicon) |
| `E:\OFICINA BETO\oficina-beto\app\public\manifest.webmanifest` | `/logo-oficinadobeto.png` |
| `E:\OFICINA BETO\oficina-beto\app\src\index.css` | `/logo-oficinadobeto.png` (watermark) |
| `E:\OFICINA BETO\oficina-beto\app\vite.config.ts` | `logo-oficinadobeto.png` |
| `E:\OFICINA BETO\oficina-beto\apps\portal\src\lib\branding.ts` | `/logo-oficinadobeto.png`, `/oficina do beto.png` |
| `E:\OFICINA BETO\oficina-beto\apps\portal\index.html` | `/logo-oficinadobeto.png` |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\manifest.webmanifest` | `/logo-oficinadobeto.png` |
| `E:\OFICINA BETO\oficina-beto\apps\portal\vite.config.ts` | `logo-oficinadobeto.png`, `oficina do beto.png`, `oficina-dobeto.png` |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\java\com\example\ui\components\WorkshopComponents.kt` | `R.drawable.logo_oficina_beto` |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\java\com\example\ui\components\WorkshopBackground.kt` | `R.drawable.bg_oficina_beto` |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable\ic_launcher_foreground.xml` | `@drawable/logo_oficina_beto` |

---

## 2. ERP — `app\public`

| Caminho completo | Tamanho | Uso |
|------------------|---------|-----|
| `E:\OFICINA BETO\oficina-beto\app\public\logo-oficinadobeto.png` | 64 KB | Logo / ícone PWA (ver seção 1) |
| `E:\OFICINA BETO\oficina-beto\app\public\favicon.png` | 64 KB | Favicon alternativo (PWA `includeAssets`) |

---

## 3. Portal — `apps\portal\public`

| Caminho completo | Tamanho | Uso |
|------------------|---------|-----|
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\logo-oficinadobeto.png` | 64 KB | Logo principal |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina do beto.png` | 2,2 MB | Fundo do portal |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina-dobeto.png` | 2,2 MB | Cópia do fundo |
| `E:\OFICINA BETO\oficina-beto\apps\portal\public\branding\logo.png` | 93 KB | Logo legado em `/branding/logo.png` (fallback antes do cadastro da oficina) |

---

## 4. App Android — `APLICATIVO OFICINA`

### Marca

| Caminho completo | Tamanho | Uso |
|------------------|---------|-----|
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable\logo_oficina_beto.png` | 64 KB | Logo nas telas + ícone launcher |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable-nodpi\bg_oficina_beto.png` | 167 KB | Fundo fotográfico |

### Ícones do launcher (gerados a partir do logo)

| Caminho completo | Tamanho |
|------------------|---------|
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-mdpi\ic_launcher.png` | 3,6 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-mdpi\ic_launcher_round.png` | 3,6 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-hdpi\ic_launcher.png` | 7,3 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-hdpi\ic_launcher_round.png` | 7,3 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xhdpi\ic_launcher.png` | 12,2 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png` | 12,2 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxhdpi\ic_launcher.png` | 25 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png` | 25 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png` | 42,6 KB |
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png` | 42,6 KB |

### Teste

| Caminho completo | Tamanho | Uso |
|------------------|---------|-----|
| `E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\test\screenshots\greeting.png` | 2,8 KB | Screenshot gerado por teste automatizado |

---

## 5. Legado WTEC (marca anterior)

| Caminho completo | Tamanho | Observação |
|------------------|---------|------------|
| `E:\OFICINA BETO\oficina-beto\LOGO WTEC APP.png` | 2,6 MB | Logo antigo na raiz do repo |
| `E:\OFICINA BETO\oficina-beto\docs\logo wtecmotors.png` | 2,6 MB | Cópia/referência em documentação |

> O código ainda reconhece URLs legadas `/logo-wtecmotors.png` em `branding.ts`, mas esses arquivos **não existem** mais em `public/`.

---

## 6. Raiz do repositório e pasta `public\`

Arquivos PNG soltos — **não referenciados** pelo ERP/portal/app em produção (capturas, materiais, testes).

| Caminho completo | Tamanho |
|------------------|---------|
| `E:\OFICINA BETO\oficina-beto\fullpage.png` | 885 KB |
| `E:\OFICINA BETO\oficina-beto\screenshot.png` | 299 KB |
| `E:\OFICINA BETO\oficina-beto\public\1000504747.png` | 1,3 MB |
| `E:\OFICINA BETO\oficina-beto\public\1000504748.png` | 1,4 MB |
| `E:\OFICINA BETO\oficina-beto\public\1000504758.png` | 627 KB |
| `E:\OFICINA BETO\oficina-beto\public\1000504759.png` | 991 KB |
| `E:\OFICINA BETO\oficina-beto\public\1000504760.png` | 1,0 MB |
| `E:\OFICINA BETO\oficina-beto\public\1000504761.png` | 991 KB |
| `E:\OFICINA BETO\oficina-beto\public\1000504762.png` | 1,0 MB |
| `E:\OFICINA BETO\oficina-beto\public\1000504763.png` | 547 KB |

---

## 7. Uploads da API (dados de runtime)

Arquivo gerado pelo uso do sistema (anexo de OS), **não é asset de marca**.

| Caminho completo | Tamanho |
|------------------|---------|
| `E:\OFICINA BETO\oficina-beto\apps\api\uploads\cmpr0xdmg0000in0czlsytlmy\cmpr1co2m0005inj4rlyupkoi\63cbfea6-db7a-424c-8cb3-1591bb9bba38-ChatGPT_Image_28_de_mai._de_2026__13_55_15.png` | 1,5 MB |

---

## 8. Lista completa (todos os PNG, ordem alfabética)

```
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable\logo_oficina_beto.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\drawable-nodpi\bg_oficina_beto.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-hdpi\ic_launcher.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-hdpi\ic_launcher_round.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-mdpi\ic_launcher.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-mdpi\ic_launcher_round.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xhdpi\ic_launcher.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxhdpi\ic_launcher.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png
E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA\app\src\test\screenshots\greeting.png
E:\OFICINA BETO\oficina-beto\app\public\favicon.png
E:\OFICINA BETO\oficina-beto\app\public\logo-oficinadobeto.png
E:\OFICINA BETO\oficina-beto\apps\api\uploads\cmpr0xdmg0000in0czlsytlmy\cmpr1co2m0005inj4rlyupkoi\63cbfea6-db7a-424c-8cb3-1591bb9bba38-ChatGPT_Image_28_de_mai._de_2026__13_55_15.png
E:\OFICINA BETO\oficina-beto\apps\portal\public\branding\logo.png
E:\OFICINA BETO\oficina-beto\apps\portal\public\logo-oficinadobeto.png
E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina do beto.png
E:\OFICINA BETO\oficina-beto\apps\portal\public\oficina-dobeto.png
E:\OFICINA BETO\oficina-beto\docs\logo wtecmotors.png
E:\OFICINA BETO\oficina-beto\fullpage.png
E:\OFICINA BETO\oficina-beto\LOGO WTEC APP.png
E:\OFICINA BETO\oficina-beto\public\1000504747.png
E:\OFICINA BETO\oficina-beto\public\1000504748.png
E:\OFICINA BETO\oficina-beto\public\1000504758.png
E:\OFICINA BETO\oficina-beto\public\1000504759.png
E:\OFICINA BETO\oficina-beto\public\1000504760.png
E:\OFICINA BETO\oficina-beto\public\1000504761.png
E:\OFICINA BETO\oficina-beto\public\1000504762.png
E:\OFICINA BETO\oficina-beto\public\1000504763.png
E:\OFICINA BETO\oficina-beto\screenshot.png
```

---

## 9. Checklist para trocar a marca (só PNG)

Se for renomear/rebrandar, estes são os arquivos PNG que **precisam ser substituídos ou renomeados**:

1. `app\public\logo-oficinadobeto.png`
2. `app\public\favicon.png`
3. `apps\portal\public\logo-oficinadobeto.png`
4. `apps\portal\public\oficina do beto.png`
5. `apps\portal\public\oficina-dobeto.png`
6. `apps\portal\public\branding\logo.png`
7. `APLICATIVO OFICINA\app\src\main\res\drawable\logo_oficina_beto.png`
8. `APLICATIVO OFICINA\app\src\main\res\drawable-nodpi\bg_oficina_beto.png`
9. Regenerar os 10 `ic_launcher*.png` no Android após trocar o logo

Ver também: [MAPEAMENTO-MARCA-OFICINA-BETO.md](./MAPEAMENTO-MARCA-OFICINA-BETO.md) (textos, `.env` e código).
