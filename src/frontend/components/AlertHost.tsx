import { useEffect, useRef, useState } from 'react';

type AlertItem = {
    id: number;
    message: string;
};

const hostStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: 'min(420px, calc(100vw - 32px))',
    pointerEvents: 'none',
};

const itemStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    border: '1px solid #fdba74',
    borderLeft: '6px solid #ea580c',
    borderRadius: 14,
    boxShadow: '0 16px 30px rgba(154, 52, 18, 0.18)',
    padding: '14px 16px',
    color: '#7c2d12',
};

const titleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
};

const messageStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
};

const closeButtonStyle: React.CSSProperties = {
    marginTop: 10,
    border: 'none',
    background: '#ea580c',
    color: '#fff',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
};

export default function AlertHost() {
    const [items, setItems] = useState<AlertItem[]>([]);
    const nextIdRef = useRef(1);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const originalAlert = window.alert.bind(window);

        window.alert = (message?: unknown) => {
            const normalizedMessage = typeof message === 'string' ? message : String(message ?? '');
            const id = nextIdRef.current++;

            setItems((current) => [...current, { id, message: normalizedMessage }].slice(-4));

            window.setTimeout(() => {
                setItems((current) => current.filter((item) => item.id !== id));
            }, 6500);
        };

        return () => {
            window.alert = originalAlert;
        };
    }, []);

    if (items.length === 0) {
        return null;
    }

    return (
        <div style={hostStyle} aria-live="polite" aria-atomic="false">
            {items.map((item) => (
                <div key={item.id} style={itemStyle} role="status">
                    <div style={titleStyle}>Aviso do sistema</div>
                    <div style={messageStyle}>{item.message}</div>
                    <button
                        type="button"
                        style={closeButtonStyle}
                        onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                    >
                        Fechar
                    </button>
                </div>
            ))}
        </div>
    );
}
