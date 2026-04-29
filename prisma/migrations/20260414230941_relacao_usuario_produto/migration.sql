-- AlterTable
ALTER TABLE `produto` ADD COLUMN `usuarioId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Produto` ADD CONSTRAINT `Produto_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
