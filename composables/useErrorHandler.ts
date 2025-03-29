export const useErrorHandler = () => {
    const isErrorModalVisible = useState('error-modal-visible', () => false)
    const isCustomCallback = useState('is-custom-callback', () => false)

    const errorTitle = useState('error-title', () => 'Error')
  
    const errorMessage = useState('error-message', () => '')
    
    const confirmCallback = useState<(() => void) | null>('confirm-callback', () => null)

    const cancelCallback = useState<(() => void) | null>('cancel-callback', () => null)
  
    const triggerError = (options: {
      message: string, 
      title?: string, 
      onConfirm?: () => void,
      onCancel?: () => void
    }) => {
       
      // Set error details
      errorMessage.value = options.message
      errorTitle.value = options.title || 'Error'
      
      // Store callbacks
      confirmCallback.value = options.onConfirm || null
      cancelCallback.value = options.onCancel || null
  
      // Show the modal
      isErrorModalVisible.value = true
    }
  
    const handleConfirm = () => {
      // Call confirm callback if exists
      confirmCallback.value?.()
      
      // Close the modal
      isErrorModalVisible.value = false
      
      // Reset callbacks
      confirmCallback.value = null
      cancelCallback.value = null
    }
  
    const handleCancel = () => {
      // Call cancel callback if exists
      cancelCallback.value?.()
      
      // Close the modal
      isErrorModalVisible.value = false
      
      // Reset callbacks
      confirmCallback.value = null
      cancelCallback.value = null
    }
  
    return {
      isErrorModalVisible,
      errorTitle,
      errorMessage,
      isCustomCallback,
      triggerError,
      handleConfirm,
      handleCancel
    }
  }