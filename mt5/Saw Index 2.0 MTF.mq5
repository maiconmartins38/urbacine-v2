//+------------------------------------------------------------------+
//|                                            Saw Index 2.0 MTF.mq5 |
//|                                                      (c) Adeildo |
//+------------------------------------------------------------------+
// Este codigo e sujeito aos termos da Mozilla Public License 2.0
//
// SAW INDEX 2.0 MTF - versao MetaTrader 5 (MQL5)
// Convertido do indicador Pine Script v6 "Saw Index 2.0 MTF" (TradingView).
//
// Uma linha de SAW para cada tempo grafico (M1, M5, M15, M30, H1, H4, D1, W1, MN1),
// calculada AQUI DENTRO, sem iCCI e sem iMA (nenhum indicador pronto):
//     preco = preco aplicado (padrao: tipico = (max + min + fech) / 3)
//     SMA   = media simples do preco nos ultimos N candles
//     D     = (0,015 / N) x soma |preco - SMA|
//     SAW   = (preco - SMA) / D     (0 quando D = 0)
//
// Recursos:
//   * 9 linhas (M1 ... MN1), cada uma com cor propria e opcao de mostrar/esconder;
//   * niveis +150 / -150;
//   * cabecalho "(M1: 43.6) (M5: -60.3) ..." com os 9 tempos graficos:
//     preto entre os niveis, verde >= +150, vermelho <= -150;
//   * alerta de Compra e Venda: VENDA quando TODOS os tempos graficos marcados
//     estao >= +150, COMPRA quando TODOS estao <= -150 (no maximo um por candle),
//     em janela de alerta, notificacao no celular (push) e/ou e-mail;
//   * Painel de Niveis no canto inferior direito (MN1 ... M1, MEDIA e MEDIA 2),
//     desligado por padrao, na janela do indicador ou no grafico de precos.
//
// Alinhamento das linhas: por HORARIO, em degraus (igual ao Pine Script). Cada candle
// do grafico recebe o SAW do candle do tempo grafico maior que contem aquele horario;
// num tempo grafico menor, o SAW do ultimo candle menor dentro do candle do grafico.
//
// Instalacao: no MT5 abra Arquivo > Abrir pasta de dados, copie este arquivo para
// MQL5\Indicators, abra no MetaEditor e compile (F7).
#property copyright   "(c) Adeildo"
#property version     "2.00"
#property description "Saw Index 2.0 MTF: uma linha de SAW para cada tempo grafico (M1 ... MN1),"
#property description "cabecalho com os niveis, alerta de Compra e Venda e Painel de Niveis."

#property indicator_separate_window
#property indicator_buffers 9
#property indicator_plots   9

#define TF_COUNT    9        // M1, M5, M15, M30, H1, H4, D1, W1, MN1
#define FONT_NAME   "Arial"
#define MAX_RETRIES 30       // tentativas de recalculo enquanto o historico carrega

enum ENUM_HDR_POS
{
   HDR_LEFT   = 0, // Topo - esquerda
   HDR_CENTER = 1, // Topo - centro
   HDR_RIGHT  = 2  // Topo - direita
};

enum ENUM_TXT_SIZE
{
   TXT_TINY   = 7,  // Minusculo
   TXT_SMALL  = 8,  // Pequeno
   TXT_NORMAL = 10  // Normal
};

enum ENUM_PANEL_WIN
{
   PANEL_IND  = 0, // Janela do indicador
   PANEL_MAIN = 1  // Grafico de precos (janela principal)
};

// ===================== PARAMETROS =====================
input group "Saw Index"
input int                InpLen        = 34;            // Periodo (da media movel e do SAW)
input ENUM_APPLIED_PRICE InpPrice      = PRICE_TYPICAL; // Preco aplicado
input double             InpLevel      = 150.0;         // Nivel (+/-)
input color              InpLevelColor = clrBlack;      // Cor das linhas de nivel (+150 / -150)
input int                InpMaxBars    = 5000;          // Candles do grafico calculados (0 = todos)

input group "Cabecalho"
input bool          InpShowHeader = true;       // Mostrar o nivel de cada tempo grafico no cabecalho
input ENUM_HDR_POS  InpHdrPos     = HDR_CENTER; // Posicao do cabecalho
input ENUM_TXT_SIZE InpHdrSize    = TXT_SMALL;  // Tamanho do texto
input int           InpHdrY       = 16;         // Distancia do topo da janela (pixels)
input color         InpHdrColor   = clrBlack;   // Cor padrao (entre os niveis)
input color         InpHdrOver    = clrGreen;   // Cor quando >= +nivel (ex: +150)
input color         InpHdrUnder   = clrRed;     // Cor quando <= -nivel (ex: -150)

