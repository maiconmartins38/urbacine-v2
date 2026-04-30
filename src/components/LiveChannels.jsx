import React from 'react';
import './LiveChannels.css';

const brands = [
  { 
    name: 'Samsung', 
    subtitle: 'Smart TV', 
    color: '#1428a0',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/1024px-Samsung_Logo.svg.png'
  },
  { 
    name: 'LG', 
    subtitle: 'Smart TV', 
    color: '#a50034',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/LG_logo_%282015%29.svg/1024px-LG_logo_%282015%29.svg.png'
  }
];

const LiveChannels = () => {
  return (
    <section className="live-channels-section">
      <div className="live-channels-header">
        <h2 className="live-title">Compatível com Smart TVs</h2>
        <p className="live-subtitle">Instale diretamente na sua Smart TV Samsung ou LG e aproveite a melhor experiência em tela grande.</p>
      </div>

      <div className="channels-grid-wrapper">
        <div className="brands-grid">
          {brands.map((brand, index) => (
            <div key={index} className="brand-card">
              <div className="brand-logo-container" style={{ '--accent-color': brand.color }}>
                <div className="brand-logo-placeholder">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    className="brand-official-logo"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              <div className="brand-info">
                <span className="brand-name">{brand.name}</span>
                <span className="brand-subtitle">{brand.subtitle}</span>
              </div>
            </div>
          ))}
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
