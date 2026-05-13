-- Modelagem Financeira Profissional para ERP multiempresa, orientado a eventos e auditavel
-- Banco alvo: PostgreSQL 14+

CREATE SCHEMA IF NOT EXISTS financeiro;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_lancamento_enum') THEN
    CREATE TYPE financeiro.tipo_lancamento_enum AS ENUM (
      'RECEITA',
      'DESPESA',
      'TRANSFERENCIA',
      'AJUSTE',
      'ESTORNO',
      'TAXA',
      'COMISSAO',
      'IMPOSTO',
      'JUROS',
      'MULTA'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_lancamento_enum') THEN
    CREATE TYPE financeiro.status_lancamento_enum AS ENUM (
      'PENDENTE',
      'PAGO',
      'PARCIAL',
      'CANCELADO',
      'VENCIDO',
      'ESTORNADO',
      'CONCILIADO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_lancamento_enum') THEN
    CREATE TYPE financeiro.origem_lancamento_enum AS ENUM (
      'MERCADO_LIVRE',
      'SHOPEE',
      'AMAZON',
      'MAGALU',
      'PDV',
      'ERP',
      'MANUAL',
      'API',
      'BLING',
      'GATEWAY',
      'BANCO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_conta_enum') THEN
    CREATE TYPE financeiro.tipo_conta_enum AS ENUM ('CONTA_BANCARIA', 'CAIXA', 'CARTEIRA_DIGITAL', 'CONTA_TRANSITORIA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_conciliacao_enum') THEN
    CREATE TYPE financeiro.status_conciliacao_enum AS ENUM ('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'NAO_LOCALIZADO', 'CHARGEBACK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS financeiro.empresas (
  id UUID PRIMARY KEY,
  nome_fantasia VARCHAR(160) NOT NULL,
  razao_social VARCHAR(180),
  cnpj VARCHAR(18) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.canais_origem (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  origem financeiro.origem_lancamento_enum NOT NULL,
  codigo_externo VARCHAR(80),
  nome_exibicao VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, origem, COALESCE(codigo_externo, ''))
);

CREATE TABLE IF NOT EXISTS financeiro.centros_custo (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  codigo VARCHAR(40),
  nome VARCHAR(120) NOT NULL,
  pai_id UUID REFERENCES financeiro.centros_custo(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.categorias (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  nome VARCHAR(120) NOT NULL,
  tipo financeiro.tipo_lancamento_enum NOT NULL,
  parent_id UUID REFERENCES financeiro.categorias(id),
  nivel SMALLINT NOT NULL DEFAULT 1,
  cor VARCHAR(16),
  icone VARCHAR(40),
  regra_automatica JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.contas_financeiras (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  nome VARCHAR(120) NOT NULL,
  tipo financeiro.tipo_conta_enum NOT NULL,
  banco_codigo VARCHAR(10),
  agencia VARCHAR(20),
  conta_numero VARCHAR(32),
  chave_pix VARCHAR(140),
  saldo_atual NUMERIC(18,2) NOT NULL DEFAULT 0,
  saldo_bloqueado NUMERIC(18,2) NOT NULL DEFAULT 0,
  saldo_disponivel NUMERIC(18,2) GENERATED ALWAYS AS (saldo_atual - saldo_bloqueado) STORED,
  integracao_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.formas_pagamento (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  nome VARCHAR(80) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  gateway VARCHAR(80),
  taxa_percentual NUMERIC(8,4),
  taxa_fixa NUMERIC(18,2),
  prazo_recebimento_dias INTEGER,
  permite_antecipacao BOOLEAN NOT NULL DEFAULT FALSE,
  juros_percentual NUMERIC(8,4),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.fornecedores_financeiros (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  cnpj VARCHAR(18),
  ie VARCHAR(30),
  razao_social VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(160),
  banco VARCHAR(90),
  agencia VARCHAR(20),
  conta VARCHAR(32),
  chave_pix VARCHAR(140),
  condicoes_pagamento VARCHAR(120),
  score_interno SMALLINT,
  limite_credito NUMERIC(18,2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.lancamentos (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  descricao VARCHAR(220) NOT NULL,
  tipo financeiro.tipo_lancamento_enum NOT NULL,
  status financeiro.status_lancamento_enum NOT NULL DEFAULT 'PENDENTE',
  valor_bruto NUMERIC(18,2) NOT NULL,
  valor_liquido NUMERIC(18,2) NOT NULL,
  desconto NUMERIC(18,2) NOT NULL DEFAULT 0,
  juros NUMERIC(18,2) NOT NULL DEFAULT 0,
  multa NUMERIC(18,2) NOT NULL DEFAULT 0,
  categoria_id UUID REFERENCES financeiro.categorias(id),
  centro_custo_id UUID REFERENCES financeiro.centros_custo(id),
  conta_financeira_id UUID REFERENCES financeiro.contas_financeiras(id),
  forma_pagamento_id UUID REFERENCES financeiro.formas_pagamento(id),
  origem financeiro.origem_lancamento_enum NOT NULL,
  origem_referencia VARCHAR(120),
  competencia DATE NOT NULL,
  vencimento DATE,
  pagamento_em TIMESTAMP,
  conciliado_em TIMESTAMP,
  observacoes TEXT,
  pedido_id UUID,
  nota_fiscal_id UUID,
  cliente_id UUID,
  fornecedor_id UUID,
  marketplace VARCHAR(80),
  usuario_criacao_id UUID,
  usuario_ultima_edicao_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financeiro.lancamento_parcelas (
  id UUID PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES financeiro.lancamentos(id),
  numero_parcela INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC(18,2) NOT NULL,
  status financeiro.status_lancamento_enum NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (lancamento_id, numero_parcela)
);

CREATE TABLE IF NOT EXISTS financeiro.lancamento_baixas (
  id UUID PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES financeiro.lancamentos(id),
  conta_financeira_id UUID REFERENCES financeiro.contas_financeiras(id),
  data_baixa TIMESTAMP NOT NULL,
  valor_baixa NUMERIC(18,2) NOT NULL,
  observacao VARCHAR(240),
  usuario_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.conciliacoes_cartao (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  lancamento_id UUID REFERENCES financeiro.lancamentos(id),
  adquirente VARCHAR(80) NOT NULL,
  bandeira VARCHAR(40),
  nsu VARCHAR(80),
  parcela INTEGER,
  total_parcelas INTEGER,
  valor_venda NUMERIC(18,2) NOT NULL,
  valor_recebido NUMERIC(18,2) NOT NULL,
  taxa_aplicada_percentual NUMERIC(8,4),
  taxa_esperada_percentual NUMERIC(8,4),
  valor_diferenca NUMERIC(18,2) GENERATED ALWAYS AS (valor_venda - valor_recebido) STORED,
  antecipacao BOOLEAN NOT NULL DEFAULT FALSE,
  status status_conciliacao_enum NOT NULL DEFAULT 'PENDENTE',
  origem_arquivo VARCHAR(20),
  referencia_externa VARCHAR(120),
  data_venda DATE,
  data_recebimento DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.contas_pagar (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  fornecedor_id UUID REFERENCES financeiro.fornecedores_financeiros(id),
  lancamento_id UUID REFERENCES financeiro.lancamentos(id),
  documento VARCHAR(90),
  vencimento DATE NOT NULL,
  valor NUMERIC(18,2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'CRIADO',
  etapa_aprovacao VARCHAR(40) NOT NULL DEFAULT 'AGUARDANDO_APROVACAO',
  centro_custo_id UUID REFERENCES financeiro.centros_custo(id),
  recorrencia_regra VARCHAR(120),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.rateios_conta_pagar (
  id UUID PRIMARY KEY,
  conta_pagar_id UUID NOT NULL REFERENCES financeiro.contas_pagar(id),
  centro_custo_id UUID NOT NULL REFERENCES financeiro.centros_custo(id),
  percentual NUMERIC(7,4) NOT NULL,
  valor NUMERIC(18,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS financeiro.fluxo_caixa_diario (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  data_referencia DATE NOT NULL,
  saldo_inicial NUMERIC(18,2) NOT NULL,
  entradas_realizadas NUMERIC(18,2) NOT NULL DEFAULT 0,
  saidas_realizadas NUMERIC(18,2) NOT NULL DEFAULT 0,
  entradas_previstas NUMERIC(18,2) NOT NULL DEFAULT 0,
  saidas_previstas NUMERIC(18,2) NOT NULL DEFAULT 0,
  saldo_final_realizado NUMERIC(18,2) NOT NULL,
  saldo_final_previsto NUMERIC(18,2) NOT NULL,
  cenario VARCHAR(20) NOT NULL DEFAULT 'REALISTA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, data_referencia, cenario)
);

CREATE TABLE IF NOT EXISTS financeiro.documentos_financeiros (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  entidade_tipo VARCHAR(40) NOT NULL,
  entidade_id UUID NOT NULL,
  nome_arquivo VARCHAR(180) NOT NULL,
  mime_type VARCHAR(120),
  url_arquivo TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS financeiro.auditoria (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES financeiro.empresas(id),
  entidade VARCHAR(80) NOT NULL,
  entidade_id UUID NOT NULL,
  acao VARCHAR(40) NOT NULL,
  antes JSONB,
  depois JSONB,
  usuario_id UUID,
  request_id VARCHAR(120),
  origem VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro.outbox_eventos (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES financeiro.empresas(id),
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id UUID NOT NULL,
  evento_nome VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  tentativa INTEGER NOT NULL DEFAULT 0,
  disponivel_em TIMESTAMP NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMP,
  erro TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_vencimento ON financeiro.lancamentos (empresa_id, vencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON financeiro.lancamentos (status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_origem_referencia ON financeiro.lancamentos (origem, origem_referencia);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON financeiro.lancamentos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_status_data ON financeiro.conciliacoes_cartao (status, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status_vencimento ON financeiro.contas_pagar (status, vencimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_empresa_data ON financeiro.fluxo_caixa_diario (empresa_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade_data ON financeiro.auditoria (entidade, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_status_disponivel ON financeiro.outbox_eventos (status, disponivel_em);

CREATE OR REPLACE FUNCTION financeiro.fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lancamentos_touch_updated_at') THEN
    CREATE TRIGGER trg_lancamentos_touch_updated_at
    BEFORE UPDATE ON financeiro.lancamentos
    FOR EACH ROW EXECUTE FUNCTION financeiro.fn_touch_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_outbox_touch_updated_at') THEN
    CREATE TRIGGER trg_outbox_touch_updated_at
    BEFORE UPDATE ON financeiro.outbox_eventos
    FOR EACH ROW EXECUTE FUNCTION financeiro.fn_touch_updated_at();
  END IF;
END $$;
