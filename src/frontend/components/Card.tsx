export function Card({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
        {children}
        </div>
    );
    }