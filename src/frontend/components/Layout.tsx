import {
    BarChart3,
    Bed,
    Boxes,
    ChevronDown,
    ChevronRight,
    CircleHelp,
    ClipboardList,
    Database,
    DollarSign,
    FileText,
    Home,
    Lightbulb,
    LogOut,
    Search,
    ShoppingCart,
    Stethoscope
} from 'lucide-react';
import React, { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  userRole: string;
}

const colors = {
  shell: '#eef3f5',
  sidebar: '#f8faf9',
  border: '#d9e2e1',
  text: '#243332',
  muted: '#647674',
  active: '#2f6f73',
  activeSoft: '#e1eeee',
  accent: '#6c8f7d',
  danger: '#a64b4b',
};

type MenuChild = {
  id: string;
  label: string;
};

type MenuModule = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  hidden?: boolean;
  children: MenuChild[];
};

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage, onLogout, userRole }) => {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    painel: true,
    vendas: true,
    financeiro: true,
    nfce: false,
    estoque: false,
    operacao: false,
    integracoes: false,
    inteligencia: false,
    administracao: false,
  });

  const operationModules: MenuModule[] = [
    {
      id: 'painel',
      label: 'Painel',
      icon: Home,
      children: [
        { id: 'dashboard', label: 'Visao Geral' },
        { id: 'agenda', label: 'Agenda' },
        { id: 'clientes', label: 'Clientes' },
      ],
    },
    {
      id: 'vendas',
      label: 'Vendas',
      icon: ShoppingCart,
      hidden: userRole !== 'ADMIN' && userRole !== 'VENDEDOR',
      children: [
        { id: 'vendas', label: 'Ponto de Venda' },
        { id: 'vendas-consulta', label: 'Consulta Vendas' },
        { id: 'vendas-devolucoes', label: 'Devolucoes e Estornos' },
        { id: 'comissionamento', label: 'Comissoes' },
      ],
    },
    {
      id: 'estoque',
      label: 'Estoque e Compras',
      icon: Boxes,
      children: [
        { id: 'estoque', label: 'Visao de Estoque' },
        { id: 'cadastro-produtos', label: 'Cadastro de Produtos' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'marcas', label: 'Marcas' },
      ],
    },
    {
      id: 'operacao',
      label: 'Operacao Clinica',
      icon: Stethoscope,
      children: [
        { id: 'atendimento', label: 'Atendimento' },
        { id: 'internacao', label: 'Internacao' },
      ],
    },
  ];

  const managementModules: MenuModule[] = [
    {
      id: 'nfce',
      label: 'NFC-e',
      icon: FileText,
      children: [
        { id: 'nfce-emitir', label: 'Emitir NFC-e' },
        { id: 'nfce-consultar', label: 'Consultar NFC-e' },
        { id: 'nfce-cancelar', label: 'Cancelar NFC-e' },
        { id: 'nfce-historico', label: 'Historico de Emissoes' },
        { id: 'nfce-danfe', label: 'Gerar DANFE' },
        { id: 'nfce-inutilizar', label: 'Inutilizar Numeracao' },
        { id: 'nfce-configuracoes', label: 'Configuracoes' },
        { id: 'nfce-status', label: 'Status SEFAZ' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      children: [
        { id: 'financeiro', label: 'Resumo Financeiro' },
        { id: 'financeiro-lancamentos', label: 'Lancamentos' },
        { id: 'financeiro-conciliacao-cartoes', label: 'Conciliacao de Cartoes' },
        { id: 'financeiro-contas-pagar', label: 'Contas a Pagar' },
        { id: 'financeiro-demonstrativo', label: 'Demonstrativo (DRE)' },
        { id: 'financeiro-fluxo-caixa', label: 'Fluxo de Caixa' },
        { id: 'financeiro-contas-cartoes', label: 'Contas e Cartoes' },
        { id: 'financeiro-categorias', label: 'Categorias' },
        { id: 'financeiro-formas-pagamento', label: 'Formas de Pagamento' },
      ],
    },
    {
      id: 'integracoes',
      label: 'Integracoes e HUB',
      icon: Database,
      children: [
        { id: 'integracoes-hub', label: 'Hub de Integracao' },
        { id: 'integracoes-marketplaces', label: 'Marketplaces' },
        { id: 'integracoes-gateways', label: 'Gateways de Pagamento' },
        { id: 'integracoes-bancos', label: 'Bancos e Open Finance' },
        { id: 'integracoes-webhooks', label: 'Webhooks e Eventos' },
      ],
    },
    {
      id: 'inteligencia',
      label: 'Inteligencia',
      icon: Lightbulb,
      children: [
        { id: 'km-por-litro', label: 'Km por Litro' },
        { id: 'manutencao-veiculo', label: 'Manutencao Veiculo' },
        { id: 'peso-carga', label: 'Peso da Carga' },
        { id: 'log', label: 'Log de Integracoes' },
      ],
    },
    {
      id: 'administracao',
      label: 'Administracao',
      icon: Bed,
      hidden: userRole !== 'ADMIN',
      children: [
        { id: 'cadastros', label: 'Cadastros Gerais' },
      ],
    },
  ];

  const toggleModule = (moduleId: string) => {
    setOpenModules((current) => ({ ...current, [moduleId]: !current[moduleId] }));
  };

  const isModuleActive = (module: MenuModule) => module.children.some((child) => child.id === currentPage);

  const submenuItem = (item: MenuChild) => {
    const active = currentPage === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        style={{
          width: '100%',
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px 0 28px',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          background: active ? colors.activeSoft : 'transparent',
          color: active ? colors.active : colors.muted,
          fontWeight: active ? 700 : 500,
          textAlign: 'left',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? colors.active : '#b8c4c3' }} />
        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      </button>
    );
  };

  const moduleItem = (module: MenuModule) => {
    const Icon = module.icon;
    const isOpen = openModules[module.id];
    const active = isModuleActive(module);

    return (
      <div key={module.id} style={{ display: 'grid', gap: 3 }}>
        <button
          onClick={() => toggleModule(module.id)}
          style={{
            width: '100%',
            height: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            background: active ? colors.activeSoft : '#f1f6f5',
            color: active ? colors.active : colors.text,
          }}
        >
          <Icon size={16} />
          <span style={{ flex: 1, fontSize: 13, textAlign: 'left', fontWeight: 700 }}>{module.label}</span>
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        {isOpen && <div style={{ display: 'grid', gap: 2 }}>{module.children.map(submenuItem)}</div>}
      </div>
    );
  };

  const sectionHeader = (label: string, icon?: React.ComponentType<{ size?: number }>) => {
    const Icon = icon;
    return (
      <div
        style={{
          width: '100%',
          height: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px',
          color: colors.muted,
          margin: '12px 0 6px',
        }}
      >
        {Icon && <Icon size={16} />}
        <span style={{ flex: 1, fontSize: 11, textAlign: 'left', fontWeight: 800, letterSpacing: 0.8 }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: colors.shell, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', color: colors.text }}>
      <aside style={{ width: 272, background: colors.sidebar, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 72, padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: colors.active, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>SM</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0 }}>SalesMind</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Operacao integrada</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
          {sectionHeader('OPERACAO', ClipboardList)}
          <div style={{ display: 'grid', gap: 6 }}>
            {operationModules.filter((item) => !item.hidden).map(moduleItem)}
          </div>

          {sectionHeader('GESTAO', Boxes)}
          <div style={{ display: 'grid', gap: 6 }}>
            {managementModules.filter((item) => !item.hidden).map(moduleItem)}
          </div>
        </nav>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 64, background: '#ffffff', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px' }}>
          <div style={{ height: 38, maxWidth: 420, flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', background: '#f4f7f7', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted }}>
            <Search size={16} />
            <span style={{ fontSize: 13 }}>Buscar produto, cliente, venda ou lancamento</span>
          </div>

          <button style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text, borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 600 }}>
            <BarChart3 size={16} /> Relatorios
          </button>

          <button style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text, borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 600 }}>
            <CircleHelp size={16} /> Ajuda
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: colors.accent, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
              {(localStorage.getItem('userName') || userRole || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 116 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{localStorage.getItem('userName') || userRole || 'Usuario'}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>SalesMind</div>
            </div>
          </div>

          <button onClick={onLogout} title="Sair" style={{ width: 36, height: 36, border: 'none', borderRadius: 8, background: '#f7eeee', color: colors.danger, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <LogOut size={17} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