input group "Tempos graficos exibidos (mostrar / cor)"
input bool  InpShowM1  = true;           // M1  - mostrar
input color InpColM1   = clrRed;         // M1  - cor
input bool  InpShowM5  = true;           // M5  - mostrar
input color InpColM5   = clrMagenta;     // M5  - cor
input bool  InpShowM15 = true;           // M15 - mostrar
input color InpColM15  = clrGreen;       // M15 - cor
input bool  InpShowM30 = false;          // M30 - mostrar
input color InpColM30  = clrOrange;      // M30 - cor
input bool  InpShowH1  = true;           // H1  - mostrar
input color InpColH1   = clrDodgerBlue;  // H1  - cor
input bool  InpShowH4  = false;          // H4  - mostrar
input color InpColH4   = clrOrangeRed;   // H4  - cor
input bool  InpShowD1  = true;           // D1  - mostrar
input color InpColD1   = clrBlack;       // D1  - cor
input bool  InpShowW1  = false;          // W1  - mostrar
input color InpColW1   = clrMagenta;     // W1  - cor
input bool  InpShowMN1 = false;          // MN1 - mostrar
input color InpColMN1  = clrGreenYellow; // MN1 - cor
input int   InpLineW   = 1;              // Espessura das linhas (1 a 4)

input group "Alerta de Compra e Venda"
input bool InpAlertOn = true;  // Ativar alerta de Compra e Venda
input bool InpAlM1    = true;  // Usar M1 no alerta
input bool InpAlM5    = false; // Usar M5 no alerta
input bool InpAlM15   = false; // Usar M15 no alerta
input bool InpAlM30   = false; // Usar M30 no alerta
input bool InpAlH1    = false; // Usar H1 no alerta
input bool InpAlH4    = false; // Usar H4 no alerta
input bool InpAlD1    = false; // Usar D1 no alerta
input bool InpAlW1    = false; // Usar W1 no alerta
input bool InpAlMN1   = false; // Usar MN1 no alerta
input bool InpAlPopup = true;  // Alerta em janela (com som)
input bool InpAlPush  = false; // Notificacao no celular (push)
input bool InpAlMail  = false; // Enviar e-mail

input group "Painel de Niveis SAW (canto inferior direito)"
input bool           InpPanelOn    = false;     // Mostrar o Painel de Niveis (false = retirado)
input ENUM_PANEL_WIN InpPanelWin   = PANEL_IND; // Janela do painel
input int            InpPanelLen   = 34;        // Periodo do SAW usado no painel
input ENUM_TXT_SIZE  InpPanelSize  = TXT_SMALL; // Tamanho do texto
input color          InpPanelColor = clrBlack;  // Cor padrao do valor (entre os niveis)
input double         InpPanelLevel = 150.0;     // Nivel de referencia (+/-) para colorir o valor
input color          InpPanelUnder = clrRed;    // Cor do valor quando <= -nivel (sobrevenda)
input color          InpPanelOver  = clrGreen;  // Cor do valor quando >= +nivel (sobrecompra)

input group "Media de Niveis (todos os 9 tempos graficos)"
input bool   InpMediaOn    = true;    // Mostrar a linha MEDIA no painel
input string InpMediaLabel = "MEDIA"; // Texto do rotulo

input group "Media de Niveis 2 (escolha os tempos graficos)"
input bool   InpMedia2On    = true;      // Mostrar a linha MEDIA 2 no painel
input string InpMedia2Label = "MEDIA 2"; // Texto do rotulo
input bool   InpM2MN1       = true;      // Incluir MN1 na MEDIA 2
input bool   InpM2W1        = true;      // Incluir W1 na MEDIA 2
input bool   InpM2D1        = true;      // Incluir D1 na MEDIA 2
input bool   InpM2H4        = true;      // Incluir H4 na MEDIA 2
input bool   InpM2H1        = true;      // Incluir H1 na MEDIA 2
input bool   InpM2M30       = true;      // Incluir M30 na MEDIA 2
input bool   InpM2M15       = true;      // Incluir M15 na MEDIA 2
input bool   InpM2M5        = true;      // Incluir M5 na MEDIA 2
input bool   InpM2M1        = true;      // Incluir M1 na MEDIA 2

