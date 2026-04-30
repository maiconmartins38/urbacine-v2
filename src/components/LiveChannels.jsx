import React from 'react';
import './LiveChannels.css';

const LiveChannels = () => {
  return (
    <section className="live-channels-section">
      <div className="live-channels-header">
        <h2 className="live-title">Compatível com Smart TVs</h2>
        <p className="live-subtitle">Instale diretamente na sua Smart TV Samsung ou LG e aproveite a melhor experiência em tela grande.</p>
      </div>

      <div className="channels-grid-wrapper">
        <div className="brands-grid">
          
          {/* Samsung Card */}
          <div className="brand-card">
            <div className="brand-logo-container" style={{ '--accent-color': '#1428a0' }}>
              <div className="brand-logo-placeholder">
                <svg className="brand-svg-logo" viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg">
                  <text x="300" y="72" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="80" fontWeight="700" letterSpacing="12" fill="#1428a0">
                    SAMSUNG
                  </text>
                </svg>
              </div>
            </div>
            <div className="brand-info">
              <span className="brand-name">Samsung</span>
              <span className="brand-subtitle">Smart TV</span>
            </div>
          </div>

          {/* LG Card */}
          <div className="brand-card">
            <div className="brand-logo-container" style={{ '--accent-color': '#a50034' }}>
              <div className="brand-logo-placeholder">
                <svg className="brand-svg-logo" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  {/* Círculo externo */}
                  <circle cx="100" cy="100" r="88" fill="none" stroke="#a50034" strokeWidth="8"/>
                  {/* L shape */}
                  <rect x="68" y="50" width="14" height="70" rx="2" fill="#a50034"/>
                  <rect x="68" y="106" width="42" height="14" rx="2" fill="#a50034"/>
                  {/* Nariz (bolinha) */}
                  <circle cx="110" cy="70" r="10" fill="#a50034"/>
                  {/* G shape - arco */}
                  <path d="M 126 86 A 34 34 0 1 1 94 140" fill="none" stroke="#a50034" strokeWidth="12" strokeLinecap="round"/>
                  {/* Texto LG abaixo */}
                  <text x="100" y="185" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="36" fontWeight="900" fill="#a50034">
                    LG
                  </text>
                </svg>
              </div>
            </div>
            <div className="brand-info">
              <span className="brand-name">LG</span>
              <span className="brand-subtitle">Smart TV</span>
            </div>
          </div>

        </div>
      </div>
      
      <div className="live-cta-container">
        <a 
          href="https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20um%20teste%20no%20aplicativo." 
          className="btn-live-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Solicitar Instalação
        </a>
      </div>
    </section>
  );
};

export default LiveChannels;
