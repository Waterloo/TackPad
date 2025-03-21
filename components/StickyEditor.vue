<template>
    <editor-content :editor="editor" class="h-full px-1 overflow-auto"/>
  </template>
  
  <script setup>
    import { Editor, EditorContent } from '@tiptap/vue-3'
    import StarterKit from '@tiptap/starter-kit'

    const props = defineProps({
      value: {
        type: String,
        default: '',
      },
    })

    const emit = defineEmits(['update'])
    const editor = ref(null)

    onMounted(() => {
      editor.value = new Editor({
        onUpdate: () => {
          emit('update', editor.value.getHTML())
        },
        extensions: [StarterKit],
        editorProps: {
          attributes: {
            class: 'p-2 prose focus:outline-none marker:text-black prose-li:leading-[0.75] prose-p:m-0 prose-headings:mb-0',
          }
        },
        content: props.value || "<h2>Welcome to your board! Try adding more notes and todo lists.</h2>",
      })
    })

    watch(() => props.value, (newValue) => {
      // Only update if editor content differs from prop value
      // to prevent cursor jump issues
      const currentContent = editor.value?.getHTML()
      if (newValue && newValue !== currentContent) {
        editor.value?.commands.setContent(newValue)
      }
    })

    onBeforeUnmount(() => {
      editor.value?.destroy()
    })
  </script>
  <style lang="scss">
  /* Basic editor styles */
  .tiptap {
    :first-child {
      margin-top: 0;
    }
  
    /* List styles */
    ul,
    ol {
        
      padding: 0 1rem;
      margin: 1.25rem 1rem 1.25rem 0.4rem;
  
      li p {
        margin-top: 0.25em;
        margin-bottom: 0.25em;
      }
    }
  
    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      line-height: 1.1;
      text-wrap: pretty;
    }
  
    h1,
    h2 {
      margin-top: 3.5rem;
      margin-bottom: 1.5rem;
    }
  
    h1 {
      font-size: 1.4rem;
    }
  
    h2 {
      font-size: 1.2rem;
    }
  
    h3 {
      font-size: 1.1rem;
    }
  
    h4,
    h5,
    h6 {
      font-size: 1rem;
    }
  
    /* Code and preformatted text styles */
    code {
      background-color: var(--purple-light);
      border-radius: 0.4rem;
      color: var(--black);
      font-size: 0.85rem;
      padding: 0.25em 0.3em;
    }
  
    pre {
      background: var(--black);
      border-radius: 0.5rem;
      color: var(--white);
      font-family: 'JetBrainsMono', monospace;
      margin: 1.5rem 0;
      padding: 0.75rem 1rem;
  
      code {
        background: none;
        color: inherit;
        font-size: 0.8rem;
        padding: 0;
      }
    }
  
    mark {
      background-color: #FAF594;
      border-radius: 0.4rem;
      box-decoration-break: clone;
      padding: 0.1rem 0.3rem;
    }
  
    blockquote {
      border-left: 3px solid var(--gray-3);
      margin: 1.5rem 0;
      padding-left: 1rem;
    }
  
    hr {
      border: none;
      border-top: 1px solid var(--gray-2);
      margin: 2rem 0;
    }
  }
  </style>