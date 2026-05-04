import React from 'react';

interface PlaceholderProps {
  title: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#333', marginBottom: '10px' }}>{title}</h2>
      <p style={{ color: '#666' }}>Esta tela está em construção e será implementada em breve.</p>
    </div>
  );
};

export default Placeholder;