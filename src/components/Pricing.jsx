import React from 'react';
import { Smartphone, Tv, Check, Zap, Play } from 'lucide-react';
import './Pricing.css';

const AndroidIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414C17.0621 15.3414 16.6917 14.9711 16.6917 14.5101C16.6917 14.0492 17.0621 13.6788 17.523 13.6788C17.984 13.6788 18.3543 14.0492 18.3543 14.5101C18.3543 14.9711 17.984 15.3414 17.523 15.3414ZM6.47702 15.3414C6.01605 15.3414 5.64572 14.9711 5.64572 14.5101C5.64572 14.0492 6.01605 13.6788 6.47702 13.6788C6.93798 13.6788 7.30831 14.0492 7.30831 14.5101C7.30831 14.9711 6.93798 15.3414 6.47702 15.3414ZM17.893 10.3344L19.5759 7.42013C19.7042 7.19793 19.628 6.91353 19.4058 6.78523C19.1836 6.65693 18.8992 6.73308 18.7709 6.95528L17.0543 9.92843C15.6171 9.27113 13.9011 8.89733 12 8.89733C10.0989 8.89733 8.38287 9.27113 6.94572 9.92843L5.22913 6.95528C5.10082 6.73308 4.81643 6.65693 4.59422 6.78523C4.37202 6.91353 4.29587 7.19793 4.42417 7.42013L6.10702 10.3344C3.06015 11.9754 1.0044 15.1114 1.0044 18.7562H22.9956C22.9956 15.1114 20.9399 11.9754 17.893 10.3344Z"/>
  </svg>
);

const PricingCard = ({ title, icon: Icon, features, price, subtitle, isHighlight, isAndroid }) => {
  return (
    <div className={`pricing-card ${isHighlight ? 'highlight' : ''}`}>
      {isHighlight && <div className="popular-badge">Mais Popular</div>}
      <div className="pricing-icon">
        {isAndroid ? <AndroidIcon /> : <Icon size={40} />}
      </div>
      <h3 className="pricing-title">{title}</h3>
      <p className="pricing-subtitle">{subtitle}</p>
      
      <div className="price-container">
        <span className="price-currency">R$</span>
        <span className="price-value">{price}</span>
        <span className="price-period">/mês</span>
      </div>
      <p className="price-info">Menos de R$ 1,17 por dia</p>

      <ul className="pricing-features">
        {features.map((feature, index) => (
          <li key={index}>
            <Check size={18} className="check-icon" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a 
        href="https://wa.me/+554791391083?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20teste%20gratuito%20agora%20mesmo." 
        className="btn-pricing"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Play size={20} fill="currentColor" />
        Testar agora mesmo
      </a>
      
      <div className="card-decoration"></div>
    </div>
  );
};

const Pricing = () => {
  const androidFeatures = [
    "Sistemas Android & aparelhos portáteis",
    "Apps de várias marcas",
    "Instalação Instantânea",
    "Multi-dispositivos",
    "Qualidade 4K Ultra HD",
    "Suporte Especializado"
  ];

  const nativeFeatures = [
    "Smart TVs Samsung & LG",
    "Dispositivos Roku",
    "Sistemas Nativos",
    "Interface Simplificada",
    "Qualidade Premium 4K",
    "Atualizações Automáticas"
  ];

  return (
    <section className="pricing-section" id="mensalidade">
      <div className="pricing-container">
        <div className="pricing-header">
          <div className="pricing-badge">
            <Zap size={14} />
            <span>Melhor Custo-Benefício</span>
          </div>
          <h2 className="pricing-section-title">Escolha seu Plano</h2>
          <p className="pricing-section-subtitle">
            Tenha acesso ao melhor conteúdo do mundo por um valor que cabe no seu bolso.
          </p>
          <div className="pricing-free-trial">
            <Zap size={18} />
            <p>Você pode solicitar um teste gratuito. Basta entrar em contato e pedir seu teste antes de realizar a compra.</p>
          </div>
        </div>

        <div className="pricing-grid">
          <PricingCard 
            title="Sistemas Android"
            subtitle="Ideal para celulares, tablets e aparelhos Android portáteis de todas as marcas."
            price="35"
            features={androidFeatures}
            isHighlight={true}
            isAndroid={true}
          />
          <PricingCard 
            title="Sistemas Nativos"
            icon={Tv}
            subtitle="Perfeito para Smart TVs Samsung, LG e dispositivos Roku."
            price="35"
            features={nativeFeatures}
          />
        </div>
      </div>
    </section>
  );
};

export default Pricing;

