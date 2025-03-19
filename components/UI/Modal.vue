
<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        @click="closeOnBackdropClick ? $emit('update:modelValue', false) : null"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
      >
        <div
          class="modal-container"
          :class="{ 'modal-container--fullscreen': fullscreen }"
          @click.stop
          ref="modalRef"
        >
          <div class="modal-header" v-if="$slots.header || showCloseButton || title">
            <slot name="header">
              <h2 v-if="title" :id="titleId" class="modal-title">{{ title }}</h2>
            </slot>
            <button
              v-if="showCloseButton"
              @click="$emit('update:modelValue', false)"
              class="modal-close-button"
              aria-label="Close modal"
              type="button"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-content" :id="descriptionId">
            <slot></slot>
          </div>
          <div class="modal-footer" v-if="$slots.footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  // v-model for showing/hiding the modal
  modelValue: {
    type: Boolean,
    default: false
  },
  // Title for the modal (optional)
  title: {
    type: String,
    default: ''
  },
  // Whether to show the close button in the header
  showCloseButton: {
    type: Boolean,
    default: true
  },
  // Whether clicking the backdrop should close the modal
  closeOnBackdropClick: {
    type: Boolean,
    default: true
  },
  // Whether to close the modal when ESC key is pressed
  closeOnEsc: {
    type: Boolean,
    default: true
  },
  // Whether the modal should take up the full screen
  fullscreen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const modalRef = ref(null);
const titleId = computed(() => `modal-title-${Math.random().toString(36).substring(2, 11)}`);
const descriptionId = computed(() => `modal-description-${Math.random().toString(36).substring(2, 11)}`);

// Elements that were focusable before modal opened
let focusableElementsBeforeModal = [];

// List of focusable selectors for focus trap
const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details',
  'summary'
];

// Store the element that had focus before modal opened
let previouslyFocusedElement = null;

// Trap focus inside modal
function trapFocus(event) {
  if (!modalRef.value) return;
  
  const focusableElements = Array.from(
    modalRef.value.querySelectorAll(focusableSelectors.join(','))
  ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  
  if (focusableElements.length === 0) return;
  
  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  
  // If tab is pressed and shift is not held, focus the first element when on the last element
  if (event.key === 'Tab' && !event.shiftKey && document.activeElement === lastFocusableElement) {
    event.preventDefault();
    firstFocusableElement.focus();
  }
  
  // If tab is pressed and shift is held, focus the last element when on the first element
  if (event.key === 'Tab' && event.shiftKey && document.activeElement === firstFocusableElement) {
    event.preventDefault();
    lastFocusableElement.focus();
  }
}

// Handle keyboard events (ESC to close)
function handleKeyDown(event) {
  if (event.key === 'Escape' && props.closeOnEsc) {
    event.preventDefault();
    emitClose();
  }
  
  if (event.key === 'Tab') {
    trapFocus(event);
  }
}

// Lock scroll on body when modal is open
function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
}

// Unlock scroll on body when modal is closed
function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

// Store reference to currently active element
function storeActiveElement() {
  previouslyFocusedElement = document.activeElement;
  focusableElementsBeforeModal = Array.from(document.querySelectorAll(focusableSelectors.join(',')));
}

// Focus first focusable element in modal
function focusFirstElement() {
  if (!modalRef.value) return;
  
  nextTick(() => {
    const focusableElements = Array.from(modalRef.value.querySelectorAll(focusableSelectors.join(',')))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    
    if (focusableElements.length > 0) {
      // Focus the first interactive element
      focusableElements[0].focus();
    } else {
      // If no focusable elements, focus the modal itself
      modalRef.value.setAttribute('tabindex', '-1');
      modalRef.value.focus();
    }
  });
}

// Restore focus to element that had focus before modal opened
function restoreFocus() {
  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
    previouslyFocusedElement = null;
  }
}

function emitClose() {
  if (props.modelValue) {
    emit('update:modelValue', false);
  }
}

// Watch for changes in modal visibility
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Modal is being opened
    storeActiveElement();
    nextTick(() => {
      lockScroll();
      focusFirstElement();
      document.addEventListener('keydown', handleKeyDown);
    });
  } else {
    // Modal is being closed
    unlockScroll();
    restoreFocus();
    document.removeEventListener('keydown', handleKeyDown);
  }
}, { immediate: true });

// Clean up event listeners when component is unmounted
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
  if (props.modelValue) {
    unlockScroll();
  }
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
  box-sizing: border-box;
}

.modal-container {
  background-color: #ffffff;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  width: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.modal-container--fullscreen {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  border-radius: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
}

.modal-close-button {
  background: transparent;
  border: none;
  color: #888888;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  margin: -4px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close-button:hover {
  color: #333333;
}

.modal-close-button:focus {
  outline: none;
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.98);
}
</style>