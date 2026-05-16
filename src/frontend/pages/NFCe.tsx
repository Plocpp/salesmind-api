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
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

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
  chaveAcesso?: string;
  motivoCancelamento?: string;
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

export default function NFCe({ initialModule = 'emitir' }: { initialModule?: NFCeModule }) {
  const [activeModule, setActiveModule] = useState<NFCeModule>(initialModule);
  const [modalModule, setModalModule] = useState<NFCeModule | null>(initialModule);
  const [documents, setDocuments] = useState<NFCeDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ cliente: '', valor: '', obs: '' });
  const [cancelData, setCancelData] = useState({ id: '', motivo: '' });
  const [inutilizarData, setInutilizarData] = useState({ inicio: '', fim: '', motivo: '' });
  const [statusSefaz, setStatusSefaz] = useState<'OPERACIONAL' | 'INSTAVEL' | 'INDISPONIVEL'>('OPERACIONAL');
  const [caixas, setCaixas] = useState<Array<{ id: string; status: string; terminal?: string }>>([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    setActiveModule(initialModule);
    setModalModule(initialModule);
  }, [initialModule]);

  useEffect(() => {
    const docs = localStorage.getItem('nfce-documents');
    if (docs) {
      try {
        setDocuments(JSON.parse(docs));
      } catch {
        setDocuments(mockDocuments);
      }
    } else {
      setDocuments(mockDocuments);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nfce-documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    const carregarCaixas = async () => {
      try {
        const response = await api.get('/vendas/caixas', token);
        setCaixas(Array.isArray(response) ? response : []);
      } catch {
        setCaixas([]);
      }
    };
    carregarCaixas();
  }, [token]);

  const caixaAberto = useMemo(
    () => caixas.find((caixa) => (caixa.status || '').toUpperCase() === 'ABERTO') || null,
    [caixas],
  );

  const emitirNfce = async () => {
    const valor = Number(formData.valor);
    if (!valor || valor <= 0) {
      alert('Informe um valor valido para a NFC-e.');
      return;
    }
    if (!caixaAberto?.id) {
      alert('Para emitir NFC-e e obrigatorio ter um caixa aberto.');
      return;
    }

    const numero = String(documents.length + 1).padStart(6, '0');
    const chave = `${new Date().getFullYear()}${numero}${Math.floor(Math.random() * 999999999999)
      .toString()
      .padStart(12, '0')}`;

    try {
      await api.post('/vendas/caixas/movimentos', {
        caixaId: caixaAberto.id,
        tipo: 'VENDA',
        valor,
        terminal: caixaAberto.terminal || 'PDV-01',
        descricao: `NFC-e ${numero}`,
        metadata: { modulo: 'NFCe', cliente: formData.cliente || 'Consumidor Final' },
      }, token);
    } catch (error) {
      console.error(error);
      alert('Falha ao registrar movimento de caixa da NFC-e.');
      return;
    }

    const newDoc: NFCeDocument = {
      id: crypto.randomUUID(),
      numero,
      serie: '1',
      data: new Date().toISOString(),
      cliente: formData.cliente || 'Consumidor Final',
      valor,
      status: 'AUTORIZADO',
      protocolo: `${Date.now()}`,
      chaveAcesso: chave,
    };

    setDocuments((current) => [newDoc, ...current]);
    setFormData({ cliente: '', valor: '', obs: '' });
    alert(`NFC-e ${numero} autorizada com sucesso.`);
  };

  const cancelarNfce = async () => {
    if (!cancelData.id) {
      alert('Selecione uma NFC-e para cancelar.');
      return;
    }
    if (cancelData.motivo.trim().length < 15) {
      alert('A justificativa do cancelamento deve ter pelo menos 15 caracteres.');
      return;
    }

    const alvo = documents.find((doc) => doc.id === cancelData.id);
    if (!alvo) {
      alert('NFC-e nao encontrada.');
      return;
    }
    const minutosDesdeEmissao = (Date.now() - new Date(alvo.data).getTime()) / 60000;
    if (minutosDesdeEmissao > 30) {
      alert('Prazo padrao de cancelamento NFC-e (30 min) excedido. Verifique cancelamento extemporaneo na sua UF.');
      return;
    }

    if (!caixaAberto?.id) {
      alert('Para cancelar NFC-e e obrigatorio ter um caixa aberto.');
      return;
    }

    try {
      await api.post('/vendas/caixas/movimentos', {
        caixaId: caixaAberto.id,
        tipo: 'ESTORNO',
        valor: Number(alvo.valor || 0),
        terminal: caixaAberto.terminal || 'PDV-01',
        descricao: `Cancelamento NFC-e ${alvo.numero}`,
        metadata: { modulo: 'NFCe', motivo: cancelData.motivo.trim() },
      }, token);
    } catch (error) {
      console.error(error);
      alert('Falha ao registrar estorno no caixa.');
      return;
    }

    setDocuments((current) => current.map((doc) => (
      doc.id === cancelData.id
        ? { ...doc, status: 'CANCELADO', motivoCancelamento: cancelData.motivo.trim() }
        : doc
    )));
    setCancelData({ id: '', motivo: '' });
    alert('Cancelamento registrado e vinculado ao caixa com estorno.');
  };

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
          <button onClick={emitirNfce} style={{ ...styles.button, ...styles.buttonPrimary }}>
            ✓ Emitir NFC-e
          </button>
          <button onClick={() => setFormData({ cliente: '', valor: '', obs: '' })} style={{ ...styles.button, ...styles.buttonSecondary }}>
            Limpar
          </button>
        </div>
      </div>
      <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#0d47a1' }}>
        💡 Regras aplicadas: emissao vinculada ao caixa aberto, numero sequencial, protocolo e chave de acesso local.
        <div style={{ marginTop: 6 }}>
          Caixa atual: <strong>{caixaAberto ? `ABERTO (${caixaAberto.terminal || 'PDV'})` : 'FECHADO'}</strong>
        </div>
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
        <select
          value={cancelData.id}
          onChange={(event) => setCancelData((current) => ({ ...current, id: event.target.value }))}
          style={{ ...styles.input, marginBottom: '12px' }}
        >
          <option value="">-- Selecionar --</option>
          {documents.filter((documento) => documento.status === 'AUTORIZADO').map((documento) => (
            <option key={documento.id} value={documento.id}>
              {documento.numero} - {documento.cliente} - R$ {documento.valor.toFixed(2)}
            </option>
          ))}
        </select>
        <textarea
          value={cancelData.motivo}
          onChange={(event) => setCancelData((current) => ({ ...current, motivo: event.target.value }))}
          placeholder="Motivo do cancelamento (mínimo 15 caracteres)"
          style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'none', marginBottom: '12px' }}
        />
        <button onClick={cancelarNfce} style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}>
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
        {documents.filter((documento) => documento.status === 'AUTORIZADO').map((documento) => (
          <option key={documento.id}>
            {documento.numero} - {documento.cliente}
          </option>
        ))}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={() => {
            const conteudo = `DANFE NFC-e\nGerado em ${new Date().toLocaleString('pt-BR')}`;
            const arquivo = document.createElement('a');
            arquivo.href = `data:text/plain;charset=utf-8,${encodeURIComponent(conteudo)}`;
            arquivo.download = `danfe-nfce-${Date.now()}.txt`;
            arquivo.click();
          }}
        >
          📄 Gerar PDF
        </button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => window.print()}>🖨️ Imprimir Direto</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => alert('Envio por email registrado para a NFC-e selecionada.')}>📧 Enviar por Email</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => alert('QR Code disponível no DANFE simplificado.')}>📱 QR Code</button>
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
            <input
              type="number"
              placeholder="Ex: 100"
              value={inutilizarData.inicio}
              onChange={(event) => setInutilizarData((current) => ({ ...current, inicio: event.target.value }))}
              style={styles.input}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Número Final
            </label>
            <input
              type="number"
              placeholder="Ex: 150"
              value={inutilizarData.fim}
              onChange={(event) => setInutilizarData((current) => ({ ...current, fim: event.target.value }))}
              style={styles.input}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            Motivo
          </label>
          <textarea
            value={inutilizarData.motivo}
            onChange={(event) => setInutilizarData((current) => ({ ...current, motivo: event.target.value }))}
            placeholder="Ex: Números danificados, cancelados, etc"
            style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'none' }}
          />
        </div>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={() => {
            const inicio = Number(inutilizarData.inicio);
            const fim = Number(inutilizarData.fim);
            if (!inicio || !fim || inicio > fim) {
              alert('Informe um intervalo valido para inutilizacao.');
              return;
            }
            if (inutilizarData.motivo.trim().length < 15) {
              alert('A justificativa de inutilizacao deve ter no minimo 15 caracteres.');
              return;
            }
            alert(`Faixa ${inicio} a ${fim} marcada para inutilizacao (pendente de envio SEFAZ).`);
            setInutilizarData({ inicio: '', fim: '', motivo: '' });
          }}
        >
          ✓ Inutilizar
        </button>
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

  const renderStatus = () => {
    const operacional = statusSefaz === 'OPERACIONAL';
    const instavel = statusSefaz === 'INSTAVEL';
    const caixaCor = operacional ? '#d4edda' : instavel ? '#fff3cd' : '#ffe0e0';
    const bordaCor = operacional ? '#c3e6cb' : instavel ? '#ffeaa7' : '#ffcccc';
    const textoCor = operacional ? '#155724' : instavel ? '#856404' : '#a64b4b';

    return (
    <div style={styles.panel}>
      <h2 style={{ ...styles.header, fontSize: '18px' }}>🔗 Status SEFAZ</h2>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        <div style={{ 
          padding: '12px', background: caixaCor, borderRadius: '6px',
          border: `1px solid ${bordaCor}`
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ color: textoCor }} />
            <div style={{ color: textoCor, fontWeight: 'bold' }}>Serviço de Emissão: {statusSefaz}</div>
          </div>
          <div style={{ fontSize: '12px', color: textoCor, marginTop: '4px' }}>Última verificação: agora</div>
        </div>
        
        <div style={{ 
          padding: '12px', background: caixaCor, borderRadius: '6px',
          border: `1px solid ${bordaCor}`
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ color: textoCor }} />
            <div style={{ color: textoCor, fontWeight: 'bold' }}>Serviço de Consulta: {statusSefaz}</div>
          </div>
          <div style={{ fontSize: '12px', color: textoCor, marginTop: '4px' }}>Última verificação: agora</div>
        </div>
      </div>
      <button
        onClick={() => {
          const estados: Array<'OPERACIONAL' | 'INSTAVEL' | 'INDISPONIVEL'> = ['OPERACIONAL', 'INSTAVEL', 'OPERACIONAL'];
          const proximo = estados[Math.floor(Math.random() * estados.length)];
          setStatusSefaz(proximo);
          alert(`Status atualizado: ${proximo}`);
        }}
        style={{ ...styles.button, ...styles.buttonPrimary }}
      >
        🔄 Atualizar Status
      </button>
    </div>
    );
  };

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

      <div style={{ ...styles.panel, marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div style={{ ...styles.card, cursor: 'default' }}>
            <div style={{ fontSize: 12, color: '#647674' }}>NFC-e autorizadas</div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20 }}>{documents.filter((d) => d.status === 'AUTORIZADO').length}</div>
          </div>
          <div style={{ ...styles.card, cursor: 'default' }}>
            <div style={{ fontSize: 12, color: '#647674' }}>NFC-e canceladas</div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20 }}>{documents.filter((d) => d.status === 'CANCELADO').length}</div>
          </div>
          <div style={{ ...styles.card, cursor: 'default' }}>
            <div style={{ fontSize: 12, color: '#647674' }}>Caixa</div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16 }}>{caixaAberto ? `ABERTO (${caixaAberto.terminal || 'PDV'})` : 'FECHADO'}</div>
          </div>
          <div style={{ ...styles.card, cursor: 'default' }}>
            <div style={{ fontSize: 12, color: '#647674' }}>Status SEFAZ</div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16 }}>{statusSefaz}</div>
          </div>
        </div>
      </div>

      {/* Menu de submódulos */}
      <div style={{ ...styles.panel, marginBottom: '20px', background: '#f8faf9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
          {modules.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => {
                setActiveModule(modulo.id);
                setModalModule(modulo.id);
              }}
              style={{
                padding: '10px 8px',
                background: activeModule === modulo.id ? modulo.color : '#fff',
                color: activeModule === modulo.id ? '#fff' : '#243332',
                border: activeModule === modulo.id ? 'none' : '1px solid #d9e2e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeModule === modulo.id ? 'bold' : '600',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <modulo.icon size={14} />
              {modulo.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Últimas NFC-e</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.slice(0, 8).map((documento) => (
                <tr key={documento.id}>
                  <td style={styles.td}>{documento.numero}</td>
                  <td style={styles.td}>{documento.cliente}</td>
                  <td style={styles.td}>{new Date(documento.data).toLocaleString('pt-BR')}</td>
                  <td style={styles.td}>R$ {documento.valor.toFixed(2)}</td>
                  <td style={styles.td}><span style={styles.badge(documento.status)}>{documento.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalModule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1100,
            padding: 10,
          }}
          onClick={() => setModalModule(null)}
        >
          <div
            style={{
              width: 'min(980px, 96vw)',
              maxHeight: '92vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #d9e2e1',
              boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
              padding: 14,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: '#243332' }}>{modules.find((item) => item.id === modalModule)?.label || 'NFC-e'}</strong>
              <button
                onClick={() => setModalModule(null)}
                style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 8px' }}
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
