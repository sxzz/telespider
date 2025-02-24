import { expect, test } from 'vitest'
import { getNextMessageId, mergeMessageRanges } from '../src/services/message'
import type { MessageRange } from '../src/db/models'

function $(...ranges: MessageRange[]): MessageRange[] {
  return ranges
}

test('mergeMessageRanges', () => {
  expect(mergeMessageRanges([])).toEqual([])
  expect(mergeMessageRanges($([1, 3], [5, 7]))).toEqual($([1, 3], [5, 7]))
  expect(mergeMessageRanges($([1, 4], [5, 7], [8, 10]))).toEqual($([1, 10]))
  expect(mergeMessageRanges($([1, 4], [2, 9], [8, 10]))).toEqual($([1, 10]))
  expect(mergeMessageRanges($([1, 4], [2, 9], [11, 12]))).toEqual(
    $([1, 9], [11, 12]),
  )
})

test('getNextMessageId', () => {
  expect(getNextMessageId($([1, 9]), 9)).toBe(null)
  expect(getNextMessageId($([1, 3], [5, 7]), 2)).toBe(null)
  expect(getNextMessageId($([1000, 3000], [5000, 7000]), 2000)).toBe(999)
  expect(getNextMessageId($([3, 15]), 15)).toBe(2)
})
