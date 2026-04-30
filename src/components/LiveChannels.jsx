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
                <svg width="240" height="120" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg">
                  {/* Elipse Samsung oficial */}
                  <ellipse cx="120" cy="60" rx="118" ry="58" fill="#1428a0" />
                  {/* Texto Samsung aproximado com fonte bold */}
                  <text x="50%" y="68" textAnchor="middle" fontFamily="Arial Black, Helvetica, sans-serif" fontSize="34" fontWeight="900" fill="white" style={{ letterSpacing: '-1.5px' }}>
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
                <svg width="140" height="140" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  {/* Círculo Vermelho LG */}
                  <circle cx="100" cy="100" r="95" fill="#a50034" />
                  {/* Face Branca (Smiley) */}
                  <g fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                    {/* Contorno do G */}
                    <path d="M145,100 a45,45 0 1,1 -15,-33" />
                    {/* L shape */}
                    <path d="M75,60 v65 h35" />
                    {/* O ponto (nariz/olho) */}
                    <circle cx="115" cy="85" r="3" fill="white" stroke="none" />
                  </g>
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
          Teste agora mesmo
        </a>
      </div>
    </section>
  );
};

export default LiveChannels;