// ===================== VARIAVEIS =====================
// ordem M1 ... MN1
ENUM_TIMEFRAMES g_tf[TF_COUNT]     = {PERIOD_M1, PERIOD_M5, PERIOD_M15, PERIOD_M30, PERIOD_H1,
                                      PERIOD_H4, PERIOD_D1, PERIOD_W1,  PERIOD_MN1};
string          g_tfName[TF_COUNT] = {"M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"};

struct SLine { double v[]; };     // buffer de uma linha

SLine    g_line[TF_COUNT];
bool     g_show[TF_COUNT];        // mostrar a linha
color    g_color[TF_COUNT];       // cor da linha
bool     g_alertUse[TF_COUNT];    // usar no alerta
bool     g_media2Use[TF_COUNT];   // entra na MEDIA 2
bool     g_higher[TF_COUNT];      // tempo grafico >= tempo grafico do grafico

int      g_len, g_panelLen;
double   g_level, g_panelLevel;
string   g_prefix;                // prefixo dos objetos (cabecalho e painel)
int      g_win        = -1;       // janela do indicador
int      g_ratesTotal = 0;        // candles do grafico no ultimo calculo
bool     g_forceFull  = false;    // recalcular tudo (historico ainda carregando)
int      g_retries    = 0;
datetime g_lastAlert  = 0;        // candle do ultimo alerta
MqlRates g_rates[];

// ===================== INICIALIZACAO =====================
int OnInit()
{
   g_len        = InpLen      < 1 ? 1 : InpLen;
   g_panelLen   = InpPanelLen < 1 ? 1 : InpPanelLen;
   g_level      = InpLevel      < 0.0 ? 0.0 : InpLevel;
   g_panelLevel = InpPanelLevel < 0.0 ? 0.0 : InpPanelLevel;
   int lineW    = InpLineW < 1 ? 1 : (InpLineW > 4 ? 4 : InpLineW);

   g_show[0] = InpShowM1;  g_color[0] = InpColM1;  g_alertUse[0] = InpAlM1;  g_media2Use[0] = InpM2M1;
   g_show[1] = InpShowM5;  g_color[1] = InpColM5;  g_alertUse[1] = InpAlM5;  g_media2Use[1] = InpM2M5;
   g_show[2] = InpShowM15; g_color[2] = InpColM15; g_alertUse[2] = InpAlM15; g_media2Use[2] = InpM2M15;
   g_show[3] = InpShowM30; g_color[3] = InpColM30; g_alertUse[3] = InpAlM30; g_media2Use[3] = InpM2M30;
   g_show[4] = InpShowH1;  g_color[4] = InpColH1;  g_alertUse[4] = InpAlH1;  g_media2Use[4] = InpM2H1;
   g_show[5] = InpShowH4;  g_color[5] = InpColH4;  g_alertUse[5] = InpAlH4;  g_media2Use[5] = InpM2H4;
   g_show[6] = InpShowD1;  g_color[6] = InpColD1;  g_alertUse[6] = InpAlD1;  g_media2Use[6] = InpM2D1;
   g_show[7] = InpShowW1;  g_color[7] = InpColW1;  g_alertUse[7] = InpAlW1;  g_media2Use[7] = InpM2W1;
   g_show[8] = InpShowMN1; g_color[8] = InpColMN1; g_alertUse[8] = InpAlMN1; g_media2Use[8] = InpM2MN1;

   for(int k = 0; k < TF_COUNT; k++)
   {
      SetIndexBuffer(k, g_line[k].v, INDICATOR_DATA);
      ArraySetAsSeries(g_line[k].v, false);
      PlotIndexSetString (k, PLOT_LABEL, g_tfName[k]);
      PlotIndexSetInteger(k, PLOT_DRAW_TYPE, g_show[k] ? DRAW_LINE : DRAW_NONE);
      PlotIndexSetInteger(k, PLOT_LINE_STYLE, STYLE_SOLID);
      PlotIndexSetInteger(k, PLOT_LINE_COLOR, g_color[k]);
      PlotIndexSetInteger(k, PLOT_LINE_WIDTH, lineW);
      PlotIndexSetInteger(k, PLOT_SHOW_DATA, g_show[k]);
      PlotIndexSetDouble (k, PLOT_EMPTY_VALUE, EMPTY_VALUE);
      g_higher[k] = PeriodSeconds(g_tf[k]) >= PeriodSeconds(_Period);
   }

   IndicatorSetString (INDICATOR_SHORTNAME, "Saw Index(" + IntegerToString(g_len) + ")");
   IndicatorSetInteger(INDICATOR_DIGITS, 2);
   IndicatorSetInteger(INDICATOR_LEVELS, 2);
   IndicatorSetDouble (INDICATOR_LEVELVALUE, 0,  g_level);
   IndicatorSetDouble (INDICATOR_LEVELVALUE, 1, -g_level);
   for(int l = 0; l < 2; l++)
   {
      IndicatorSetInteger(INDICATOR_LEVELCOLOR, l, InpLevelColor);
      IndicatorSetInteger(INDICATOR_LEVELSTYLE, l, STYLE_DOT);
      IndicatorSetInteger(INDICATOR_LEVELWIDTH, l, 1);
   }

   g_prefix = "SawIdx2MTF_" + IntegerToString((long)(GetMicrosecondCount() % 1000000)) + "_";
   EventSetTimer(1);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   ObjectsDeleteAll(0, g_prefix);
   ChartRedraw();
}

