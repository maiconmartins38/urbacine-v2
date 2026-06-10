import React from 'react';
import { Play, Send, MessageCircle } from 'lucide-react';
import './Footer.css';

const Footer = ({ onOpenPrivacy, scrollToSection }) => {
  const whatsappUrl = "https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20suporte.";

  return (
    <footer className="footer-v2">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="play-icon-container">
              <Play size={16} fill="white" />
            </div>
            <h2 className="logo-text">URBA <span>CINE</span></h2>
          </div>
          <p className="brand-description">
            A melhor solução de streaming do mercado, qualidade, estabilidade e o melhor preço de entrega e qualidade.
          </p>
          <div className="social-icons">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Contato via WhatsApp">
              <MessageCircle size={20} />
            </a>
            <a href="#" className="social-btn" aria-label="Siga-nos no Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" className="social-btn" aria-label="Canal no Telegram">
              <Send size={20} />
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Navegação</h3>
          <ul>
            <li><button className="footer-link-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Início</button></li>
            <li><button className="footer-link-btn" onClick={() => scrollToSection('recursos')}>Recursos</button></li>
            <li><button className="footer-link-btn" onClick={() => scrollToSection('mensalidade')}>Planos</button></li>
            <li><button className="footer-link-btn" onClick={() => scrollToSection('faq')}>Dúvidas</button></li>
            <li><button className="footer-link-btn" onClick={onOpenPrivacy}>Política de Privacidade</button></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Suporte</h3>
          <ul>
            <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Área do Cliente</a></li>
            <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Tutorial de Instalação</a></li>
            <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Teste Grátis</a></li>
            <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Contato</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

