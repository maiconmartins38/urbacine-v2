# CRM WhatsApp — contexto para continuar o trabalho

Extensão do Chrome (Manifest V3) que põe um CRM dentro do WhatsApp Web, para uso pessoal do dono
(revenda de aplicativos/IPTV com clientes mensais). Foi construída passo a passo a partir de vídeos e
prints de outra ferramenta que ele usava (WaSeller). **Não usar nome, logo nem textos da marca WaSeller.**
Versão atual: ver `"version"` no `manifest.json` (0.13.0 quando este arquivo foi escrito).

## Como trabalhar com o dono
- Falar em **português simples**, sem termos técnicos. Ele não é programador.
- **Honestidade acima de tudo**: dizer o que foi testado e o que não foi; nunca afirmar que funciona sem testar.
- Ele pede uma mudança por vez, às vezes com vídeo/print. Confirmar o entendimento quando houver dúvida real.
- A interface é toda em português, com ícones SVG da própria ferramenta (sem emojis do WhatsApp na tela).

## Como atualizar a extensão no computador dele
- Esta pasta é a que o Chrome carrega (`chrome://extensions` → modo do desenvolvedor → "Carregar sem compactação").
  Depois de mudar arquivos aqui: em `chrome://extensions` clicar no ↻ do cartão "CRM WhatsApp" e dar **F5** no WhatsApp Web.
- **Nunca** pedir para clicar em "Remover": o Chrome apaga todos os dados da extensão.
- **Nunca remover a linha `"key"` do `manifest.json`**: ela fixa a identidade da extensão
  (`dogmggcabeoghehocegimjmojhoangfe`). Sem ela os dados (que ficam no Chrome) não aparecem.
- A cada mudança: subir `"version"` no `manifest.json` e atualizar o `LEIA-ME.md` se mudar algo que ele usa.
- Antes de mudanças grandes, sugerir **Criar backup do sistema** (engrenagem ⚙ → Geral).
- Código também está no GitHub: `maiconmartins38/urbacine-v2`, ramo `claude/gallant-albattani-q4fs0u`, pasta `extensao-crm/`
  (histórico de todas as versões).

## Arquitetura
- `page/` roda no mundo da página (MAIN): `config.js` (desliga o analytics da wa-js), `vendor/wppconnect-wa.js`
  (WA-JS 4.6.1, Apache-2.0 — não editar) e `bridge.js` (comandos que usam `window.WPP`).
- `content/` roda isolado (ISOLATED), na ordem do `manifest.json`. Tudo fica em `window.CRM`.
  A ponte é `window.postMessage` com `crm-ext:in` / `crm-ext:out`: `CRM.wa.<comando>()` (em `content/wa.js`) chama o
  comando de mesmo nome em `page/bridge.js`. Comando novo = acrescentar nos dois arquivos.
- Toda a interface fica em Shadow DOM (o CSS do WhatsApp não interfere). Estilo base em `content/styles.js`
  (cor principal `--teal: #24988d`). Ícones: `CRM.ui.icon(nome, tamanho)` (lista em `content/ui.js`).
  Janelas: `CRM.ui.modal(html, { wide, full, onClose })`, avisos `CRM.ui.toast(texto, 'ok'|'err')` e `CRM.ui.notice`.
- `background.js`: alarme `crm-tick` a cada 30 s (acorda o agendador nas abas do WhatsApp) e abre páginas
  próprias (`open-page`, ex.: `funil/index.html`).

Arquivos de `content/`:
- `util.js`, `store.js` (banco), `wa.js` (ponte), `ui.js`, `styles.js`, `layout.js` (encaixe das barras no WhatsApp)
- `tabs.js` (abas/Kanban no topo, abas padrão, `placeInStage`), `chattabs.js`, `rail.js` (menu da esquerda)
- `clients.js` (Cadastro: lista em cartões, formulário, `saveAll`), `contactname.js` ("Salvar contato" no topo)
- `renewals.js` (ciclo de renovação), `remarketing.js` (janela Remarketing: mensagens de NUTRIR e remarketing)
- `schedules.js` (agendamentos + agendador `tick`), `calendar.js` (Central de Agendamentos)
- `quick.js`, `quickpanel.js`, `quickrun.js`, `runbar.js`, `composer.js` (respostas rápidas e o raio ⚡)
- `panel.js` (painel da direita: Cadastro e Respostas rápidas), `notes.js` (anotações), `audio.js` (OGG/Opus)
- `backup.js` + `settings.js` (Configurações: criar/importar backup), `main.js` (barra de botões da conversa, início)
- `funil/` é uma página da extensão (aba própria): Funil CRM com contatos com valor, taxa, receita média e total.

