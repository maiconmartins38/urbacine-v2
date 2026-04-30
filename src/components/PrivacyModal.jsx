import React from 'react';
import { X, ShieldCheck, Lock, EyeOff } from 'lucide-react';
import './PrivacyModal.css';

const PrivacyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-container" onClick={e => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="header-title-wrapper">
            <ShieldCheck className="shield-icon" size={24} />
            <h2>Política de Privacidade</h2>
          </div>
          <button className="privacy-close-btn" onClick={onClose} aria-label="Fechar">
            <X size={24} />
          </button>
        </div>
        
        <div className="privacy-modal-body">
          <p className="last-update">Última atualização: 30 de Abril de 2026</p>
          
          <section>
            <h3><Lock size={18} /> Compromisso com sua Segurança</h3>
            <p>
              Na <strong>URBACINE</strong>, a privacidade e a segurança dos seus dados são prioridades fundamentais. 
              Esta política descreve como coletamos, usamos e protegemos suas informações em total conformidade com a 
              <strong> Lei Geral de Proteção de Dados (LGPD)</strong>.
            </p>
          </section>

          <section>
            <h3><EyeOff size={18} /> Coleta de Informações</h3>
            <p>
              Coletamos apenas as informações estritamente necessárias para o funcionamento do serviço:
            </p>
            <ul>
              <li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador e páginas visitadas para fins estatísticos e de segurança.</li>
              <li><strong>Dados de Contato:</strong> Caso você entre em contato via WhatsApp, seu número de telefone será utilizado exclusivamente para o atendimento solicitado.</li>
            </ul>
          </section>

          <section>
            <h3>3. Uso dos Cookies</h3>
            <p>
              Utilizamos cookies para personalizar sua experiência, lembrar suas preferências e analisar o desempenho do site. 
              Você pode gerenciar as configurações de cookies diretamente no seu navegador.
            </p>
          </section>

          <section>
            <h3>4. Compartilhamento de Dados</h3>
            <p>
              Não vendemos, trocamos ou transferimos seus dados pessoais para terceiros. Seus dados são mantidos sob 
              estrito sigilo dentro da nossa infraestrutura.
            </p>
          </section>

          <section>
            <h3>5. Seus Direitos</h3>
            <p>
              Como titular dos dados, você tem o direito de solicitar a qualquer momento o acesso, a correção ou a 
              exclusão definitiva de seus dados de nossa base de dados.
            </p>
          </section>

          <section className="legal-footer">
            <p>Ao utilizar nossos serviços, você concorda com os termos desta política.</p>
          </section>
        </div>

        <div className="privacy-modal-footer">
          <button className="btn-confirm-privacy" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
