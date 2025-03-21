<template>
    <main class="bg-[radial-gradient(circle_at_1px_1px,#d1d5db_1px,transparent_0)] bg-[length:24px_24px] text-gray-800 leading-relaxed">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex justify-between items-center py-5">
        <a href="/home"><div class="flex items-center gap-2 text-2xl font-bold text-indigo-600">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            T
          </div>
          Tackpad
        </div></a>
        <div>
          <NuxtLink to="/" class="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-indigo-700 transition duration-200">
            Create Board
          </NuxtLink>
        </div>
      </nav>
    </div>
    <slot />
    <footer class="bg-gray-50 text-gray-500 py-5 mt-16 text-center text-sm border-t border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-center gap-6 mb-3">
          <!-- <a href="#" class="text-gray-600 hover:text-indigo-600 transition duration-200">About</a> -->
          <NuxtLink to="/tos" class="text-gray-600 hover:text-indigo-600 transition duration-200">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="text-gray-600 hover:text-indigo-600 transition duration-200">Privacy</NuxtLink>
          <!-- <a href="#" class="text-gray-600 hover:text-indigo-600 transition duration-200">Help</a> -->
          <NuxtLink to="/contact" class="text-gray-600 hover:text-indigo-600 transition duration-200">Contact</NuxtLink>
        </div>
        <p>© 2025 Tackpad. All rights reserved.</p>
      </div>
    </footer>
    </main>
</template>