// ===================== CALCULO PROPRIO DO SAW =====================
double PriceOf(const MqlRates &r, const ENUM_APPLIED_PRICE p)
{
   switch(p)
   {
      case PRICE_OPEN:     return r.open;
      case PRICE_HIGH:     return r.high;
      case PRICE_LOW:      return r.low;
      case PRICE_MEDIAN:   return (r.high + r.low) / 2.0;
      case PRICE_TYPICAL:  return (r.high + r.low + r.close) / 3.0;
      case PRICE_WEIGHTED: return (r.high + r.low + 2.0 * r.close) / 4.0;
      default:             return r.close;
   }
}

// SAW do candle r[n-1] com os 'n' candles r[0..n-1] (mesma formula do Saw Index)
double SawCalc(const MqlRates &r[], const int n, const ENUM_APPLIED_PRICE p)
{
   double sum = 0.0;
   for(int i = 0; i < n; i++)
      sum += PriceOf(r[i], p);
   double sma = sum / n;
   double dev = 0.0;
   for(int i = 0; i < n; i++)
      dev += MathAbs(PriceOf(r[i], p) - sma);
   double d = dev * 0.015 / n;
   return d == 0.0 ? 0.0 : (PriceOf(r[n - 1], p) - sma) / d;
}

// Abertura do candle seguinte do tempo grafico 'tf'
datetime NextBarTime(const ENUM_TIMEFRAMES tf, const datetime t)
{
   if(tf != PERIOD_MN1)
      return (datetime)(t + PeriodSeconds(tf));
   MqlDateTime s;
   TimeToStruct(t, s);
   s.day = 1; s.hour = 0; s.min = 0; s.sec = 0;
   s.mon++;
   if(s.mon > 12) { s.mon = 1; s.year++; }
   return StructToTime(s);
}

// SAW do tempo grafico k que corresponde ao candle i do grafico (EMPTY_VALUE = sem dados).
// barTime recebe a abertura do candle do tempo grafico k que foi usado.
double SawAt(const int k, const datetime &time[], const int i, const int total,
             const int n, const ENUM_APPLIED_PRICE price, datetime &barTime)
{
   barTime = 0;
   int got;
   if(g_higher[k])
      got = CopyRates(_Symbol, g_tf[k], time[i], n, g_rates);                     // candle maior que contem o horario
   else if(i == total - 1)
      got = CopyRates(_Symbol, g_tf[k], 0, n, g_rates);                           // candle menor mais recente
   else
      got = CopyRates(_Symbol, g_tf[k], (datetime)(time[i + 1] - 1), n, g_rates); // ultimo candle menor antes do proximo
   if(got < n)
      return EMPTY_VALUE;
   barTime = g_rates[n - 1].time;
   // o candle certo ainda nao existe no historico desse tempo grafico
   if(g_higher[k] ? time[i] >= NextBarTime(g_tf[k], barTime) : barTime < time[i])
      return EMPTY_VALUE;
   return SawCalc(g_rates, n, price);
}

