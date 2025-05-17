import { defineNuxtPlugin, useRuntimeConfig, useRouter, nextTick } from '#imports'

import posthog from 'posthog-js'
export default defineNuxtPlugin((nuxtApp) => {
    const runtimeConfig = useRuntimeConfig()
    console.log('ENV:', JSON.stringify(runtimeConfig.public.posthog))

    const posthogClient = posthog.init(runtimeConfig.public.posthog.apiKey, {
        ui_host: runtimeConfig.public.posthog.uiHost,
        api_host: 'https://steep-tooth-c3c4.account-179.workers.dev/',
        capture_pageview: false, // we add manual pageview capturing below
        capture_pageleave: true, // automatically capture a pageleave event when the user leaves the site or closes the tab
        loaded: (posthog) => {
            if (import.meta.env.MODE === 'development') posthog.debug()
        },
    })

    // Make sure that pageviews are captured with each route change
    const router = useRouter()
    router.afterEach((to) => {
        nextTick(() => {
            posthog.capture('$pageview', {
                current_url: to.fullPath,
            })
        })
    })

    window.posthogClient = posthogClient
    nuxtApp.hook('vue:error', (error) => {
        posthogClient.captureException(error)
    })
    

    return {
        provide: {
            posthog: () => posthogClient,
        },
    }
})