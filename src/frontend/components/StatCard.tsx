import React from "react";

interface Props {
    icon: React.ComponentType<any>;
    value: string | number;
    label: string;
    color: string;
}

export function StatCard({ icon: Icon, value, label, color }: Props) {
    return (
        <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        borderLeft: `5px solid ${color}`,
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
        }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#777", fontSize: "14px" }}>{label}</span>
            <Icon size={20} color={color} />
        </div>

        <h2 style={{ marginTop: "10px" }}>{value}</h2>
        </div>
    );
    }