// Linha do tempo grafico k nos candles start ... total-1
void CalcLine(const int k, const datetime &time[], const int total, const int start, const int limitStart)
{
   double   cVal  = EMPTY_VALUE;   // valor do candle maior em cache
   datetime cFrom = 0, cTo = 0;    // abertura e fim desse candle maior
   datetime bt;
   for(int i = start; i < total; i++)
   {
      // candles do grafico dentro do mesmo candle maior repetem o valor (degraus)
      if(cTo > 0 && time[i] >= cFrom && time[i] < cTo)
      {
         g_line[k].v[i] = cVal;
         continue;
      }
      double v = SawAt(k, time, i, total, g_len, InpPrice, bt);
      g_line[k].v[i] = v;
      if(g_higher[k] && v != EMPTY_VALUE)
      {
         cVal  = v;
         cFrom = bt;
         cTo   = NextBarTime(g_tf[k], bt);
      }
   }
   // candle maior ainda aberto: os candles anteriores do grafico dentro dele recebem o valor atual
   if(cTo > 0 && time[total - 1] >= cFrom && time[total - 1] < cTo)
      for(int j = start - 1; j >= limitStart && time[j] >= cFrom; j--)
         g_line[k].v[j] = cVal;
}

// ===================== CALCULO PRINCIPAL =====================
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   if(rates_total < 1)
      return 0;
   ArraySetAsSeries(time, false);
   return Calculate(rates_total, prev_calculated, time);
}

// Sem ticks (mercado parado) o historico dos outros tempos graficos pode terminar de
// carregar depois do ultimo calculo: o timer refaz o calculo nesse caso.
void OnTimer()
{
   if(!g_forceFull || g_ratesTotal < 1 || Bars(_Symbol, _Period) != g_ratesTotal)
      return;
   datetime t[];
   if(CopyTime(_Symbol, _Period, 0, g_ratesTotal, t) != g_ratesTotal)
      return;
   Calculate(g_ratesTotal, 0, t);
   ChartRedraw();
}

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id == CHARTEVENT_CHART_CHANGE)
   {
      LayoutHeader();
      ChartRedraw();
   }
}

int Calculate(const int rates_total, const int prev_calculated, const datetime &time[])
{
   int  last       = rates_total - 1;
   int  limitStart = (InpMaxBars > 0 && rates_total > InpMaxBars) ? rates_total - InpMaxBars : 0;
   bool full       = prev_calculated <= 0 || prev_calculated > rates_total ||
                     prev_calculated - 1 < limitStart || g_forceFull;
   int  start      = full ? limitStart : prev_calculated - 1;
   g_forceFull = false;

   // ---------- linhas ----------
   for(int k = 0; k < TF_COUNT; k++)
   {
      if(full)
         ArrayInitialize(g_line[k].v, EMPTY_VALUE);
      if(g_show[k])
         CalcLine(k, time, rates_total, start, limitStart);
      else
         for(int i = start; i < rates_total; i++)
            g_line[k].v[i] = EMPTY_VALUE;
   }

   // ---------- valores atuais: cabecalho, alerta e painel ----------
   double   cur[TF_COUNT], pnl[TF_COUNT];
   bool     synced = true;
   datetime bt;
   for(int k = 0; k < TF_COUNT; k++)
   {
      bool forAlert = InpAlertOn && g_alertUse[k];
      cur[k] = (InpShowHeader || forAlert) ? SawAt(k, time, last, rates_total, g_len, InpPrice, bt) : EMPTY_VALUE;
      pnl[k] = InpPanelOn ? SawAt(k, time, last, rates_total, g_panelLen, PRICE_TYPICAL, bt) : EMPTY_VALUE;
      if((g_show[k] || InpShowHeader || InpPanelOn || forAlert) &&
         SeriesInfoInteger(_Symbol, g_tf[k], SERIES_SYNCHRONIZED) == 0)
         synced = false;
   }
   // historico de algum tempo grafico ainda carregando: recalcula tudo em seguida
   if(synced)
      g_retries = 0;
   else if(g_retries < MAX_RETRIES)
   {
      g_retries++;
      g_forceFull = true;
   }
   g_ratesTotal = rates_total;

   int win = ChartWindowFind();
   if(win != g_win)
   {
      ObjectsDeleteAll(0, g_prefix);
      g_win = win;
   }
   if(g_win >= 0)
   {
      if(InpShowHeader) DrawHeader(cur);
      if(InpPanelOn)    DrawPanel(pnl);
      if(InpShowHeader || InpPanelOn)
         ChartRedraw();
   }

   if(InpAlertOn)
      CheckAlert(cur, time[last]);
   return rates_total;
}