## Dados (`chrome.storage.local`, permissão `unlimitedStorage`)
Chaves: `clients`, `renewals`, `schedules`, `quickReplies`, `quickCategories`, `tabs`, `notes`, `reports`,
`settings`, `contactsCache`, `reportsSeenAt` e os arquivos em `media:<id>` (dataUrl).
- Gravar listas **sempre** por `CRM.store.update…`/`serialUpdate` (fila + `navigator.locks`, vale entre abas do
  WhatsApp). Nunca ler e gravar direto com `chrome.storage.local.set` no código da página: duas abas apagavam dados.
- `store.saveSettings` junta com o que está gravado (não substitui).
- O Chrome reordena as chaves dos objetos; para comparar, usar JSON com chaves ordenadas.
- O WhatsApp agora usa ids `@lid` para muitos contatos (além de `@c.us`). Não filtrar só por `@c.us`.

## Regras do negócio já combinadas
- **Cadastro**: nome, telefone, valor, descrição + vencimento (data e hora) e duas respostas rápidas
  (1 dia antes e no dia; 1 dia depois). Cadastro novo começa **vazio**. O nome do cadastro vai também para o
  "Salvar contato" do WhatsApp e para o painel da direita (os três ficam ligados).
- **Ciclo** (mesmo horário do vencimento, D = dia do vencimento): o cliente entra na aba do mês (JANEIRO…DEZEMBRO).
  D-1 e D: mensagem 1; D+1: mensagem 2. Depois de D+1 → aba **NUTRIR**: valor zerado (vai para `previousValueCents`)
  e os envios da renovação são cancelados; D+3 mensagem de NUTRIR. D+4 sem renovar → aba **REMARKTING** (escrito
  assim mesmo), a de NUTRIR some e sai a de remarketing (pode repetir a cada 30 dias). Tirar o cliente da aba NUTRIR
  na mão para a automação. NUTRIR e remarketing são iguais para todos (botão Remarketing).
- **Renovado**: 1, 2, 3, 6 ou 12 meses (30 dias cada; se já venceu, conta de hoje), valor e mensagem de renovação
  (resposta rápida escolhida, fica salva). Volta para a aba do mês e o ciclo recomeça.
- Variáveis nas mensagens: `{nome}` (primeiro nome) e `{vencimento}` (data do vencimento do cadastro).
- Agendador: confere a cada 20 s; envia um de cada vez com 1,5 s de intervalo; atrasados (WhatsApp fechado)
  seguem a opção da engrenagem dos agendamentos (enviar quando abrir ou não enviar).
- Abas padrão: ENTROU EM CONTATO (aceita "ENTRARAM EM CONTATO"), REMARKTING, NUTRIR, JANEIRO…DEZEMBRO.

## O que ainda não tem função
- Menu da esquerda: Fluxo, Auto Atendimento, Follow Up, Links, Iniciar uma conversa, Tutoriais, Painel,
  Preferências, Notificações (mostram "vem numa próxima etapa"). API e Status foram tirados a pedido.
- Configurações → "Backup automático" (só a tela).
- Se passar de ~1.500 clientes, a lista "Exibir Todos" do Cadastro pode ficar lenta (500 cartões ≈ 0,5 s):
  mostrar em partes, como a Central de Agendamentos já faz (120 por vez).

## Testes
As versões até a 0.13.0 foram testadas num WhatsApp **simulado** (Playwright + um WPP falso), que não está nesta
pasta. No computador dele, testar no WhatsApp Web de verdade, com cuidado com envios reais (usar o próprio número
ou um contato de teste). Erros aparecem no Console (F12) do WhatsApp Web, com `[CRM]`.
Teste de carga feito: 500 clientes, 1.300 agendamentos, 190 respostas rápidas e 40 arquivos ≈ 43 MB, tudo rápido.
