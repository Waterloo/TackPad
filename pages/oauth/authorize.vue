<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Authorize Application</h1>
        <p class="text-gray-600">Connect your TackPad account</p>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div>
            <h3 class="text-sm font-medium text-red-800">Authorization Error</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Authorization form -->
      <div v-else-if="app && user">
        <!-- App info -->
        <div class="mb-6">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ app.name }}</h2>
              <p class="text-sm text-gray-600" v-if="app.description">{{ app.description }}</p>
            </div>
          </div>
        </div>

        <!-- User info -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Signed in as:</p>
          <p class="font-medium text-gray-900">
            {{ user.firstName || user.username || 'Anonymous User' }}
            <span v-if="user.email" class="text-gray-500 text-sm ml-2">({{ user.email }})</span>
          </p>
        </div>

        <!-- Permissions -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-900 mb-3">This application will be able to:</h3>
          <ul class="space-y-2">
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm text-gray-700">Read your boards and their content</span>
            </li>
            <li class="flex items-start">
              <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm text-gray-700">Create and edit boards on your behalf</span>
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="flex space-x-3">
          <button
            @click="authorize"
            :disabled="authorizing"
            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="authorizing" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Authorizing...
            </span>
            <span v-else>Authorize</span>
          </button>
          
          <button
            @click="deny"
            class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const authorizing = ref(false)
const error = ref('')
const app = ref(null)
const user = ref(null)

onMounted(async () => {
  const { client_id, redirect_uri } = route.query
  
  if (!client_id) {
    error.value = 'Missing client_id parameter'
    loading.value = false
    return
  }

  try {
    // Get app info
    const appResponse = await $fetch('/api/oauth/app-info', {
      method: 'POST',
      body: { client_id }
    })
    app.value = appResponse

    // Get current user
    const userResponse = await $fetch('/api/profile')
    user.value = userResponse

    loading.value = false
  } catch (err) {
    console.error('OAuth authorize error:', err)
    error.value = err.data?.message || 'Failed to load authorization page'
    loading.value = false
  }
})

const authorize = async () => {
  if (!app.value || !user.value) return
  
  authorizing.value = true
  
  try {
    const response = await $fetch('/api/oauth/token', {
      method: 'POST',
      body: {
        client_id: route.query.client_id,
        profile_id: user.value.id,
        redirect_uri: route.query.redirect_uri
      }
    })

    // Redirect back with token
    const redirectUri = route.query.redirect_uri
    if (redirectUri) {
      const url = new URL(redirectUri)
      url.searchParams.set('token', response.access_token)
      window.location.href = url.toString()
    } else {
      // Fallback: show token to user
      error.value = `Token generated: ${response.access_token}`
    }
  } catch (err) {
    console.error('Token generation error:', err)
    error.value = err.data?.message || 'Failed to generate access token'
    authorizing.value = false
  }
}

const deny = () => {
  // Redirect back with error
  const redirectUri = route.query.redirect_uri
  if (redirectUri) {
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    window.location.href = url.toString()
  } else {
    // Fallback: go back to TackPad
    router.push('/')
  }
}
</script>
