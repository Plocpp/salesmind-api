import * as SecureStore from 'expo-secure-store';

declare const require: (moduleName: string) => any;

const LOCATION_TASK_NAME = 'salesmind-background-location-task';

const STORAGE_KEYS = {
  token: 'salesmind_rastreio_token',
  sessionId: 'salesmind_rastreio_sessao_id',
  entregadorId: 'salesmind_rastreio_entregador_id',
  vendaId: 'salesmind_rastreio_venda_id',
  notaAtual: 'salesmind_rastreio_nota_atual',
  filaPontos: 'salesmind_rastreio_fila_pontos',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://salesmind-api.onrender.com';

let cachedLocationModule: typeof import('expo-location') | null = null;
let cachedTaskManagerModule: typeof import('expo-task-manager') | null = null;

function loadLocationModule() {
  if (cachedLocationModule) return cachedLocationModule;
  try {
    cachedLocationModule = require('expo-location') as typeof import('expo-location');
    return cachedLocationModule;
  } catch {
    return null;
  }
}

function loadTaskManagerModule() {
  if (cachedTaskManagerModule) return cachedTaskManagerModule;
  try {
    cachedTaskManagerModule = require('expo-task-manager') as typeof import('expo-task-manager');
    return cachedTaskManagerModule;
  } catch {
    return null;
  }
}

type IniciarSessaoInput = {
  entregadorId: string;
  vendaId?: string;
  token: string;
};

type PontoPayload = {
  latitude: number;
  longitude: number;
  precisao?: number;
  velocidade?: number;
  fonte?: string;
  registradoEm: string;
  raw?: {
    nota?: string;
  };
};

type EstadoRastreio = {
  ativo: boolean;
  sessionId: string;
  entregadorId: string;
  vendaId: string;
  token: string;
  notaAtual: string;
  pendentes: number;
};

async function loadQueue() {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.filaPontos);
  if (!raw) return [] as PontoPayload[];

  try {
    const parsed = JSON.parse(raw) as PontoPayload[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveQueue(queue: PontoPayload[]) {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.filaPontos);
    return;
  }

  const limited = queue.slice(-200);
  await SecureStore.setItemAsync(STORAGE_KEYS.filaPontos, JSON.stringify(limited));
}

async function enqueuePoint(payload: PontoPayload) {
  const queue = await loadQueue();
  queue.push(payload);
  await saveQueue(queue);
}

async function obterNotaAtiva() {
  const nota = await SecureStore.getItemAsync(STORAGE_KEYS.notaAtual);
  return (nota || '').trim();
}

async function flushQueue(token: string, sessaoId: string) {
  const queue = await loadQueue();
  if (!queue.length) return { enviados: 0, pendentes: 0 };

  let enviados = 0;
  const restantes: PontoPayload[] = [];

  for (const point of queue) {
    try {
      await post(`/rastreio/mobile/sessoes/${sessaoId}/pontos`, token, point);
      enviados += 1;
    } catch {
      restantes.push(point);
    }
  }

  await saveQueue(restantes);
  return { enviados, pendentes: restantes.length };
}

async function enviarOuEnfileirar(token: string, sessaoId: string, payload: PontoPayload) {
  try {
    await flushQueue(token, sessaoId);
    await post(`/rastreio/mobile/sessoes/${sessaoId}/pontos`, token, payload);
    return { enviado: true };
  } catch {
    await enqueuePoint(payload);
    return { enviado: false };
  }
}

async function post(path: string, token: string, payload: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

export function prepararRastreioBackground() {
  const TaskManager = loadTaskManagerModule();
  if (!TaskManager) return false;

  try {
    if (typeof TaskManager.isTaskDefined === 'function' && !TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        try {
          if (error) return;

          const token = await SecureStore.getItemAsync(STORAGE_KEYS.token);
          const sessaoId = await SecureStore.getItemAsync(STORAGE_KEYS.sessionId);
          if (!token || !sessaoId) return;
          const nota = await obterNotaAtiva();

          const payload = data as { locations?: Array<{ coords?: { latitude: number; longitude: number; accuracy?: number | null; speed?: number | null } }> } | undefined;
          const location = payload?.locations?.[0];
          if (!location?.coords) return;

          await enviarOuEnfileirar(token, sessaoId, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            precisao: location.coords.accuracy ?? undefined,
            velocidade: location.coords.speed ?? undefined,
            fonte: 'GPS_BACKGROUND',
            registradoEm: new Date().toISOString(),
            raw: nota ? { nota } : undefined,
          });
        } catch {
          // Falhas no background nao devem derrubar o task manager.
        }
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function iniciarRastreio(input: IniciarSessaoInput) {
  const prepared = prepararRastreioBackground();
  if (!prepared) {
    throw new Error('Modulo de tarefa em segundo plano indisponivel no dispositivo.');
  }

  const Location = loadLocationModule();
  if (!Location) {
    throw new Error('Modulo de localizacao indisponivel no dispositivo.');
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    throw new Error('Permissao de localizacao em primeiro plano nao concedida.');
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    throw new Error('Permissao de localizacao em segundo plano nao concedida.');
  }

  await SecureStore.setItemAsync(STORAGE_KEYS.token, input.token);
  await SecureStore.setItemAsync(STORAGE_KEYS.entregadorId, input.entregadorId);
  await SecureStore.setItemAsync(STORAGE_KEYS.vendaId, input.vendaId || '');

  const sessao = await post('/rastreio/mobile/sessoes/iniciar', input.token, {
    entregadorId: input.entregadorId,
    vendaId: input.vendaId || undefined,
    iniciadaEm: new Date().toISOString(),
  });

  const sessaoId = sessao?.sessaoId as string;
  if (!sessaoId) {
    throw new Error('Resposta invalida ao iniciar sessao.');
  }

  await SecureStore.setItemAsync(STORAGE_KEYS.sessionId, sessaoId);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.filaPontos);

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!started) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'SalesMind Rastreio ativo',
        notificationBody: 'A localizacao esta sendo enviada para o painel.',
      },
      showsBackgroundLocationIndicator: true,
    });
  }

  return { sessaoId };
}

