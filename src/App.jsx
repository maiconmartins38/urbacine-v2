import React, { useState, useEffect, Suspense, lazy } from 'react';
import Hero from './components/Hero';
import { tmdbApi } from './services/tmdb';
import { Menu, Play, X } from 'lucide-react';
import './App.css';

// Lazy loading components that are not visible on initial load
const MovieRow = lazy(() => import('./components/MovieRow'));
const LiveChannels = lazy(() => import('./components/LiveChannels'));
const FAQ = lazy(() => import('./components/FAQ'));
const Features = lazy(() => import('./components/Features'));
const Pricing = lazy(() => import('./components/Pricing'));
const Footer = lazy(() => import('./components/Footer'));
const WhatsAppButton = lazy(() => import('./components/WhatsAppButton'));
const PrivacyModal = lazy(() => import('./components/PrivacyModal'));
const CookieConsent = lazy(() => import('./components/CookieConsent'));

const Header = ({ scrollToSection }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = !isMenuOpen ? 'hidden' : 'unset';
  };

  const handleNavClick = (section) => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
    if (section === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToSection(section);
    }
  };

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <div className="header-left">
            <a href="/" className="logo-link" aria-label="UrbaCine Início">
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
              <li className="active" onClick={() => handleNavClick('top')} style={{ cursor: 'pointer' }}>Início</li>
              <li onClick={() => handleNavClick('recursos')} style={{ cursor: 'pointer' }}>Recursos</li>
              <li onClick={() => handleNavClick('mensalidade')} style={{ cursor: 'pointer' }}>Mensalidade</li>
              <li onClick={() => handleNavClick('faq')} style={{ cursor: 'pointer' }}>Dúvidas</li>
            </ul>
          </nav>

          <div className="header-right">
            <a 
              href="https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20um%20teste%20no%20aplicativo." 
              className="btn-cta"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pedir teste pelo WhatsApp"
            >
              Teste agora mesmo.
            </a>
            <button 
              className="mobile-toggle" 
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          <ul>
            <li onClick={() => handleNavClick('top')}>Início</li>
            <li onClick={() => handleNavClick('recursos')}>Recursos</li>
            <li onClick={() => handleNavClick('mensalidade')}>Mensalidade</li>
            <li onClick={() => handleNavClick('faq')}>Dúvidas</li>
          </ul>
          <div className="mobile-menu-footer">
            <a 
              href="https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20um%20teste%20no%20aplicativo." 
              className="btn-cta-mobile"
              target="_blank"
              rel="noopener noreferrer"
            >
              Teste agora mesmo
            </a>
          </div>
        </nav>
      </div>
    </>
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
      <Header scrollToSection={scrollToSection} />
      <main>
        <Hero scrollToSection={scrollToSection} />
        
        <Suspense fallback={<div className="section-loader" />}>
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
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer onOpenPrivacy={openPrivacyModal} scrollToSection={scrollToSection} />
        <WhatsAppButton />
        <CookieConsent onOpenPrivacy={openPrivacyModal} />
        <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      </Suspense>
    </div>
  );
}

export default App;




