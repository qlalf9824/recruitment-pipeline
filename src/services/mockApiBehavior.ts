export const MOCK_API_OUTCOME = {
  RANDOM: 'random',
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const
export type MockApiOutcome =
  (typeof MOCK_API_OUTCOME)[keyof typeof MOCK_API_OUTCOME]

export const MOCK_API_DELAY_MODE = {
  RANDOM: 'random',
  NONE: 'none',
} as const
export type MockApiDelayMode =
  (typeof MOCK_API_DELAY_MODE)[keyof typeof MOCK_API_DELAY_MODE]
export type MockApiDelay = MockApiDelayMode | number

export interface MockApiBehaviorOptions {
  outcome?: MockApiOutcome
  delay?: MockApiDelay
}

export interface ResolvedMockApiBehavior {
  shouldFail: boolean
  delayMs: number
}

export interface MockApiBehaviorService {
  resolve(options?: MockApiBehaviorOptions): ResolvedMockApiBehavior
  wait(delayMs: number): Promise<void>
}

const RANDOM_FAILURE_RATE = 0.1
const RANDOM_DELAY_RATE = 0.1
const MIN_RANDOM_DELAY_MS = 300
const MAX_RANDOM_DELAY_MS = 2_000

function resolveShouldFail(
  outcome: MockApiOutcome,
  random: () => number,
): boolean {
  if (outcome === MOCK_API_OUTCOME.SUCCESS) return false
  if (outcome === MOCK_API_OUTCOME.FAILURE) return true
  return random() < RANDOM_FAILURE_RATE
}

function assertValidDelay(delay: number): void {
  if (!Number.isFinite(delay) || !Number.isInteger(delay) || delay < 0) {
    throw new RangeError('Mock API delay must be a non-negative integer.')
  }
}

function resolveDelayMs(delay: MockApiDelay, random: () => number): number {
  if (typeof delay === 'number') {
    assertValidDelay(delay)
    return delay
  }
  if (delay === MOCK_API_DELAY_MODE.NONE) return 0
  if (random() >= RANDOM_DELAY_RATE) return 0

  return (
    Math.floor(
      random() * (MAX_RANDOM_DELAY_MS - MIN_RANDOM_DELAY_MS + 1),
    ) + MIN_RANDOM_DELAY_MS
  )
}

export function createMockApiBehaviorService(
  random: () => number = Math.random,
): MockApiBehaviorService {
  return {
    resolve(options = {}) {
      const shouldFail = resolveShouldFail(
        options.outcome ?? MOCK_API_OUTCOME.RANDOM,
        random,
      )
      const delayMs = resolveDelayMs(
        options.delay ?? MOCK_API_DELAY_MODE.RANDOM,
        random,
      )
      return { shouldFail, delayMs }
    },
    wait(delayMs) {
      if (delayMs === 0) return Promise.resolve()
      return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
      })
    },
  }
}
