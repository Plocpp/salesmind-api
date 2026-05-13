/**
 * Módulo NFC-e - Nota Fiscal de Consumidor Eletrônica
 * Emissão, cancelamento e consulta de notas fiscais eletrônicas
 */

import {
    AlertCircle, CheckCircle,
    Clock, Download,
    FileText,
    RotateCcw,
    Search,
    Settings,
    Trash2
} from 'lucide-react';
import { useState } from 'react';

type NFCeModule = 'emitir' | 'consultar' | 'cancelar' | 'historico' | 'danfe' | 'inutilizar' | 'configuracoes' | 'status';

interface NFCeDocument {
  id: string;
  numero: string;
  serie: string;
  data: string;
  cliente: string;
  valor: number;
  status: 'AUTORIZADO' | 'CANCELADO' | 'REJEITADO' | 'PROCESSANDO';
  protocolo?: string;
}

const mockDocuments: NFCeDocument[] = [
  { id: '1', numero: '000001', serie: '1', data: '2026-05-12', cliente: 'Consumidor Final', valor: 150.50, status: 'AUTORIZADO', protocolo: '123456789012345' },
  { id: '2', numero: '000002', serie: '1', data: '2026-05-12', cliente: 'João Silva', valor: 320.00, status: 'AUTORIZADO', protocolo: '123456789012346' },
  { id: '3', numero: '000003', serie: '1', data: '2026-05-11', cliente: 'Maria Santos', valor: 89.90, status: 'CANCELADO' },
];

