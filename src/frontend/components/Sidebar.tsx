import {
    LayoutDashboard,
    Package,
    Settings,
    Users
} from "lucide-react";

import { type Page } from "../types/Page";

type SidebarProps = {
    currentPage: Page;
    onNavigate: (page: Page) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
    const menu: { name: string; icon: any; page: Page }[] = [
        { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
        { name: "Produtos", icon: Package, page: "cadastro-produtos" },
        { name: "Clientes", icon: Users, page: "fornecedores" },
        { name: "Configurações", icon: Settings, page: "marcas" }
    ];

    return (
    <div style={{
        width: "240px",
        background: "#1e293b",
        color: "#fff",
        padding: "20px",
        height: "100vh"
    }}>
        <h2>SalesMind</h2>

        <div style={{ marginTop: "30px" }}>
        {menu.map((item, i) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;

            return (
            <div
                key={i}
                onClick={() => onNavigate(item.page)}
                style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                borderRadius: "8px",
                cursor: "pointer",
                background: isActive ? "#334155" : "transparent"
                }}
            >
                <Icon size={18} />
                {item.name}
            </div>
            );
        })}
        </div>
    </div>
    );
}