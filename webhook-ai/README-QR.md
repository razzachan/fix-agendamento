# WhatsApp via QR (whatsapp-web.js)

Endpoints locais:
- GET http://localhost:3100/whatsapp/status
- GET http://localhost:3100/whatsapp/qr
- POST http://localhost:3100/whatsapp/reset

Fluxo:
1. Iniciar: `npm run dev` em webhook-ai
2. Abrir `/admin/whatsapp` no frontend para escanear o QR
3. Após conectado, o bot responde mensagens recebidas e reutiliza os módulos atuais

Sessão:
- Persistida via LocalAuth (pasta .wwebjs_auth dentro de webhook-ai/.wwebjs_auth)
- Use `/whatsapp/reset` para forçar novo QR

