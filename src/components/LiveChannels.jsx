import React from 'react';
import { Radio } from 'lucide-react';
import './LiveChannels.css';

const channels = [
  { name: 'SporTV', category: 'Esportes', color: '#0055ff', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/SporTV_2021.png', light: true },
  { name: 'ESPN', category: 'Esportes', color: '#ff0000', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg' },
  { name: 'Premiere', category: 'Futebol', color: '#ffcc00', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Premiere_%282017%29_logo.png' },
  { name: 'Combate', category: 'Lutas', color: '#cc0000', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Combate_logo.svg' },
  { name: 'HBO', category: 'Filmes', color: '#ffffff', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/de/HBO_logo.svg', light: true },
  { name: 'Telecine', category: 'Filmes', color: '#ff4444', textLogo: 'TELECINE', textColor: '#fff' },
  { name: 'Fox Sports', category: 'Esportes', color: '#ff6600', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/FOX_Sports_logo.svg' },
  { name: 'Discovery', category: 'Documentários', color: '#0099cc', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/2019_Discovery_logo.svg', light: true },
  { name: 'Globo', category: 'Variedades', color: '#00aaff', textLogo: 'GLOBO', textColor: '#fff' },
  { name: 'Band', category: 'Variedades', color: '#2255ff', textLogo: 'BAND', textColor: '#fff' },
  { name: 'Record', category: 'Variedades', color: '#00cc44', textLogo: 'RECORD', textColor: '#00cc44' },
  { name: 'TNT', category: 'Filmes', color: '#ffcc00', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/TNT_Logo_2016.svg', light: true },
  { name: 'Multishow', category: 'Entretenimento', color: '#ff00cc', textLogo: 'MULTI\nSHOW', textColor: '#ff00cc' },
  { name: 'GloboNews', category: 'Notícias', color: '#ff3333', textLogo: 'GLOBO\nNEWS', textColor: '#ff3333' },
  { name: 'Nat Geo', category: 'Documentários', color: '#ffcc00', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg' }
];

const LiveChannels = () => {
  return (
    <section className="live-channels-section">
      <div className="live-channels-header">
        <h2 className="live-title">E temos também o conteúdo ao vivo</h2>
        <p className="live-subtitle">A maior grade de esportes, filmes e entretenimento em tempo real.</p>
      </div>

      <div className="channels-grid-wrapper">
        <div className="channels-grid">
          {channels.map((channel, index) => (
            <div key={index} className="channel-card">
              <div className="channel-logo-container" style={{ '--accent-color': channel.color }}>
                <div className="live-indicator">
                  <div className="pulse-dot"></div>
                  <span>AO VIVO</span>
                </div>
                <div className="channel-logo-placeholder">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name} 
                      className={`channel-official-logo ${channel.light ? 'logo-light' : ''}`} 
                    />
                  ) : (
                    <span 
                      className="channel-text-logo" 
                      style={{ color: channel.textColor || '#fff' }}
                    >
                      {channel.textLogo}
                    </span>
                  )}
                </div>
              </div>
              <div className="channel-info">
                <span className="channel-cat">{channel.category}</span>
                <div className="channel-progress">
                  <div className="progress-bar"></div>
                </div>
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
          Experimentar ao Vivo
        </a>
      </div>
    </section>
  );
};

export default LiveChannels;
