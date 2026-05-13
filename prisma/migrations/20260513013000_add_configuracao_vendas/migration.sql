-- Tabela de configuracao comercial do modulo de vendas (escopo global por enquanto).
CREATE TABLE IF NOT EXISTS `ConfiguracaoVendas` (
  `id` VARCHAR(191) NOT NULL,
  `escopo` VARCHAR(50) NOT NULL,
  `empresaId` VARCHAR(191) NULL,
  `descontoMaximo` DOUBLE NOT NULL DEFAULT 10,
  `comissaoPadrao` DOUBLE NOT NULL DEFAULT 5,
  `validadeOrcamentoDias` INT NOT NULL DEFAULT 7,
  `permitirVendaOffline` BOOLEAN NOT NULL DEFAULT true,
  `exigirAprovacaoDesconto` BOOLEAN NOT NULL DEFAULT false,
  `nfeAutomatica` BOOLEAN NOT NULL DEFAULT false,
  `sincronizarMarketplace` BOOLEAN NOT NULL DEFAULT true,
  `atualizarEstoqueMarketplace` BOOLEAN NOT NULL DEFAULT true,
  `atualizarPrecoMarketplace` BOOLEAN NOT NULL DEFAULT false,
  `jurosMensal` DOUBLE NOT NULL DEFAULT 0,
  `multaAtraso` DOUBLE NOT NULL DEFAULT 0,
  `prazoRecebimentoPadrao` INT NOT NULL DEFAULT 30,
  `updatedByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ConfiguracaoVendas_escopo_key` (`escopo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
