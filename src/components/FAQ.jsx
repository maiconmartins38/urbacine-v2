import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import './FAQ.css';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setIsOpen(!isOpen)}>
        <span>{question}</span>
        <div className="faq-icon-wrapper">
          <ChevronDown size={20} />
        </div>
      </button>
      <div className="faq-answer">
        <div className="faq-answer-content">
          {answer}
        </div>
      </div>
    </div>
  );
};

const FAQ = () => {
  const faqs = [
    {
      question: "Como funciona o acesso?",
      answer: "Você entra em contato pelo WhatsApp e o atendente irá te atender. Você informa qual é o aparelho em que deseja instalar. Ele irá disponibilizar o modo de instalação. Após confirmar que o aplicativo foi instalado, você receberá um acesso de teste temporário. Você irá inserir os dados, testar e, se gostar, poderá realizar o pagamento pelo mesmo chat, no WhatsApp. Após enviar o comprovante, serão adicionados 30 dias no seu aplicativo."
    },
    {
      question: "Preciso de uma internet rápida?",
      answer: "Você precisa ter uma internet de, no mínimo, 100 megabytes e possuir um ping entre 3 e 15 ms. Em TVs, recomenda-se o uso de cabo de rede, se necessário."
    },
    {
      question: "Posso cancelar quando quiser?",
      answer: "Sim, trabalhamos sem contrato de fidelidade, no modelo pré-pago. Você paga por 30 dias de acesso, que expiram após esse período. Antes do vencimento, você recebe um lembrete via WhatsApp, onde será cadastrado como nosso cliente, e então decide se deseja renovar ou não."
    }
  ];

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        <div className="faq-header">
          <div className="faq-badge">
            <HelpCircle size={14} />
            <span>Dúvidas Frequentes</span>
          </div>
          <h2 className="faq-title">Perguntas Frequentes</h2>
          <p className="faq-subtitle">
            Tudo o que você precisa saber sobre o nosso serviço de streaming premium.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
