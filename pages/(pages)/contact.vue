<script setup>
definePageMeta({
  layout: 'content'
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-16">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">We're here to help and answer any questions you might have. We look forward to hearing from you.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Email Us</h2>
        <p class="text-gray-600 mb-4">Drop us a line anytime and we'll get back to you within 24 hours.</p>
        <a href="mailto:support@tackpad.xyz" class="text-blue-600 hover:text-blue-800 font-medium">support@tackpad.xyz</a>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Community Support</h2>
        <p class="text-gray-600 mb-4">Join our community forum to connect with other users and get help.</p>
        <a href="https://community.tackpad.xyz" class="text-blue-600 hover:text-blue-800 font-medium">Visit Community Forum</a>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Documentation</h2>
        <p class="text-gray-600 mb-4">Check out our comprehensive documentation for detailed information.</p>
        <a href="https://waterloo.github.io/tackpad-widgets/" class="text-blue-600 hover:text-blue-800 font-medium">View Documentation</a>
      </div>
    </div>

    <div class="mt-16 bg-gray-50 rounded-xl p-8">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div class="space-y-6 text-left">
          <div>
            <h3 class="text-lg font-medium text-gray-900">What is Tackpad?</h3>
            <p class="mt-2 text-gray-600">Tackpad is a collaborative note-taking platform that helps teams organize and share their thoughts efficiently.</p>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">Is there a free plan available?</h3>
            <p class="mt-2 text-gray-600">Yes, we offer a generous free tier that includes basic features for individual users.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>