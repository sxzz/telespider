import process from 'node:process'
import Fuse from 'fuse.js'
import { select as _select, type SelectOption } from 'inquirer-select-pro'

export async function select<T>(
  message: string,
  options: SelectOption<T>[],
  defaultValue?: T[],
) {
  const fuse = new Fuse(options, {
    keys: ['name'],
  })
  return await _select({
    message,
    required: true,
    clearInputWhenSelected: true,
    inputDelay: 0,
    canToggleAll: true,
    loop: true,
    defaultValue,
    options(input) {
      if (!input) return options
      return fuse.search(input).map(({ item }) => item)
    },
    theme: {
      style: {
        renderSelectedOptions() {
          return ''
        },
      },
    },
    pageSize: process.stdout.rows - 10,
  }).catch(() => null)
}
