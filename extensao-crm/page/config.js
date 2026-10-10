// Roda no contexto da página, antes da biblioteca wa-js.
// Desliga o Google Analytics da biblioteca e não renomeia o aparelho conectado.
window.WPPConfig = {
  deviceName: false,
  disableGoogleAnalytics: true,
  googleAnalyticsId: null,
  poweredBy: null,
  sendStatusToDevice: false,
};
