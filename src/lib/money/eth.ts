import Decimal from 'decimal.js'
import type { EthString } from '@/lib/api/contracts'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

const eth = (v: EthString | number) => new Decimal(v)

export const ethAdd = (a: EthString, b: EthString): EthString => eth(a).plus(eth(b)).toFixed(18)
export const ethSub = (a: EthString, b: EthString): EthString => eth(a).minus(eth(b)).toFixed(18)
export const ethMul = (a: EthString, qty: number): EthString => {
  if (!Number.isInteger(qty)) throw new Error('Quantidade deve ser inteira')
  return eth(a).times(qty).toFixed(18)
}
export const ethEquals = (a: EthString, b: EthString) => eth(a).eq(eth(b))

/** Apresentação: até 4 casas, sem zeros à direita desnecessários. */
export function formatEth(value: EthString): string {
  const d = eth(value)
  const fixed = d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4)
  return `${fixed.replace(/\.?0+$/, '') || '0'} ETH`
}
