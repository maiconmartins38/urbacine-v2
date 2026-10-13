# CRM WhatsApp — extensão do Chrome

Etapa 1: **Mensagens Agendadas** e **Anotações**, dentro do WhatsApp Web.

## Instalar (primeira vez)

1. Descompacte o `.zip` numa pasta fixa (ex.: `Documentos\crm-whatsapp`). Não apague essa pasta depois.
2. No Chrome, abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e escolha a pasta do passo 1.
5. Abra (ou recarregue com F5) o `web.whatsapp.com`.

## Atualizar para uma versão nova

1. Clique com o botão direito no `.zip` novo → **Extrair tudo** → **Extrair**. Abre uma pasta
   (ex.: `CRM-WhatsApp-0.13.0`) com o `manifest.json` dentro.
2. Em `chrome://extensions`, clique em **Carregar sem compactação** e escolha essa pasta.
3. O cartão "CRM WhatsApp" passa a mostrar a versão nova. Recarregue o WhatsApp Web (F5).

Os dados continuam: o Chrome reconhece a extensão pela identidade dela, não pela pasta.
Não apague a pasta que o Chrome está usando (a da última versão). As pastas de versões antigas
podem ser apagadas depois.

**Nunca clique em "Remover"**: o Chrome apaga junto todos os agendamentos e anotações.

## Para os agendamentos saírem no horário

- O computador precisa estar ligado, com o Chrome aberto e o WhatsApp Web conectado.
- Em `chrome://settings/performance`, adicione `web.whatsapp.com` em
  **"Sempre manter estes sites ativos"**, para o Chrome não suspender a aba.
- Se o WhatsApp Web estiver fechado no horário, a engrenagem ⚙ da tela de agendamentos
  define o que fazer: enviar quando abrir, ou não enviar.

## Ciclo de renovação (Cadastro → mês → NUTRIR → REMARKTING)

Tudo no mesmo horário do vencimento (D = dia do vencimento):

1. No **Cadastro** do cliente, preencha o vencimento (data e hora) e as mensagens rápidas
   (1 dia antes e no dia; 1 dia depois). O cliente entra sozinho na aba do mês do vencimento.
   O nome do cadastro também vira o nome do contato no WhatsApp ("Salvar contato" lá em cima).
2. Depois da mensagem de D+1, ele vai para **NUTRIR**: o valor é zerado e os envios da renovação
   são cancelados. Em D+3 recebe a **mensagem de NUTRIR**.
3. Em D+4 (o quarto dia) sem renovar, vai para **REMARKTING**: a mensagem de NUTRIR some e ele
   recebe a **mensagem de remarketing**.
4. Renovou? Botão **Renovado**: escolha 1, 2, 3, 6 ou 12 meses (30 dias cada), confira a data e o
   valor e confirme. O cliente volta para a aba do mês e o ciclo recomeça.

As mensagens de NUTRIR e de remarketing ficam no botão **Remarketing** e são as mesmas para todos
os clientes (mudou lá, muda para todo mundo). Lá também dá para mudar os dias (D+3 / D+4), repetir
o remarketing a cada 30 dias e ver quem está em NUTRIR e em REMARKTING.
Se você tirar o cliente da aba NUTRIR na mão, a automação dele para.

## Central de Agendamentos (menu da esquerda)

Calendário do ano: os meses na coluna verde (com quantos envios estão agendados em cada um),
os dias do mês no meio (o número embaixo do dia é quantos envios saem nele) e, ao lado, os
cartões de quem vai receber mensagem, com o horário. Entram todos os envios: os agendamentos
feitos na mão e os do ciclo de renovação (1 dia antes, no dia, 1 dia depois, NUTRIR e
remarketing). Os recorrentes (ex.: mensal) aparecem em todos os dias em que vão sair.

- Clique num **dia** para ver só ele; clique num **mês** (ou de novo no dia) para ver o mês todo.
- Clique no **cartão** para abrir a conversa. O lápis edita um agendamento feito na mão.
- O **+** agenda uma mensagem para a conversa aberta, já com a data escolhida.
- Os que já saíram aparecem com a etiqueta **Enviada** (ou **Erro**).