// ===================== TEXTOS =====================
string Fmt(const double v) { return v == EMPTY_VALUE ? "--" : DoubleToString(v, 1); }

string PeriodName(const ENUM_TIMEFRAMES p) { return StringSubstr(EnumToString(p), 7); } // "PERIOD_M5" -> "M5"

int TextWidth(const string s, const int fs, int &h)
{
   uint w = 0, hh = 0;
   TextSetFont(FONT_NAME, -fs * 10);
   if(!TextGetSize(s, w, hh) || w == 0)
   {
      w  = (uint)(StringLen(s) * fs);
      hh = (uint)(fs * 2);
   }
   h = (int)hh;
   return (int)w;
}

// Cria ou atualiza um rotulo de texto (x < 0 = mantem a posicao horizontal)
void SetLabel(const string name, const int win, const ENUM_BASE_CORNER corner, const ENUM_ANCHOR_POINT anchor,
              const int x, const int y, const string text, const color clr, const int fs)
{
   if(ObjectFind(0, name) < 0)
   {
      if(!ObjectCreate(0, name, OBJ_LABEL, win, 0, 0))
         return;
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_BACK, false);
      ObjectSetString (0, name, OBJPROP_FONT, FONT_NAME);
   }
   ObjectSetInteger(0, name, OBJPROP_CORNER, corner);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
   if(x >= 0)
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fs);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetString (0, name, OBJPROP_TEXT, text);
}

// ===================== CABECALHO =====================
color HeaderColor(const double v)
{
   if(v == EMPTY_VALUE) return InpHdrColor;
   if(v >=  g_level)    return InpHdrOver;
   if(v <= -g_level)    return InpHdrUnder;
   return InpHdrColor;
}

// "Saw Index(34)  (M1: 43.6)  (M5: -60.3) ..." - ordem M1 ... MN1
void DrawHeader(const double &cur[])
{
   int fs = (int)InpHdrSize;
   int y  = InpHdrY < 0 ? 0 : InpHdrY;
   SetLabel(g_prefix + "H0", g_win, CORNER_LEFT_UPPER, ANCHOR_LEFT_UPPER, -1, y,
            "Saw Index(" + IntegerToString(g_len) + ")", InpHdrColor, fs);
   for(int k = 0; k < TF_COUNT; k++)
      SetLabel(g_prefix + "H" + IntegerToString(k + 1), g_win, CORNER_LEFT_UPPER, ANCHOR_LEFT_UPPER, -1, y,
               "(" + g_tfName[k] + ": " + Fmt(cur[k]) + ")", HeaderColor(cur[k]), fs);
   LayoutHeader();
}

// Posiciona os textos do cabecalho lado a lado (esquerda, centro ou direita)
void LayoutHeader()
{
   if(!InpShowHeader || g_win < 0)
      return;
   int fs = (int)InpHdrSize, gap = 6, margin = 5, h = 0, total = 0;
   int w[TF_COUNT + 1];
   for(int c = 0; c <= TF_COUNT; c++)
   {
      string name = g_prefix + "H" + IntegerToString(c);
      if(ObjectFind(0, name) < 0)
         return;
      w[c]   = TextWidth(ObjectGetString(0, name, OBJPROP_TEXT), fs, h);
      total += w[c] + (c > 0 ? gap : 0);
   }
   int cw = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int x  = margin;
   if(InpHdrPos == HDR_CENTER)     x = (cw - total) / 2;
   else if(InpHdrPos == HDR_RIGHT) x = cw - total - margin;
   if(x < 0) x = 0;
   for(int c = 0; c <= TF_COUNT; c++)
   {
      ObjectSetInteger(0, g_prefix + "H" + IntegerToString(c), OBJPROP_XDISTANCE, x);
      x += w[c] + gap;
   }
}

// ===================== PAINEL DE NIVEIS =====================
color PanelColor(const double v)
{
   if(v == EMPTY_VALUE)     return InpPanelColor;
   if(v <= -g_panelLevel)   return InpPanelUnder;
   if(v >=  g_panelLevel)   return InpPanelOver;
   return InpPanelColor;
}

