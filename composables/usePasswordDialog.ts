
import { ref } from 'vue';

export function usePasswordDialog() {
  const passwordRef = ref<HTMLDialogElement | null>(null);
  const passwordInput = ref('');

  const showPasswordDialog = () => {
    passwordRef.value?.showModal();

    return new Promise<string | null>((resolve) => {
      const onClose = () => {
        passwordRef.value?.removeEventListener('close', onClose);
        resolve(passwordInput.value || null);
        passwordInput.value = ''; // Clear password after use
      };
      passwordRef.value?.addEventListener('close', onClose);
    });
  };

  const closePasswordDialog = () => {
    passwordRef.value?.close();
  };

  const submitPassword = () => {
    closePasswordDialog();
  };

  return {
    passwordRef,
    passwordInput,
    showPasswordDialog,
    closePasswordDialog,
    submitPassword
  };
}