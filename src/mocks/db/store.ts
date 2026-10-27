import { persistScenario, scenarios, type ScenarioConfig, type ScenarioId } from '../scenarios'
import { createSeed } from './seed'
import type { Db } from './types'

/**
 * Estado único do "servidor" simulado. Vive em memória e é persistido no
 * localStorage para sobreviver a refresh. `resetDb` restaura o seed conhecido.
 */
const DB_KEY = 'mock:db:v1'
const SCHEMA = 1

let db: Db | null = null
let scenario: ScenarioConfig = scenarios.success
const resetListeners = new Set<() => void>()

export function getDb(): Db {
  if (!db) throw new Error('[mocks] db não inicializado')
  return db
}

export function getScenario(): ScenarioConfig {
  return scenario
}

/** Executa uma mutação e persiste o resultado. */
export function mutate<T>(fn: (db: Db) => T): T {
  const result = fn(getDb())
  persist()
  return result
}

export function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* quota/indisponível: segue em memória */
  }
}

function load(): Db | null {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Db
    return parsed.schema === SCHEMA ? parsed : null
  } catch {
    return null
  }
}

export async function initDb(config: ScenarioConfig, forceReset: boolean) {
  scenario = config
  db = forceReset ? null : load()
  if (!db) {
    db = await createSeed()
    persist()
  }
  // Mantém abas sincronizadas: outra aba gravou o estado → recarrega.
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue) as Db
      } catch {
        /* ignora */
      }
    }
  })
}

/** Restaura integralmente um cenário conhecido (seed + configuração). */
export async function resetDb(id: ScenarioId = scenario.id) {
  scenario = scenarios[id]
  persistScenario(id)
  db = await createSeed()
  persist()
  for (const fn of resetListeners) fn()
}

export function onReset(fn: () => void) {
  resetListeners.add(fn)
  return () => resetListeners.delete(fn)
}
