import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

const criarDispositivoSchema = z.object({
  entregadorId: z.string().min(1),
  nomeDispositivo: z.string().max(120).optional(),
  plataforma: z.enum(['ANDROID', 'IOS', 'OUTRO']).default('OUTRO'),
  deviceId: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const iniciarSessaoSchema = z.object({
  vendaId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  iniciadaEm: z.coerce.date().optional(),
});

const pontoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precisao: z.number().nonnegative().optional(),
  velocidade: z.number().nonnegative().optional(),
  direcao: z.number().min(0).max(360).optional(),
  bateria: z.number().int().min(0).max(100).optional(),
  fonte: z.string().max(40).optional(),
  registradoEm: z.coerce.date().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

const finalizarSessaoSchema = z.object({
  motivo: z.string().max(255).optional(),
  finalizadaEm: z.coerce.date().optional(),
});

const MAX_FUTURO_MS = 5 * 60 * 1000;
const MAX_PASSADO_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MINUTES_DEFAULT = 5;

const lerRawJson = (raw: unknown) => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
};

export class RastreioTransporteService {
  private schemaReady = false;
  private entregadorTableName: string | null | undefined = undefined;

  private getEntregadorDelegate() {
    return (prisma as any)?.entregador;
  }

  private async resolveEntregadorTableName() {
    if (this.entregadorTableName !== undefined) return this.entregadorTableName;

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) IN ('entregador', 'entregadores')
      ORDER BY CASE
        WHEN LOWER(table_name) = 'entregador' THEN 0
        WHEN LOWER(table_name) = 'entregadores' THEN 1
        ELSE 2
      END
      LIMIT 1
      `,
    );

    const tableName = rows[0]?.table_name ? String(rows[0].table_name) : null;
    this.entregadorTableName = /^[a-zA-Z0-9_]+$/.test(tableName || '') ? tableName : null;
    return this.entregadorTableName;
  }

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private gerarToken() {
    return `trk_${randomBytes(24).toString('hex')}`;
  }

  private async ensureSchema() {
    if (this.schemaReady) return;

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_dispositivo (
        id VARCHAR(36) PRIMARY KEY,
        entregador_id VARCHAR(191) NOT NULL,
        nome_dispositivo VARCHAR(120) NULL,
        plataforma VARCHAR(40) NOT NULL,
        device_id VARCHAR(120) NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        ultimo_ping_em DATETIME(3) NULL,
        metadata JSON NULL,
        created_by_user_id VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_dispositivo_entregador (entregador_id, ativo),
        INDEX idx_rastreio_dispositivo_device (device_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_sessao (
        id VARCHAR(36) PRIMARY KEY,
        entregador_id VARCHAR(191) NOT NULL,
        dispositivo_id VARCHAR(36) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
        venda_id VARCHAR(191) NULL,
        iniciada_em DATETIME(3) NOT NULL,
        finalizada_em DATETIME(3) NULL,
        motivo VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_sessao_status (status, iniciada_em),
        INDEX idx_rastreio_sessao_entregador (entregador_id, status),
        INDEX idx_rastreio_sessao_dispositivo (dispositivo_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_ponto (
        id VARCHAR(36) PRIMARY KEY,
        sessao_id VARCHAR(36) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        precisao FLOAT NULL,
        velocidade FLOAT NULL,
        direcao FLOAT NULL,
        bateria INT NULL,
        fonte VARCHAR(40) NULL,
        registrado_em DATETIME(3) NOT NULL,
        raw JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_ponto_sessao (sessao_id, registrado_em)
      )
    `);

    this.schemaReady = true;
  }

  private async validarEntregador(entregadorId: string) {
    const delegate = this.getEntregadorDelegate();
    let entregador: { id: string; nome: string; ativo: boolean } | null = null;

    if (delegate?.findUnique) {
      entregador = await delegate.findUnique({
        where: { id: entregadorId },
        select: { id: true, nome: true, ativo: true },
      });
    } else {
      const entregadorTable = await this.resolveEntregadorTableName();
      if (!entregadorTable) {
        entregador = null;
      } else {
      const rows = await prisma.$queryRawUnsafe<Array<any>>(
        `
        SELECT id, nome, ativo
        FROM ${entregadorTable}
        WHERE id = ?
        LIMIT 1
        `,
        entregadorId,
      );

      if (rows[0]) {
        entregador = {
          id: rows[0].id,
          nome: rows[0].nome,
          ativo: Boolean(rows[0].ativo),
        };
      }
      }
    }

    if (!entregador) throw new Error('Entregador nao encontrado.');
    if (!entregador.ativo) throw new Error('Entregador esta inativo para rastreio.');

    return entregador;
  }

  private async autenticarDispositivo(token?: string | null) {
    if (!token) throw new Error('Token de rastreio nao informado.');

    await this.ensureSchema();

    const hash = this.tokenHash(token);
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, entregador_id, ativo
      FROM rastreio_dispositivo
      WHERE token_hash = ?
      LIMIT 1
      `,
      hash,
    );

    const dispositivo = rows[0];
    if (!dispositivo) throw new Error('Token de rastreio invalido.');
    if (!dispositivo.ativo) throw new Error('Dispositivo revogado para rastreio.');

    return dispositivo;
  }

  async listarEntregadores() {
    const delegate = this.getEntregadorDelegate();

    if (delegate?.findMany) {
      return delegate.findMany({
        select: { id: true, nome: true, ativo: true, telefone: true, email: true },
        orderBy: { nome: 'asc' },
        take: 300,
      });
    }

    const entregadorTable = await this.resolveEntregadorTableName();
    if (!entregadorTable) return [];

    const rows = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT id, nome, ativo, telefone, email
      FROM ${entregadorTable}
      ORDER BY nome ASC
      LIMIT 300
    `);

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      ativo: Boolean(row.ativo),
      telefone: row.telefone || null,
      email: row.email || null,
    }));
  }

  async criarDispositivo(data: unknown, userId: string) {
    await this.ensureSchema();
    const payload = criarDispositivoSchema.parse(data);
    await this.validarEntregador(payload.entregadorId);

    const id = randomUUID();
    const token = this.gerarToken();
    const hash = this.tokenHash(token);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_dispositivo (
        id, entregador_id, nome_dispositivo, plataforma, device_id, token_hash, ativo, metadata, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `,
      id,
      payload.entregadorId,
      payload.nomeDispositivo || null,
      payload.plataforma,
      payload.deviceId || null,
      hash,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
      userId,
    );

    return {
      id,
      token,
      entregadorId: payload.entregadorId,
      plataforma: payload.plataforma,
      nomeDispositivo: payload.nomeDispositivo || null,
      deviceId: payload.deviceId || null,
      observacao: 'Guarde este token com seguranca. Ele nao sera exibido novamente.',
    };
  }

  async revogarDispositivo(id: string) {
    await this.ensureSchema();

    await prisma.$executeRawUnsafe(`
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA',
          finalizada_em = COALESCE(finalizada_em, NOW(3)),
          motivo = COALESCE(motivo, 'DISPOSITIVO_REVOGADO')
      WHERE dispositivo_id = ?
        AND status = 'ATIVA'
    `, id);

    await prisma.$executeRawUnsafe(`UPDATE rastreio_dispositivo SET ativo = 0 WHERE id = ?`, id);
    return { ok: true };
  }

  async listarDispositivos() {
    await this.ensureSchema();

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = d.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const dispositivos = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT d.id, d.entregador_id, d.nome_dispositivo, d.plataforma, d.device_id,
             d.ativo, d.ultimo_ping_em, d.created_at, ${selectEntregadorNome}
      FROM rastreio_dispositivo d
      ${joinEntregador}
      ORDER BY d.created_at DESC
      LIMIT 500
    `);

    return dispositivos.map((item) => ({
      id: item.id,
      entregadorId: item.entregador_id,
      entregadorNome: item.entregador_nome || 'Entregador nao encontrado',
      nomeDispositivo: item.nome_dispositivo,
      plataforma: item.plataforma,
      deviceId: item.device_id,
      ativo: Boolean(item.ativo),
      ultimoPingEm: item.ultimo_ping_em,
      createdAt: item.created_at,
    }));
  }

  async iniciarSessaoMobile(token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = iniciarSessaoSchema.parse(data || {});

    const sessaoId = randomUUID();
    const iniciadaEm = payload.iniciadaEm || new Date();

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA',
          finalizada_em = COALESCE(finalizada_em, NOW(3)),
          motivo = COALESCE(motivo, 'SESSAO_REINICIADA')
      WHERE dispositivo_id = ?
        AND status = 'ATIVA'
      `,
      dispositivo.id,
    );

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_sessao (
        id, entregador_id, dispositivo_id, status, venda_id, iniciada_em, metadata
      ) VALUES (?, ?, ?, 'ATIVA', ?, ?, ?)
      `,
      sessaoId,
      dispositivo.entregador_id,
      dispositivo.id,
      payload.vendaId || null,
      iniciadaEm,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE rastreio_dispositivo SET ultimo_ping_em = ? WHERE id = ?`,
      new Date(),
      dispositivo.id,
    );

    return {
      sessaoId,
      entregadorId: dispositivo.entregador_id,
      iniciadaEm,
      status: 'ATIVA',
    };
  }

  async registrarPontoMobile(sessaoId: string, token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = pontoSchema.parse(data);

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, entregador_id, dispositivo_id, status
      FROM rastreio_sessao
      WHERE id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');
    if (sessao.status !== 'ATIVA') throw new Error('Sessao de rastreio ja finalizada.');
    if (sessao.dispositivo_id !== dispositivo.id) throw new Error('Sessao nao pertence ao dispositivo informado.');

    const pontoId = randomUUID();
    const registradoEm = payload.registradoEm || new Date();
    const agora = Date.now();
    const tempoPonto = registradoEm.getTime();

    if (tempoPonto - agora > MAX_FUTURO_MS) {
      throw new Error('Horario do ponto invalido (futuro acima do permitido).');
    }

    if (agora - tempoPonto > MAX_PASSADO_MS) {
      throw new Error('Horario do ponto invalido (muito antigo).');
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_ponto (
        id, sessao_id, latitude, longitude, precisao, velocidade, direcao, bateria, fonte, registrado_em, raw
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      pontoId,
      sessaoId,
      payload.latitude,
      payload.longitude,
      payload.precisao || null,
      payload.velocidade || null,
      payload.direcao || null,
      payload.bateria || null,
      payload.fonte || null,
      registradoEm,
      payload.raw ? JSON.stringify(payload.raw) : null,
    );

    await prisma.$executeRawUnsafe(`UPDATE rastreio_dispositivo SET ultimo_ping_em = ? WHERE id = ?`, new Date(), dispositivo.id);

    return { ok: true, pontoId, registradoEm };
  }

  async finalizarSessaoMobile(sessaoId: string, token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = finalizarSessaoSchema.parse(data || {});

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, dispositivo_id, status
      FROM rastreio_sessao
      WHERE id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');
    if (sessao.dispositivo_id !== dispositivo.id) throw new Error('Sessao nao pertence ao dispositivo informado.');
    if (sessao.status !== 'ATIVA') return { ok: true, status: 'FINALIZADA' };

    const finalizadaEm = payload.finalizadaEm || new Date();

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA', finalizada_em = ?, motivo = ?
      WHERE id = ?
      `,
      finalizadaEm,
      payload.motivo || null,
      sessaoId,
    );

    return { ok: true, status: 'FINALIZADA', finalizadaEm };
  }

  async listarSessoesAtivas() {
    await this.ensureSchema();

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = s.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const rows = await prisma.$queryRawUnsafe<Array<any>>(`
            SELECT s.id, s.entregador_id, s.dispositivo_id, s.venda_id, s.iniciada_em,
              ${selectEntregadorNome},
              p.latitude, p.longitude, p.precisao, p.velocidade, p.bateria, p.fonte, p.registrado_em, p.raw
      FROM rastreio_sessao s
      ${joinEntregador}
      LEFT JOIN rastreio_ponto p ON p.id = (
        SELECT p2.id FROM rastreio_ponto p2
        WHERE p2.sessao_id = s.id
        ORDER BY p2.registrado_em DESC
        LIMIT 1
      )
      WHERE s.status = 'ATIVA'
      ORDER BY s.iniciada_em DESC
      LIMIT 200
    `);

    const agora = Date.now();

    return rows.map((item) => {
      const ultimoPontoMs = item.registrado_em ? new Date(item.registrado_em).getTime() : null;
      const minutosSemAtualizar = ultimoPontoMs ? Math.floor((agora - ultimoPontoMs) / 60000) : null;
      const conexaoStatus = minutosSemAtualizar === null
        ? 'SEM_PONTOS'
        : minutosSemAtualizar > STALE_MINUTES_DEFAULT
          ? 'DESATUALIZADA'
          : 'ONLINE';

      const raw = lerRawJson(item.raw);

      return {
        sessaoId: item.id,
        entregadorId: item.entregador_id,
        entregadorNome: item.entregador_nome || 'Entregador nao encontrado',
        dispositivoId: item.dispositivo_id,
        vendaId: item.venda_id,
        iniciadaEm: item.iniciada_em,
        conexaoStatus,
        minutosSemAtualizar,
        ultimoPonto: item.registrado_em
          ? {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            precisao: item.precisao === null ? null : Number(item.precisao),
            velocidade: item.velocidade === null ? null : Number(item.velocidade),
            bateria: item.bateria === null ? null : Number(item.bateria),
            fonte: item.fonte,
            registradoEm: item.registrado_em,
            nota: typeof raw?.nota === 'string' ? raw.nota : null,
          }
          : null,
      };
    });
  }

  async resumoOperacional(staleMinutes = STALE_MINUTES_DEFAULT) {
    await this.ensureSchema();
    const sessoes = await this.listarSessoesAtivas();
    const staleLimit = Math.max(1, Math.min(60, Number(staleMinutes) || STALE_MINUTES_DEFAULT));

    const totalAtivas = sessoes.length;
    const online = sessoes.filter((item) => item.conexaoStatus === 'ONLINE').length;
    const semPontos = sessoes.filter((item) => item.conexaoStatus === 'SEM_PONTOS').length;
    const desatualizadas = sessoes.filter((item) => (item.minutosSemAtualizar ?? 0) > staleLimit).length;

    return {
      totalAtivas,
      online,
      semPontos,
      desatualizadas,
      staleMinutes: staleLimit,
      checkedAt: new Date().toISOString(),
    };
  }

  async obterUltimaPosicaoEntregador(entregadorId: string) {
    await this.ensureSchema();

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT p.latitude, p.longitude, p.precisao, p.velocidade, p.direcao, p.bateria, p.fonte, p.registrado_em,
             s.id AS sessao_id, s.status
      FROM rastreio_ponto p
      INNER JOIN rastreio_sessao s ON s.id = p.sessao_id
      WHERE s.entregador_id = ?
      ORDER BY p.registrado_em DESC
      LIMIT 1
      `,
      entregadorId,
    );

    if (!rows[0]) return null;

    const item = rows[0];
    return {
      sessaoId: item.sessao_id,
      statusSessao: item.status,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      precisao: item.precisao === null ? null : Number(item.precisao),
      velocidade: item.velocidade === null ? null : Number(item.velocidade),
      direcao: item.direcao === null ? null : Number(item.direcao),
      bateria: item.bateria === null ? null : Number(item.bateria),
      fonte: item.fonte,
      registradoEm: item.registrado_em,
    };
  }

  async listarPontosSessao(sessaoId: string, limit = 500) {
    await this.ensureSchema();
    const safeLimit = Math.max(1, Math.min(2000, Number(limit) || 500));

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, latitude, longitude, precisao, velocidade, direcao, bateria, fonte, registrado_em, raw
      FROM rastreio_ponto
      WHERE sessao_id = ?
      ORDER BY registrado_em DESC
      LIMIT ?
      `,
      sessaoId,
      safeLimit,
    );

    return rows.map((item) => ({
      id: item.id,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      precisao: item.precisao === null ? null : Number(item.precisao),
      velocidade: item.velocidade === null ? null : Number(item.velocidade),
      direcao: item.direcao === null ? null : Number(item.direcao),
      bateria: item.bateria === null ? null : Number(item.bateria),
      fonte: item.fonte,
      registradoEm: item.registrado_em,
      nota: typeof lerRawJson(item.raw)?.nota === 'string' ? lerRawJson(item.raw)?.nota : null,
    }));
  }

  async obterRastreioPublico(sessaoId: string, limit = 60) {
    await this.ensureSchema();
    const safeLimit = Math.max(1, Math.min(120, Number(limit) || 60));

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = s.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT s.id, s.entregador_id, s.dispositivo_id, s.venda_id, s.status, s.iniciada_em, s.finalizada_em, s.motivo,
             ${selectEntregadorNome}
      FROM rastreio_sessao s
      ${joinEntregador}
      WHERE s.id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');

    const pontos = await this.listarPontosSessao(sessaoId, safeLimit);
    const ultimaPosicao = pontos[0] || null;

    const ultimoPontoComNota = pontos.find((item) => item.nota) || null;

    return {
      sessaoId: sessao.id,
      entregadorNome: sessao.entregador_nome || 'Entregador nao encontrado',
      vendaId: sessao.venda_id,
      status: sessao.status,
      motivo: sessao.motivo,
      iniciadaEm: sessao.iniciada_em,
      finalizadaEm: sessao.finalizada_em,
      ultimaPosicao,
      notaAtual: ultimaPosicao?.nota || ultimoPontoComNota?.nota || null,
      pontos,
      atualizadaEm: ultimaPosicao?.registradoEm || sessao.finalizada_em || sessao.iniciada_em,
    };
  }
}
