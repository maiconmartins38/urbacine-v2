# CRM WhatsApp — extensão do Chrome

Etapa 1: **Mensagens Agendadas** e **Anotações**, dentro do WhatsApp Web.

## Instalar (primeira vez)

1. Descompacte o `.zip` numa pasta fixa (ex.: `Documentos\crm-whatsapp`). Não apague essa pasta depois.
2. No Chrome, abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e escolha a pasta do passo 1.
5. Abra (ou recarregue com F5) o `web.whatsapp.com`.

## Atualizar para uma versão nova

1. Em `chrome://extensions`, no cartão **CRM WhatsApp**, clique em **Detalhes** e veja em
   **Origem** (ou "Carregado de") qual pasta o Chrome está usando.
2. Descompacte o `.zip` novo. Ele traz uma pasta `crm-whatsapp`: copie **o que está dentro dela**
   para a pasta do passo 1, substituindo os arquivos.
3. Volte em `chrome://extensions` e clique no botão **Recarregar** (↻) da extensão.
4. Recarregue o WhatsApp Web (F5). Confira a versão no aviso "CRM WhatsApp ativo ✓ (versão …)"
   e no fim do menu da esquerda.

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

- O arquivo é lido em pedaços, então pode ser de qualquer tamanho. Imagens, áudios e vídeos
  só são lidos do arquivo na hora de gravar.
- **Backup desta extensão**: importa tudo (respostas rápidas, categorias, abas, cadastros,
  anotações, agendamentos, renovações e arquivos). Dá para somar ao que já existe ou substituir.
- **Backup de outra ferramenta**: se as partes do arquivo estiverem criptografadas (começam com
  `U2FsdGVkX1`), só abre com a senha/chave de quem gerou. A extensão tenta sozinha com o número
  do WhatsApp e aceita uma senha digitada. Sem senha, a própria tela mostra como salvar os dados
  abertos da outra ferramenta num arquivo (`dados-abertos.json`) para importar.
- Dados abertos de outra ferramenta: a extensão procura respostas rápidas (com imagens, áudios
  e vídeos que estejam dentro do arquivo), categorias e abas e mostra o que achou antes de
  importar. Não repete respostas iguais.
- "Copiar estrutura do arquivo" copia só os nomes e tamanhos das partes (sem mensagens nem
  números), para ajustar o importador a um formato novo.

## Técnico

- `page/bridge.js` usa a biblioteca [WA-JS](https://github.com/wppconnect-team/wa-js)
  (Apache-2.0, versão 4.6.1, em `vendor/`) para enviar as mensagens. O Google Analytics
  da biblioteca está desligado em `page/config.js`.
- Áudios (gravados ou importados) são convertidos para OGG/Opus em `content/audio.js`
  e enviados como mensagem de voz.
