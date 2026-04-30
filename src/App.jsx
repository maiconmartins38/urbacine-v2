import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import { tmdbApi } from './services/tmdb';
import { Menu, Play } from 'lucide-react';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import PrivacyModal from './components/PrivacyModal';
import CookieConsent from './components/CookieConsent';
import LiveChannels from './components/LiveChannels';
import FAQ from './components/FAQ';
import Features from './components/Features';
import Pricing from './components/Pricing';
import './App.css';

const Header = ({ onOpenPrivacy, scrollToSection }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-inner">
        <div className="header-left">
          <a href="/" className="logo-link">
            <div className="logo-container">
              <div className="logo-icon">
                <Play size={16} fill="var(--netflix-red)" color="var(--netflix-red)" />
              </div>
              <h2 className="logo">URBA <span>CINE</span></h2>
            </div>
          </a>
        </div>

        <nav className="desktop-nav">
          <ul>
            <li className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Início</li>
            <li onClick={() => scrollToSection('recursos')} style={{ cursor: 'pointer' }}>Recursos</li>
            <li onClick={() => scrollToSection('mensalidade')} style={{ cursor: 'pointer' }}>Mensalidade</li>
            <li onClick={() => scrollToSection('faq')} style={{ cursor: 'pointer' }}>Dúvidas</li>
          </ul>
        </nav>

        <div className="header-right">
          <a 
            href="https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20um%20teste%20no%20aplicativo." 
            className="btn-cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            Teste agora mesmo.
          </a>
          <Menu size={24} className="mobile-menu-icon" />
        </div>
      </div>
    </header>
  );
};

function App() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const openPrivacyModal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsPrivacyModalOpen(true);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="app">
      <Header onOpenPrivacy={openPrivacyModal} scrollToSection={scrollToSection} />
      <main>
        <Hero scrollToSection={scrollToSection} />
        
        <div className="content-rows">
          <MovieRow title="Conteúdos sempre atualizados" fetchFn={tmdbApi.getTrending} />
          <MovieRow title="Categorias como você nunca viu" fetchFn={tmdbApi.getNowPlaying} />
          <MovieRow title="Séries de Sucesso" fetchFn={tmdbApi.getSeries} />
          <MovieRow title="Mais Votados" fetchFn={tmdbApi.getTopRated} />
          <MovieRow title="Tops em alta" fetchFn={tmdbApi.getUpcoming} />
        </div>

        <LiveChannels />
        <FAQ />
        <Features />
        <Pricing />
      </main>

      <Footer onOpenPrivacy={openPrivacyModal} scrollToSection={scrollToSection} />
      <WhatsAppButton />
      <CookieConsent onOpenPrivacy={openPrivacyModal} />
      <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
}

export default App;



