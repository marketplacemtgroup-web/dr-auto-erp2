# Portal PWA no celular

Use **`npm run dev`** (um comando). O portal sobe em **HTTPS na porta 3001** automaticamente.

No terminal aparece o link do celular, por exemplo:

`https://192.168.1.64:3001/login`

- Chrome Android: se pedir, **Avançado → Continuar** (certificado de dev).
- Em seguida o Chrome mostra **Instalar app?** Sim/Não.

**Não use** `http://` no celular para o portal — o navegador não instala PWA em HTTP (só HTTPS ou localhost no PC).

**Produção:** domínio HTTPS do cliente (ex. `https://cliente.suaoficina.com`) — instalação normal, sem certificado de dev.