const styles = {
  container: { padding: '24px', background: '#eef3f5', minHeight: '100vh' },
  panel: { background: '#fff', border: '1px solid #d9e2e1', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  header: { fontSize: '24px', fontWeight: 'bold', color: '#243332', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#647674', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' },
  card: { 
    background: '#f8faf9', padding: '14px', borderRadius: '6px', 
    border: '1px solid #d9e2e1', cursor: 'pointer',
    transition: 'all 0.2s'
  },
  button: {
    padding: '8px 16px', borderRadius: '6px', border: 'none',
    cursor: 'pointer', fontSize: '13px', fontWeight: 600
  },
  buttonPrimary: {
    background: '#2f6f73', color: '#fff'
  },
  buttonSecondary: {
    background: '#e1eeee', color: '#2f6f73'
  },
  badge: (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      AUTORIZADO: { bg: '#d4edda', text: '#155724' },
      CANCELADO: { bg: '#f8d7da', text: '#721c24' },
      REJEITADO: { bg: '#f8d7da', text: '#721c24' },
      PROCESSANDO: { bg: '#fff3cd', text: '#856404' },
    };
    const color = colors[status] || colors.PROCESSANDO;
    return { 
      background: color.bg, 
      color: color.text,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      display: 'inline-block'
    };
  },
  input: { 
    width: '100%', padding: '8px 12px', border: '1px solid #d9e2e1',
    borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f4f7f7', padding: '10px', textAlign: 'left', fontWeight: 'bold', color: '#243332', borderBottom: '2px solid #d9e2e1' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
};

export default function NFCe() {
  const [activeModule, setActiveModule] = useState<NFCeModule>('emitir');
  const [documents, setDocuments] = useState<NFCeDocument[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ cliente: '', valor: '', obs: '' });

  const modules: Array<{ id: NFCeModule; label: string; icon: any; color: string }> = [
    { id: 'emitir', label: 'Emitir NFC-e', icon: FileText, color: '#2f6f73' },
    { id: 'consultar', label: 'Consultar', icon: Search, color: '#54736b' },
    { id: 'cancelar', label: 'Cancelar', icon: Trash2, color: '#a64b4b' },
    { id: 'historico', label: 'Histórico', icon: Clock, color: '#9a6a2f' },
    { id: 'danfe', label: 'DANFE', icon: Download, color: '#6c8f7d' },
    { id: 'inutilizar', label: 'Inutilizar', icon: RotateCcw, color: '#8a9b99' },
    { id: 'configuracoes', label: 'Config.', icon: Settings, color: '#5a7a72' },
    { id: 'status', label: 'Status SEFAZ', icon: AlertCircle, color: '#7a8a84' },
  ];

  const renderEmitir = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>📝 Emitir Nova NFC-e</h2>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#243332' }}>
            Cliente (Opcional)
          </label>
          <input 
            value={formData.cliente}
            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            placeholder="Nome ou CPF/CNPJ"
            style={styles.input}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#243332' }}>
            Valor Total (R$)
          </label>
          <input 
            type="number"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            placeholder="0.00"
            step="0.01"
            style={styles.input}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#243332' }}>
            Observações
          </label>
          <textarea 
            value={formData.obs}
            onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
            placeholder="Informações adicionais"
            style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'none' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button 
            onClick={() => {
              const newDoc: NFCeDocument = {
                id: String(documents.length + 1),
                numero: String(documents.length + 1).padStart(6, '0'),
                serie: '1',
                data: new Date().toISOString().split('T')[0],
                cliente: formData.cliente || 'Consumidor Final',
                valor: Number(formData.valor),
                status: 'PROCESSANDO',
              };
              setDocuments([newDoc, ...documents]);
              setFormData({ cliente: '', valor: '', obs: '' });
              alert('✓ NFC-e enviada para emissão!');
            }}
            style={{ ...styles.button, ...styles.buttonPrimary }}
          >
            ✓ Emitir NFC-e
          </button>
          <button 
            onClick={() => setFormData({ cliente: '', valor: '', obs: '' })}
            style={{ ...styles.button, ...styles.buttonSecondary }}
          >
            Limpar
          </button>
        </div>
      </div>
      <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#0d47a1' }}>
        💡 A NFC-e será automaticamente enviada para autorização junto à SEFAZ após emissão.
      </div>
    </div>
  );

  const renderConsultar = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>🔍 Consultar NFC-e</h2>
      <input 
        placeholder="Pesquisar por número, cliente ou protocolo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
        style={{ ...styles.input, marginBottom: '16px' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Número</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Data</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Protocolo</th>
            </tr>
          </thead>
          <tbody>
            {documents.filter(doc => 
              doc.numero.includes(searchTerm) || 
              doc.cliente.toLowerCase().includes(searchTerm) ||
              doc.protocolo?.includes(searchTerm)
            ).map(doc => (
              <tr key={doc.id}>
                <td style={styles.td}><strong>{doc.numero}</strong></td>
                <td style={styles.td}>{doc.cliente}</td>
                <td style={styles.td}>{new Date(doc.data).toLocaleDateString('pt-BR')}</td>
                <td style={styles.td}>R$ {doc.valor.toFixed(2)}</td>
                <td style={styles.td}><span style={styles.badge(doc.status)}>{doc.status}</span></td>
                <td style={styles.td}><code style={{ fontSize: '11px' }}>{doc.protocolo || '-'}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCancelar = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>❌ Cancelar NFC-e</h2>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#243332' }}>
          Selecione a NFC-e para cancelar
        </label>
        <select style={{ ...styles.input, marginBottom: '12px' }}>
          <option>-- Selecionar --</option>
          {documents.filter(d => d.status === 'AUTORIZADO').map(doc => (
            <option key={doc.id}>
              {doc.numero} - {doc.cliente} - R$ {doc.valor.toFixed(2)}
            </option>
          ))}
        </select>
        <textarea 
          placeholder="Motivo do cancelamento (obrigatório)"
          style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'none', marginBottom: '12px' }}
        />
        <button 
          onClick={() => alert('✓ Cancelamento enviado! Aguarde confirmação da SEFAZ.')}
          style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
        >
          Confirmar Cancelamento
        </button>
      </div>
      <div style={{ background: '#ffe0e0', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#a64b4b' }}>
        ⚠️ O cancelamento é irreversível. Certifique-se dos dados antes de confirmar.
      </div>
    </div>
  );

  const renderHistorico = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>📋 Histórico de Emissões</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nº</th>
              <th style={styles.th}>Data/Hora</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td style={styles.td}><strong>{doc.numero}</strong></td>
                <td style={styles.td}>{new Date(doc.data).toLocaleString('pt-BR')}</td>
                <td style={styles.td}>{doc.cliente}</td>
                <td style={styles.td}>R$ {doc.valor.toFixed(2)}</td>
                <td style={styles.td}><span style={styles.badge(doc.status)}>{doc.status}</span></td>
                <td style={styles.td}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary, fontSize: '11px' }}>
                    Ver XML
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDANFE = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>🖨️ Gerar DANFE</h2>
      <p style={{ fontSize: '13px', color: '#647674', marginBottom: '16px' }}>
        DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) - Comprovante de emissão para impressão.
      </p>
      <select style={{ ...styles.input, marginBottom: '16px' }}>
        <option>-- Selecionar NFC-e --</option>
        {documents.filter(d => d.status === 'AUTORIZADO').map(doc => (
          <option key={doc.id}>
            {doc.numero} - {doc.cliente}
          </option>
        ))}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <button style={{ ...styles.button, ...styles.buttonPrimary }}>📄 Gerar PDF</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }}>🖨️ Imprimir Direto</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }}>📧 Enviar por Email</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }}>📱 QR Code</button>
      </div>
    </div>
  );

  const renderInutilizar = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>🔄 Inutilizar Numeração</h2>
      <p style={{ fontSize: '13px', color: '#647674', marginBottom: '16px' }}>
        Inutilize uma sequência de números que não será mais usada na emissão de NFC-e.
      </p>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Número Inicial
            </label>
            <input type="number" placeholder="Ex: 100" style={styles.input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Número Final
            </label>
            <input type="number" placeholder="Ex: 150" style={styles.input} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            Motivo
          </label>
          <textarea 
            placeholder="Ex: Números danificados, cancelados, etc"
            style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'none' }}
          />
        </div>
        <button style={{ ...styles.button, ...styles.buttonPrimary }}>✓ Inutilizar</button>
      </div>
      <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#856404' }}>
        ⚠️ Esta ação requer aprovação da SEFAZ e é permanente.
      </div>
    </div>
  );

  const renderConfiguracoes = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>⚙️ Configurações NFC-e</h2>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Certificado Digital</h3>
          <div style={{ padding: '12px', background: '#f4f7f7', borderRadius: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#647674' }}>
              <div>📄 Certificado: <strong>SalesMind CNPJ</strong></div>
              <div>✓ Status: <span style={{ color: '#27ae60' }}>Válido até 15/12/2026</span></div>
            </div>
          </div>
          <button style={{ ...styles.button, ...styles.buttonSecondary }}>Atualizar Certificado</button>
        </div>
        
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Sequência Numérica</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Série Atual
              </label>
              <input type="text" value="1" style={styles.input} disabled />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Próximo Número
              </label>
              <input type="number" value="4" style={styles.input} disabled />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Ambiente</h3>
          <select style={styles.input}>
            <option>Produção (real)</option>
            <option>Homologação (testes)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStatus = () => (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>🔗 Status SEFAZ</h2>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        <div style={{ 
          padding: '12px', background: '#d4edda', borderRadius: '6px',
          border: '1px solid #c3e6cb'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ color: '#155724' }} />
            <div style={{ color: '#155724', fontWeight: 'bold' }}>Serviço de Emissão: Operacional</div>
          </div>
          <div style={{ fontSize: '12px', color: '#155724', marginTop: '4px' }}>Última verificação: agora</div>
        </div>
        
        <div style={{ 
          padding: '12px', background: '#d4edda', borderRadius: '6px',
          border: '1px solid #c3e6cb'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ color: '#155724' }} />
            <div style={{ color: '#155724', fontWeight: 'bold' }}>Serviço de Consulta: Operacional</div>
          </div>
          <div style={{ fontSize: '12px', color: '#155724', marginTop: '4px' }}>Última verificação: agora</div>
        </div>
      </div>
      <button 
        onClick={() => alert('✓ Status atualizado com sucesso!')}
        style={{ ...styles.button, ...styles.buttonPrimary }}
      >
        🔄 Atualizar Status
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeModule) {
      case 'emitir': return renderEmitir();
      case 'consultar': return renderConsultar();
      case 'cancelar': return renderCancelar();
      case 'historico': return renderHistorico();
      case 'danfe': return renderDANFE();
      case 'inutilizar': return renderInutilizar();
      case 'configuracoes': return renderConfiguracoes();
      case 'status': return renderStatus();
      default: return renderEmitir();
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ ...styles.header, fontSize: '28px', margin: 0, marginBottom: '8px' }}>📄 NFC-e</h1>
        <p style={styles.subtitle}>Nota Fiscal de Consumidor Eletrônica - Emissão e Gerenciamento</p>
      </div>

      {/* Menu de submódulos */}
      <div style={{ ...styles.panel, marginBottom: '20px', background: '#f8faf9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              style={{
                padding: '10px 8px',
                background: activeModule === mod.id ? mod.color : '#fff',
                color: activeModule === mod.id ? '#fff' : '#243332',
                border: activeModule === mod.id ? 'none' : '1px solid #d9e2e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeModule === mod.id ? 'bold' : '600',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <mod.icon size={14} />
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {renderContent()}
    </div>
  );
}
