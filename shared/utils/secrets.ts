import type { BoardItem, WidgetKind } from '../types/board'

export const SECRET_WIDGET_KINDS = ['secret_note', 'secret_kv'] as const

export function isSecretWidgetKind(kind: WidgetKind): kind is typeof SECRET_WIDGET_KINDS[number] {
  return SECRET_WIDGET_KINDS.includes(kind as typeof SECRET_WIDGET_KINDS[number])
}

export function isSecretWidget(item: BoardItem): boolean {
  return isSecretWidgetKind(item.kind)
}

export function isVaultAllowedKind(kind: WidgetKind): boolean {
  return kind === 'text' || isSecretWidgetKind(kind)
}

export function isVaultAllowedItem(item: BoardItem): boolean {
  return isVaultAllowedKind(item.kind)
}
