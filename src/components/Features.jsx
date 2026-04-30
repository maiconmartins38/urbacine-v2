import React from 'react';
import { Monitor, Clock, Headphones, Zap, ShieldCheck, Smartphone } from 'lucide-react';
import './Features.css';

const FeatureCard = ({ icon: Icon, title, description, delay }) => {
  return (
    <div className="feature-card" style={{ '--delay': delay }}>
      <div className="feature-icon-container">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-description">{description}</p>
      <div className="feature-card-glow"></div>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      icon: Monitor,
      title: "Compatibilidade Total",
      description: "Trabalhamos com todos os sistemas Android e sistemas nativos. Sua diversão sem fronteiras."
    },
    {
      icon: Clock,
      title: "Renovação Facilitada",
      description: "Trabalhamos com sistema de renovação com horário estendido para você nunca ficar sem sinal."
    },
    {
      icon: Headphones,
      title: "Suporte Especializado",
      description: "Conte com suporte com horário estendido. Estamos aqui para garantir sua melhor experiência."
    },
    {
      icon: Zap,
      title: "Facilidade no Acesso",
      description: "Tutoriais de instalação e atendimento ultra rápido via WhatsApp. Simples, prático e direto."
    }
  ];

  return (
    <section className="features-section" id="recursos">
      <div className="features-container">
        <div className="features-header">
          <div className="features-badge">
            <ShieldCheck size={14} />
            <span>Diferenciais Premium</span>
          </div>
          <h2 className="features-title">Recursos Exclusivos</h2>
          <p className="features-subtitle">
            Tecnologia de ponta e suporte humanizado para você aproveitar o melhor do streaming.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              icon={feature.icon} 
              title={feature.title} 
              description={feature.description}
              delay={`${index * 0.1}s`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