export async function finalizarRastreio(motivo?: string) {
  const Location = loadLocationModule();
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.token);
  const sessaoId = await SecureStore.getItemAsync(STORAGE_KEYS.sessionId);

  if (token && sessaoId) {
    await flushQueue(token, sessaoId);
    await post(`/rastreio/mobile/sessoes/${sessaoId}/finalizar`, token, {
      motivo: motivo || 'FINALIZADO_NO_APP',
      finalizadaEm: new Date().toISOString(),
    });
  }

  if (Location) {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }

  await SecureStore.deleteItemAsync(STORAGE_KEYS.sessionId);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.filaPontos);
}

export async function isRastreioAtivo() {
  const Location = loadLocationModule();
  if (!Location) return false;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function sincronizarPendencias() {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.token);
  const sessaoId = await SecureStore.getItemAsync(STORAGE_KEYS.sessionId);

  if (!token || !sessaoId) {
    const queue = await loadQueue();
    return { enviados: 0, pendentes: queue.length };
  }

  return flushQueue(token, sessaoId);
}

export async function obterEstadoRastreio(): Promise<EstadoRastreio> {
  const [ativo, sessionId, entregadorId, vendaId, token, queue] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.sessionId).then((id) => Boolean(id)),
    SecureStore.getItemAsync(STORAGE_KEYS.sessionId),
    SecureStore.getItemAsync(STORAGE_KEYS.entregadorId),
    SecureStore.getItemAsync(STORAGE_KEYS.vendaId),
    SecureStore.getItemAsync(STORAGE_KEYS.token),
    loadQueue(),
  ]);

  return {
    ativo,
    sessionId: sessionId || '',
    entregadorId: entregadorId || '',
    vendaId: vendaId || '',
    token: token || '',
    notaAtual: (await SecureStore.getItemAsync(STORAGE_KEYS.notaAtual)) || '',
    pendentes: queue.length,
  };
}

export async function atualizarNotaAtiva(nota: string) {
  const value = (nota || '').trim();
  if (!value) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.notaAtual);
    return '';
  }

  await SecureStore.setItemAsync(STORAGE_KEYS.notaAtual, value);
  return value;
}

export async function limparNotaAtiva() {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.notaAtual);
}
