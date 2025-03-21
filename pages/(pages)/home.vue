<script setup>
definePageMeta({
  layout: 'content'
})
</script>
<template>
   <section class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-extrabold mb-5">
          Organize your ideas on a <span class="text-indigo-600">free-form canvas</span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Tackpad is a powerful productivity tool that gives you the flexibility to arrange your tasks, notes, timers, and more - just the way you want them.
        </p>
        <div class="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <NuxtLink to="/" class="bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-indigo-700 transition duration-200">
            Create Board
          </NuxtLink>
        </div>
        <div class="relative max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl">
          <img src="https://assets.tackpad.xyz/Screenshot%202025-03-16%20121901.png" alt="Tackpad Canvas Preview" class="w-full h-auto block">
          
          <!-- Note: The widgets were positioned absolutely in the original CSS and weren't visible on mobile. 
               Since these elements aren't in the visible markup, I'm omitting them. -->
        </div>
      </div>
    </section>
</template>