## Funil CRM (menu da esquerda)

O botão **Funil CRM** abre uma aba nova do Chrome com os números do Cadastro
(se a aba já estiver aberta, ele só volta para ela):

- **Contatos**: clientes do Cadastro que estão com valor.
- **Taxa de conversão por contato**: quantos dos clientes cadastrados estão com valor.
- **Receita média por contato**: receita total ÷ contatos.
- **Receita total**: soma dos valores.

Quem vai para NUTRIR tem o valor zerado e sai da conta; quando renova com valor, volta.
A aba se atualiza sozinha quando um cadastro muda.

## Onde ficam os dados

No próprio Chrome (`chrome.storage.local`), só neste computador e neste perfil do Chrome.
Sem limite de tamanho (permissão `unlimitedStorage`): o limite é o espaço livre do disco.
Teste de carga: 500 clientes com vencimento, 1.300 agendamentos, 190 respostas rápidas,
300 anotações e 40 arquivos ocupam ~43 MB (os textos são menos de 1 MB; o resto são os arquivos).

Duas abas do WhatsApp Web abertas ao mesmo tempo gravam em fila (uma não apaga o que a outra gravou).

### Criar backup (engrenagem ⚙ → Geral → Criar backup do sistema)

Baixa um arquivo `backup-crm-whatsapp-AAAA-MM-DD-HHMM.json` na pasta Downloads com tudo:
cadastros, agendamentos, renovações, respostas rápidas (com imagens, áudios e vídeos), abas,
anotações e configurações. Guarde uma cópia fora do computador (pen drive, Google Drive).
Para voltar: **Importar backup do sistema** → escolher o arquivo.

### Importar backup (engrenagem ⚙ no fim do menu da esquerda → Geral)

- O arquivo é lido em pedaços, então pode ser de qualquer tamanho. Imagens, áudios e vídeos
  só são lidos do arquivo na hora de gravar.
- **Backup desta extensão**: importa tudo (respostas rápidas, categorias, abas, cadastros,
  anotações, agendamentos, renovações e arquivos). Dá para somar ao que já existe ou substituir.
- **Backup de outra ferramenta**: se as partes do arquivo estiverem criptografadas (começam com
  `U2FsdGVkX1`), só abre com a senha/chave de quem gerou. A extensão tenta sozinha com o número
  do WhatsApp e aceita uma senha digitada. Sem senha, dá para pegar os dados de onde a outra
  ferramenta guarda, antes de serem trancados:
  - **Procurar respostas rápidas de outra ferramenta neste WhatsApp**: lê o que outras extensões
    guardam no próprio site (localStorage e IndexedDB), sem arquivo. Os bancos do WhatsApp ficam de fora.
  - Se ela guardar dentro da própria extensão, a tela mostra o passo a passo do Console (F12) para
    salvar esses dados num arquivo (`dados-abertos.json`) e importar.
- Dados abertos de outra ferramenta: a extensão procura respostas rápidas (com imagens, áudios
  e vídeos que estejam dentro do arquivo), categorias e abas e mostra o que achou antes de
  importar. Não repete respostas iguais.
- "Copiar estrutura do arquivo" copia só os nomes e tamanhos das partes (sem mensagens nem
  números), para ajustar o importador a um formato novo.

## Técnico

- **Não remova a linha `"key"` do `manifest.json`.** É ela que mantém a identidade da extensão
  (`dogmggcabeoghehocegimjmojhoangfe`); sem ela, o Chrome trata como outra extensão e os dados
  não aparecem.

- `page/bridge.js` usa a biblioteca [WA-JS](https://github.com/wppconnect-team/wa-js)
  (Apache-2.0, versão 4.6.1, em `vendor/`) para enviar as mensagens. O Google Analytics
  da biblioteca está desligado em `page/config.js`.
- Áudios (gravados ou importados) são convertidos para OGG/Opus em `content/audio.js`
  e enviados como mensagem de voz.
