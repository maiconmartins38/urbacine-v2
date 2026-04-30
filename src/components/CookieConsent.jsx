import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

const CookieConsent = ({ onOpenPrivacy }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('urbacine-cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000); // Mostra após 2 segundos
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('urbacine-cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="cookie-consent-bar">
      <div className="cookie-container">
        <div className="cookie-text">
          <p>
            Valorizamos sua privacidade. Utilizamos cookies para otimizar sua experiência e analisar o tráfego do site. 
            Ao continuar, você concorda com nossos termos e 
            <button className="privacy-link-btn" onClick={onOpenPrivacy}> Política de Privacidade</button>.
          </p>
        </div>
        <div className="cookie-actions">
          <button onClick={accept} className="btn-accept-cookies">Aceitar Tudo</button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