// ordem do painel: MN1 (topo) ... M1, depois MEDIA e MEDIA 2 (embaixo)
void DrawPanel(const double &val[])
{
   int    fs  = (int)InpPanelSize;
   int    win = InpPanelWin == PANEL_MAIN ? 0 : g_win;
   string names[TF_COUNT + 2], vals[TF_COUNT + 2];
   color  vclr[TF_COUNT + 2];
   int    rows = 0, cnt1 = 0, cnt2 = 0;
   double sum1 = 0.0, sum2 = 0.0;

   for(int k = TF_COUNT - 1; k >= 0; k--)
   {
      double v    = val[k];
      names[rows] = g_tfName[k];
      vals[rows]  = Fmt(v);
      vclr[rows]  = PanelColor(v);
      rows++;
      if(v != EMPTY_VALUE)
      {
         sum1 += v;
         cnt1++;
         if(g_media2Use[k])
         {
            sum2 += v;
            cnt2++;
         }
      }
   }
   if(InpMediaOn)
   {
      double m1   = cnt1 > 0 ? sum1 / cnt1 : EMPTY_VALUE;
      names[rows] = InpMediaLabel;
      vals[rows]  = Fmt(m1);
      vclr[rows]  = PanelColor(m1);
      rows++;
   }
   if(InpMedia2On)
   {
      double m2   = cnt2 > 0 ? sum2 / cnt2 : EMPTY_VALUE;
      names[rows] = InpMedia2Label;
      vals[rows]  = Fmt(m2);
      vclr[rows]  = PanelColor(m2);
      rows++;
   }

   // coluna dos nomes alinhada a esquerda, coluna dos valores alinhada a direita
   int nameW = 0, valW = 0, h = 0, margin = 6, gap = 12;
   for(int r = 0; r < rows; r++)
   {
      int wn = TextWidth(names[r], fs, h);
      int wv = TextWidth(vals[r], fs, h);
      if(wn > nameW) nameW = wn;
      if(wv > valW)  valW  = wv;
   }
   int lineH = h + 3;
   for(int r = 0; r < rows; r++)
   {
      int y = margin + (rows - 1 - r) * lineH;
      SetLabel(g_prefix + "PN" + IntegerToString(r), win, CORNER_RIGHT_LOWER, ANCHOR_LEFT_LOWER,
               margin + valW + gap + nameW, y, names[r], InpPanelColor, fs);
      SetLabel(g_prefix + "PV" + IntegerToString(r), win, CORNER_RIGHT_LOWER, ANCHOR_RIGHT_LOWER,
               margin, y, vals[r], vclr[r], fs);
   }
}

// ===================== ALERTA DE COMPRA E VENDA =====================
// VENDA : TODOS os tempos graficos marcados com nivel >= +nivel
// COMPRA: TODOS os tempos graficos marcados com nivel <= -nivel
void CheckAlert(const double &cur[], const datetime barTime)
{
   bool   anySel  = false;
   bool   allHigh = true;
   bool   allLow  = true;
   string det     = "";
   for(int k = 0; k < TF_COUNT; k++)
   {
      if(!g_alertUse[k])
         continue;
      anySel = true;
      double v = cur[k];
      if(v == EMPTY_VALUE)
      {
         allHigh = false;
         allLow  = false;
      }
      else
      {
         if(v < g_level)  allHigh = false;
         if(v > -g_level) allLow  = false;
         det += "(" + g_tfName[k] + ": " + Fmt(v) + ") ";
      }
   }
   // no maximo um alerta por candle
   if(!anySel || !(allHigh || allLow) || barTime == g_lastAlert)
      return;
   g_lastAlert = barTime;

   string side = allHigh ? "VENDA" : "COMPRA";
   string rule = allHigh ? "nivel >= +" : "nivel <= -";
   string msg  = "Saw Index(" + IntegerToString(g_len) + ") - " + side + " - " + _Symbol + " " +
                 PeriodName(_Period) + ": " + det + rule + DoubleToString(g_level, 0);
   if(InpAlPopup)
      Alert(msg);
   if(InpAlPush && !SendNotification(msg))
      Print("Saw Index: falha ao enviar a notificacao push (erro ", GetLastError(), ")");
   if(InpAlMail && !SendMail("Saw Index - " + side + " - " + _Symbol, msg))
      Print("Saw Index: falha ao enviar o e-mail (erro ", GetLastError(), ")");
}
//+------------------------------------------------------------------+
