import React, { ReactNode, useState } from 'react';
import { 
  Home, Stethoscope, Users, Calendar, ShoppingCart, Percent, 
  Lightbulb, Database, Bed, Box, DollarSign, ChevronDown, 
  HelpCircle, Settings, ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  userRole: string;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage, onLogout, userRole }) => {
  const [intelOpen, setIntelOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Painel de controle', icon: <Home size={18} /> },
    { id: 'atendimento', label: 'Atendimento clínico', icon: <Stethoscope size={18} /> },
    { id: 'clientes', label: 'Clientes', icon: <Users size={18} /> },
    { id: 'agenda', label: 'Agenda', icon: <Calendar size={18} /> },
    { id: 'vendas', label: 'Vendas', icon: <ShoppingCart size={18} />, hidden: userRole !== 'ADMIN' && userRole !== 'VENDEDOR' },
    { id: 'comissionamento', label: 'Comissionamento', icon: <Percent size={18} /> },
  ];

  const bottomMenuItems = [
    { id: 'cadastros', label: 'Cadastros', icon: <Database size={18} />, hidden: userRole !== 'ADMIN' },
    { id: 'internacao', label: 'Internação', icon: <Bed size={18} /> },
    { id: 'estoque', label: 'Estoque e Compras', icon: <Box size={18} /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f4f5f7', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888' }}>Clique para adicionar logotipo</div>
          <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Programa de Transporte</div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {menuItems.filter(m => !m.hidden).map(item => (
            <div 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: 'pointer',
                backgroundColor: currentPage === item.id ? '#17a2b8' : 'transparent',
                color: currentPage === item.id ? '#fff' : '#555',
                borderLeft: currentPage === item.id ? '4px solid #138496' : '4px solid transparent'
              }}
            >
              <span style={{ marginRight: '15px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </div>
          ))}

          {/* Inteligência Menu (Collapsible) */}
          <div>
            <div 
              onClick={() => setIntelOpen(!intelOpen)}
              style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: 'pointer', color: '#555'
              }}
            >
              <span style={{ marginRight: '15px' }}><Lightbulb size={18} /></span>
              <span style={{ fontSize: '14px', flex: 1 }}>Inteligência</span>
              <span>{intelOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            </div>
            
            {intelOpen && (
              <div style={{ backgroundColor: '#f9f9f9', padding: '5px 0' }}>
                {['Consultas', 'Vacinação', 'Aniversários', 'Log'].map(sub => {
                  const subId = sub.toLowerCase();
                  const isActive = currentPage === subId;
                  return (
                    <div 
                      key={sub}
                      onClick={() => onNavigate(subId)}
                      style={{
                        padding: '8px 20px 8px 50px', cursor: 'pointer', fontSize: '13px',
                        backgroundColor: isActive ? '#d1d5db' : 'transparent',
                        color: isActive ? '#333' : '#666'
                      }}
                    >
                      {sub}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {bottomMenuItems.filter(m => !m.hidden).map(item => (
            <div 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: 'pointer',
                backgroundColor: currentPage === item.id ? '#17a2b8' : 'transparent',
                color: currentPage === item.id ? '#fff' : '#555',
                borderLeft: currentPage === item.id ? '4px solid #138496' : '4px solid transparent'
              }}
            >
              <span style={{ marginRight: '15px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto' }}><ChevronDown size={14} /></span>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: '50px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px' }}>
          <span style={{ fontSize: '13px', color: '#666', marginRight: '20px', cursor: 'pointer' }}>Novidades</span>
          
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px', cursor: 'pointer' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ccc', marginRight: '8px' }}></div>
            <span style={{ fontSize: '13px', color: '#555' }}>James | Programa de Transporte <ChevronDown size={12} style={{ display: 'inline', marginLeft: '4px' }} /></span>
          </div>

          <button style={{ display: 'flex', alignItems: 'center', border: '1px solid #b366ff', backgroundColor: 'transparent', color: '#b366ff', borderRadius: '15px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', marginRight: '10px' }}>
            <HelpCircle size={14} style={{ marginRight: '5px' }} /> Ajuda
          </button>
          
          <button onClick={onLogout} style={{ border: 'none', backgroundColor: 'transparent', color: '#dc3545', fontSize: '13px', cursor: 'pointer' }}>
            Sair
          </button>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;