import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMockApiBehaviorService,
  MOCK_API_DELAY_MODE,
  MOCK_API_OUTCOME,
} from './mockApiBehavior'

function createRandomSequence(...values: number[]) {
  let index = 0
  return vi.fn(() => values[index++] ?? 1)
}

describe('createMockApiBehaviorService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [MOCK_API_OUTCOME.SUCCESS, false],
    [MOCK_API_OUTCOME.FAILURE, true],
  ] as const)('resolves explicit %s without sampling outcome', (outcome, expected) => {
    const random = createRandomSequence(0)
    const behavior = createMockApiBehaviorService(random)

    expect(
      behavior.resolve({ outcome, delay: MOCK_API_DELAY_MODE.NONE }),
    ).toEqual({ shouldFail: expected, delayMs: 0 })
    expect(random).not.toHaveBeenCalled()
  })

  it('selects random failure below the 10 percent boundary', () => {
    const behavior = createMockApiBehaviorService(createRandomSequence(0.099999))

    expect(
      behavior.resolve({ delay: MOCK_API_DELAY_MODE.NONE }).shouldFail,
    ).toBe(true)
  })

  it('does not select random failure at the 10 percent boundary', () => {
    const behavior = createMockApiBehaviorService(createRandomSequence(0.1))

    expect(
      behavior.resolve({ delay: MOCK_API_DELAY_MODE.NONE }).shouldFail,
    ).toBe(false)
  })

  it('selects a 300ms random delay at the lower duration boundary', () => {
    const behavior = createMockApiBehaviorService(createRandomSequence(0.099999, 0))

    expect(
      behavior.resolve({
        outcome: MOCK_API_OUTCOME.SUCCESS,
        delay: MOCK_API_DELAY_MODE.RANDOM,
      }).delayMs,
    ).toBe(300)
  })

  it('selects a 2000ms random delay at the upper duration boundary', () => {
    const behavior = createMockApiBehaviorService(
      createRandomSequence(0.099999, 0.999999999999),
    )

    expect(
      behavior.resolve({
        outcome: MOCK_API_OUTCOME.SUCCESS,
        delay: MOCK_API_DELAY_MODE.RANDOM,
      }).delayMs,
    ).toBe(2000)
  })

  it('does not select random delay at the 10 percent boundary', () => {
    const behavior = createMockApiBehaviorService(createRandomSequence(0.1))

    expect(
      behavior.resolve({
        outcome: MOCK_API_OUTCOME.SUCCESS,
        delay: MOCK_API_DELAY_MODE.RANDOM,
      }).delayMs,
    ).toBe(0)
  })

  it('resolves random failure and delay independently', () => {
    const behavior = createMockApiBehaviorService(createRandomSequence(0, 0, 0))

    expect(behavior.resolve()).toEqual({ shouldFail: true, delayMs: 300 })
  })

  it('uses an explicit numeric delay without sampling delay', () => {
    const random = createRandomSequence(0)
    const behavior = createMockApiBehaviorService(random)

    expect(
      behavior.resolve({ outcome: MOCK_API_OUTCOME.SUCCESS, delay: 725 }),
    ).toEqual({ shouldFail: false, delayMs: 725 })
    expect(random).not.toHaveBeenCalled()
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid numeric delay %s',
    (delay) => {
      const behavior = createMockApiBehaviorService()

      expect(() =>
        behavior.resolve({ outcome: MOCK_API_OUTCOME.SUCCESS, delay }),
      ).toThrow(RangeError)
    },
  )

  it('waits until the exact delay has elapsed', async () => {
    vi.useFakeTimers()
    const behavior = createMockApiBehaviorService()
    let hasSettled = false
    const request = behavior.wait(300).then(() => {
      hasSettled = true
    })

    await vi.advanceTimersByTimeAsync(299)
    expect(hasSettled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await request
    expect(hasSettled).toBe(true)
  })
})
