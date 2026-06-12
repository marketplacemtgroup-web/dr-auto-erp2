# Branding do Portal do Cliente

Substitua os arquivos desta pasta para personalizar o portal por cliente/projeto.

| Arquivo | Uso |
|---------|-----|
| `logo.png` | Logo principal (login, splash, header) |
| `background.webp` | Imagem de fundo (moto/veículo) |

Configure também as variáveis em `.env`:

```env
VITE_APP_NAME=WTEC Motors
VITE_APP_TAGLINE=Portal do Cliente
VITE_BRAND_LOGO_URL=/branding/logo.png
VITE_BRAND_BACKGROUND_URL=/branding/background.webp
```

Os arquivos em `/logo-wtecmotors.png` e `/moto-bmw-bg.webp` na raiz de `public/` são cópias de compatibilidade.
