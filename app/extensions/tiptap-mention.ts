import { Node, mergeAttributes } from '@tiptap/vue-3'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'

export interface MentionNodeAttrs {
  'data-mention-type': string
  'data-mention-id': string
  label: string
}

export interface MentionOptions {
  suggestion: Partial<SuggestionOptions>
}

export const MentionExtension = Node.create<MentionOptions>({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      'data-mention-type': { default: 'user' },
      'data-mention-id': { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs['data-mention-type'] as string
    const label = node.attrs.label as string

    const colorMap: Record<string, string> = {
      user: 'background:#DBEAFE;color:#1D4ED8;',
      item: 'background:#DCFCE7;color:#15803D;',
      board: 'background:#EDE9FE;color:#6D28D9;',
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-mention': '',
        class: 'mention',
        style: `${colorMap[type] || ''}padding:1px 6px;border-radius:4px;font-weight:500;font-size:0.9em;`,
      }),
      `@${label}`,
    ]
  },

  renderText({ node }) {
    return `@${node.attrs.label}`
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) return false

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true
              tr.insertText('', pos, pos + node.nodeSize)
              return false
            }
          })

          return isMention
        }),
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        allowSpaces: false,
        ...this.options.suggestion,
      }),
    ]
  },
})
