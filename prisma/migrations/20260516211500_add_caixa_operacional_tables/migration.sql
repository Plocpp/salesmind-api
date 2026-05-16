-- Ensure operational cash register tables exist in legacy databases
CREATE TABLE IF NOT EXISTS `caixaoperacional` (
  `id` VARCHAR(191) NOT NULL,
  `status` ENUM('ABERTO', 'FECHADO', 'CONFERENCIA', 'CANCELADO') NOT NULL DEFAULT 'ABERTO',
  `terminal` VARCHAR(191) NULL,
  `loja` VARCHAR(191) NULL,
  `turno` VARCHAR(191) NULL,
  `saldoInicial` DOUBLE NOT NULL DEFAULT 0,
  `saldoFinal` DOUBLE NULL,
  `diferenca` DOUBLE NULL,
  `abertoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fechadoEm` DATETIME(3) NULL,
  `usuarioId` VARCHAR(191) NOT NULL,
  `empresaId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `caixaoperacional_usuarioId_idx` (`usuarioId`),
  INDEX `caixaoperacional_status_idx` (`status`),
  INDEX `caixaoperacional_terminal_idx` (`terminal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `movimentocaixa` (
  `id` VARCHAR(191) NOT NULL,
  `tipo` ENUM('VENDA', 'SANGRIA', 'SUPRIMENTO', 'ESTORNO', 'RETIRADA', 'QUEBRA', 'SOBRA', 'DESPESA', 'TRANSFERENCIA') NOT NULL,
  `valor` DOUBLE NOT NULL,
  `descricao` VARCHAR(191) NULL,
  `terminal` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `caixaId` VARCHAR(191) NOT NULL,
  `usuarioId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `movimentocaixa_caixaId_createdAt_idx` (`caixaId`, `createdAt`),
  INDEX `movimentocaixa_usuarioId_idx` (`usuarioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @stmt = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'venda'
      AND COLUMN_NAME = 'caixaId'
  ),
  'SELECT 1',
  'ALTER TABLE `venda` ADD COLUMN `caixaId` VARCHAR(191) NULL'
);
PREPARE s1 FROM @stmt;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @stmt = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'venda'
      AND COLUMN_NAME = 'terminal'
  ),
  'SELECT 1',
  'ALTER TABLE `venda` ADD COLUMN `terminal` VARCHAR(191) NULL'
);
PREPARE s2 FROM @stmt;
EXECUTE s2;
DEALLOCATE PREPARE s2;
