# CRM WhatsApp — extensão do Chrome

Etapa 1: **Mensagens Agendadas** e **Anotações**, dentro do WhatsApp Web.

## Instalar (primeira vez)

1. Descompacte o `.zip` numa pasta fixa (ex.: `Documentos\crm-whatsapp`). Não apague essa pasta depois.
2. No Chrome, abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e escolha a pasta do passo 1.
5. Abra (ou recarregue com F5) o `web.whatsapp.com`.

## Atualizar para uma versão nova

1. Substitua os arquivos da mesma pasta pelos do `.zip` novo.
2. Em `chrome://extensions`, clique no botão **Recarregar** (↻) da extensão.
3. Recarregue o WhatsApp Web (F5).

**Nunca clique em "Remover"**: o Chrome apaga junto todos os agendamentos e anotações.

## Para os agendamentos saírem no horário

- O computador precisa estar ligado, com o Chrome aberto e o WhatsApp Web conectado.
- Em `chrome://settings/performance`, adicione `web.whatsapp.com` em
  **"Sempre manter estes sites ativos"**, para o Chrome não suspender a aba.
- Se o WhatsApp Web estiver fechado no horário, a engrenagem ⚙ da tela de agendamentos
  define o que fazer: enviar quando abrir, ou não enviar.

## Onde ficam os dados

No próprio Chrome (`chrome.storage.local`), só neste computador e neste perfil do Chrome.

### Importar backup (engrenagem ⚙ no fim do menu da esquerda → Geral)

- **Backup desta extensão**: importa tudo (respostas rápidas, categorias, abas, cadastros,
  anotações, agendamentos, renovações e arquivos). Dá para somar ao que já existe ou substituir.
- **Backup de outra ferramenta**: se as partes do arquivo estiverem criptografadas (começam com
  `U2FsdGVkX1`), só abre com a senha/chave de quem gerou. A extensão tenta sozinha com o número
  do WhatsApp e aceita uma senha digitada. Sem senha, dá para colar os dados abertos copiados
  da outra extensão (passo a passo na própria tela).
- Dados abertos de outra ferramenta: a extensão procura respostas rápidas, categorias e abas
  e mostra o que achou antes de importar. Não repete respostas iguais.

## Técnico

- `page/bridge.js` usa a biblioteca [WA-JS](https://github.com/wppconnect-team/wa-js)
  (Apache-2.0, versão 4.6.1, em `vendor/`) para enviar as mensagens. O Google Analytics
  da biblioteca está desligado em `page/config.js`.
- Áudios (gravados ou importados) são convertidos para OGG/Opus em `content/audio.js`
  e enviados como mensagem de voz.
