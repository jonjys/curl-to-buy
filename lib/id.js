import { randomBytes } from 'crypto'

export function newId() {
  return randomBytes(5).toString('hex')
}
