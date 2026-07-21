import { defineStore } from 'pinia'
import type { Profile } from '~/shared/types/user'

  interface ProfileResponse extends Profile {
  isAnonymous: boolean
  usage: {
    consumption: number
    limit: number
    remaining: number
    plan: 'free' | 'paid'
  }
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<ProfileResponse | null>(null)
  const isAnonymous = ref(true)
  const isLoaded = ref(false)

  // ── Username prompt state ──────────────────────────────────────────────────
  const usernamePromptOpen = ref(false)
  let _usernamePromptResolve: ((value: boolean) => void) | null = null

  /**
   * If the current profile already has a username, returns true immediately.
   * Otherwise opens the UsernameModal and waits for the user to either set a
   * username (resolves true) or dismiss the modal (resolves false).
   */
  function requireUsername(): Promise<boolean> {
    if (profile.value?.username) return Promise.resolve(true)
    usernamePromptOpen.value = true
    return new Promise<boolean>((resolve) => {
      _usernamePromptResolve = resolve
      const stop = watch(
        () => profile.value?.username,
        (username) => {
          if (username) {
            stop()
            usernamePromptOpen.value = false
            _usernamePromptResolve = null
            resolve(true)
          }
        },
      )
    })
  }

  function dismissUsernamePrompt() {
    usernamePromptOpen.value = false
    if (_usernamePromptResolve) {
      _usernamePromptResolve(false)
      _usernamePromptResolve = null
    }
  }

  // ── OAuth prompt state (for future OAuth-gated features) ──────────────────
  const oauthPromptOpen = ref(false)
  let _oauthPromptResolve: ((value: boolean) => void) | null = null

  function requireOAuth(): Promise<boolean> {
    if (!isAnonymous.value) return Promise.resolve(true)
    oauthPromptOpen.value = true
    return new Promise<boolean>((resolve) => {
      _oauthPromptResolve = resolve
      const stop = watch(isAnonymous, (val) => {
        if (!val) {
          stop()
          oauthPromptOpen.value = false
          _oauthPromptResolve = null
          resolve(true)
        }
      })
    })
  }

  function dismissOAuthPrompt() {
    oauthPromptOpen.value = false
    if (_oauthPromptResolve) {
      _oauthPromptResolve(false)
      _oauthPromptResolve = null
    }
  }

  async function fetchProfile() {
    try {
      const data = await $fetch<ProfileResponse>('/api/profile')
      profile.value = data
      isAnonymous.value = data.isAnonymous
    }
    catch {
      // Anonymous visitor with no session yet — will be created on next API call
      profile.value = null
    }
    finally {
      isLoaded.value = true
    }
  }

  async function updateProfile(updates: { firstName?: string, username?: string, email?: string }) {
    const data = await $fetch<Profile>('/api/profile', {
      method: 'PATCH',
      body: updates,
    })
    if (profile.value) {
      profile.value = { ...profile.value, ...data }
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    const securityStore = (await import('~/stores/security')).useSecurityStore()
    securityStore.resetState()
    profile.value = null
    isAnonymous.value = true
    isLoaded.value = false
    window.location.reload()
  }

  return {
    profile,
    isAnonymous,
    isLoaded,
    usernamePromptOpen,
    oauthPromptOpen,
    fetchProfile,
    updateProfile,
    logout,
    requireUsername,
    dismissUsernamePrompt,
    requireOAuth,
    dismissOAuthPrompt,
  }
})
