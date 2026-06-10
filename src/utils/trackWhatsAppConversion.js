/**
 * Dispara o evento de conversão do Google Ads ao clicar em links do WhatsApp.
 * ID de conversão: AW-16527559041/BrI6CMHhy7wcEIGT-sg9
 */
export function trackWhatsAppConversion() {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-16527559041/BrI6CMHhy7wcEIGT-sg9',
      'value': 1.0,
      'currency': 'BRL'
    });
  }
}
