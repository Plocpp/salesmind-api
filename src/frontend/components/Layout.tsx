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
    LogOut,
    Menu,
    Search,
    ShoppingCart,
    Truck,
    X
} from 'lucide-react';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  userRole: string;
  areasPermitidas?: string[];
}

const colors = {
  shell: '#f6f3ec',
  sidebar: '#fffcf6',
  border: '#d8d3c6',
  text: '#1f312c',
  muted: '#62726c',
  active: '#0e7a6d',
  activeSoft: '#dff3ee',
  accent: '#df7f4b',
  danger: '#9f3f4f',
};

const MOBILE_BREAKPOINT = 920;
const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

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

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage, onLogout, userRole, areasPermitidas = [] }) => {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    painel: true,
    vendas: true,
    financeiro: true,
    nfce: false,
    estoque: false,
    integracoes: false,
    'transporte-rastreamento': false,
    administracao: false,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const update = () => {
      const byWidth = mediaQuery.matches;
      const byDevice = MOBILE_USER_AGENT_REGEX.test(window.navigator.userAgent || '') && window.innerWidth <= 1024;
      setIsMobile(byWidth || byDevice);
    };
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => {
        mediaQuery.removeEventListener('change', update);
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

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
      label: 'Estoque e serviços',
      icon: Boxes,
      children: [
        { id: 'estoque', label: 'Estoque (produtos)' },
        { id: 'servicos', label: 'Serviços' },
        { id: 'compras', label: 'Compras (XML)' },
        { id: 'novos-pedidos', label: 'Novos Pedidos' },
        { id: 'cadastro-produtos', label: 'Cadastro de Produtos' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'marcas', label: 'Marcas' },
      ],
    },
  ];

  const hasAreaAccess = (area: string) => userRole === 'ADMIN' || areasPermitidas.includes('*') || areasPermitidas.includes(area);

  useEffect(() => {
    const allModules = [...operationModules, ...managementModules];
    const activeModule = allModules.find((module) => module.children.some((child) => child.id === currentPage));
    if (!activeModule) return;

    setOpenModules((current) => (current[activeModule.id] ? current : { ...current, [activeModule.id]: true }));
  }, [currentPage, userRole]);

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
      id: 'transporte-rastreamento',
      label: 'Transporte e Rastreamento',
      icon: Truck,
      hidden: !hasAreaAccess('rastreio-transporte') && userRole !== 'ADMIN',
      children: [
        { id: 'rastreio-transporte', label: 'Central de Rastreamento' },
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
        { id: 'usuarios-hierarquia', label: 'Usuários e Hierarquia' },
      ],
    },
  ];

  const toggleModule = (moduleId: string) => {
    setOpenModules((current) => ({ ...current, [moduleId]: !current[moduleId] }));
  };

  const navigateTo = (page: string) => {
    onNavigate(page);
    if (isMobile) setIsDrawerOpen(false);
  };

  const handleLogout = () => {
    setIsDrawerOpen(false);
    onLogout();
  };

  const quickNav = useMemo(
    () => [
      { id: 'dashboard', label: 'Início', icon: Home },
      { id: 'vendas', label: 'Vendas', icon: ShoppingCart, hidden: userRole !== 'ADMIN' && userRole !== 'VENDEDOR' },
      { id: 'estoque', label: 'Estoque', icon: Boxes },
      { id: 'servicos', label: 'Serviços', icon: Boxes },
      { id: 'compras', label: 'Compras XML', icon: ClipboardList },
      { id: 'novos-pedidos', label: 'Novos Pedidos', icon: ClipboardList },
      { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    ].filter((item) => !item.hidden),
    [userRole]
  );

  const isModuleActive = (module: MenuModule) => module.children.some((child) => child.id === currentPage);

  const submenuItem = (item: MenuChild) => {
    const active = currentPage === item.id;

    return (
      <button
        key={item.id}
        onClick={() => navigateTo(item.id)}
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

  const renderNavigation = () => (
    <>
      {sectionHeader('OPERACAO', ClipboardList)}
      <div style={{ display: 'grid', gap: 6 }}>
        {operationModules.filter((item) => !item.hidden).map(moduleItem)}
      </div>

      {sectionHeader('GESTAO', Boxes)}
      <div style={{ display: 'grid', gap: 6 }}>
        {managementModules.filter((item) => !item.hidden).map(moduleItem)}
      </div>
    </>
  );

  const renderDesktopHeader = () => (
    <header
      style={{
        height: 64,
        background: '#ffffff',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 22px',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          height: 38,
          maxWidth: 420,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          background: '#f4f7f7',
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          color: colors.muted,
        }}
      >
        <Search size={16} />
        <span style={{ fontSize: 13 }}>Buscar produto, cliente, venda ou lancamento</span>
      </div>

      <button
        onClick={() => navigateTo('compras')}
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: `1px solid ${currentPage === 'compras' ? colors.active : colors.border}`,
          background: currentPage === 'compras' ? colors.activeSoft : '#fff',
          color: currentPage === 'compras' ? colors.active : colors.text,
          borderRadius: 8,
          padding: '0 12px',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        <ClipboardList size={16} /> Compras
      </button>

      <button
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: `1px solid ${colors.border}`,
          background: '#fff',
          color: colors.text,
          borderRadius: 8,
          padding: '0 12px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        <BarChart3 size={16} /> Relatorios
      </button>

      <button
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: `1px solid ${colors.border}`,
          background: '#fff',
          color: colors.text,
          borderRadius: 8,
          padding: '0 12px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        <CircleHelp size={16} /> Ajuda
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: colors.accent,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          {(localStorage.getItem('userName') || userRole || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 116 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{localStorage.getItem('userName') || userRole || 'Usuario'}</div>
          <div style={{ fontSize: 11, color: colors.muted }}>SalesMind</div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        title="Sair"
        style={{
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 8,
          background: '#f7eeee',
          color: colors.danger,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <LogOut size={17} />
      </button>
    </header>
  );

  const renderMobileHeader = () => (
    <header
      style={{
        height: 68,
        background: '#ffffff',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        boxSizing: 'border-box',
      }}
    >
      <button
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Abrir menu"
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: '#fff',
          display: 'grid',
          placeItems: 'center',
          color: colors.text,
          flexShrink: 0,
        }}
      >
        <Menu size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: colors.active,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            SM
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>SalesMind</div>
            <div style={{ fontSize: 11, color: colors.muted }}>Acesso mobile</div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        aria-label="Sair"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: 'none',
          background: '#f7eeee',
          color: colors.danger,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <LogOut size={18} />
      </button>
    </header>
  );

  const renderDrawer = () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        background: 'rgba(15, 23, 42, 0.38)',
      }}
      onClick={() => setIsDrawerOpen(false)}
    >
      <aside
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '88vw',
          maxWidth: 340,
          background: colors.sidebar,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '20px 0 40px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div
          style={{
            minHeight: 72,
            padding: '14px 16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: colors.active,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            SM
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.text }}>SalesMind</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Operacao integrada</div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Fechar menu"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: '#fff',
              display: 'grid',
              placeItems: 'center',
              color: colors.text,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
          {renderNavigation()}
        </nav>

        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: 14,
            display: 'grid',
            gap: 10,
          }}
        >
          <button
            onClick={() => navigateTo('dashboard')}
            style={{
              height: 42,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: '#fff',
              color: colors.text,
              fontWeight: 700,
            }}
          >
            Ir para Dashboard
          </button>
          <button
            onClick={handleLogout}
            style={{
              height: 42,
              borderRadius: 10,
              border: 'none',
              background: '#f7eeee',
              color: colors.danger,
              fontWeight: 700,
            }}
          >
            Sair da conta
          </button>
        </div>
      </aside>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100svh',
        width: '100%',
        background: `
          radial-gradient(circle at 10% 8%, rgba(223, 127, 75, 0.08), transparent 28%),
          radial-gradient(circle at 92% 10%, rgba(14, 122, 109, 0.1), transparent 30%),
          ${colors.shell}
        `,
        fontFamily: "Sora, Manrope, 'Segoe UI', sans-serif",
        color: colors.text,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!isMobile && (
        <aside
          style={{
            width: 272,
            background: colors.sidebar,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              minHeight: 72,
              padding: '14px 18px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 8, background: colors.active, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>SM</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0 }}>SalesMind</div>
              <div style={{ fontSize: 12, color: colors.muted }}>Operacao integrada</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: 14, overflowY: 'auto' }}>{renderNavigation()}</nav>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          paddingBottom: isMobile ? 76 : 0,
        }}
      >
        {isMobile ? renderMobileHeader() : renderDesktopHeader()}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: isMobile ? 'auto' : 'hidden',
            padding: isMobile ? '14px 12px' : 22,
            paddingBottom: isMobile ? 96 : 22,
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {isMobile && (
          <nav
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              height: 66,
              display: 'grid',
              gridTemplateColumns: `repeat(${quickNav.length + 1}, 1fr)`,
              background: '#ffffff',
              borderTop: `1px solid ${colors.border}`,
              zIndex: 30,
              boxShadow: '0 -12px 30px rgba(15, 23, 42, 0.08)',
            }}
          >
            {quickNav.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: active ? colors.active : colors.muted,
                    display: 'grid',
                    placeItems: 'center',
                    gap: 4,
                    padding: '8px 4px 6px',
                    fontSize: 11,
                    fontWeight: active ? 800 : 600,
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                border: 'none',
                background: 'transparent',
                color: colors.muted,
                display: 'grid',
                placeItems: 'center',
                gap: 4,
                padding: '8px 4px 6px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <Menu size={18} />
              <span>Menu</span>
            </button>
          </nav>
        )}
      </main>

      {isMobile && isDrawerOpen && renderDrawer()}
    </div>
  );
};

export default Layout;
