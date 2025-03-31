<template>
  <div
    class="bg-gray-50 text-gray-800 p-2 mx-auto font-sans max-h-80 min-h-80 sm:max-w-96 w-full"
  >
    <!-- Header with search -->
    <div class="flex items-center mb-3.5">
      <div class="relative flex-grow">
        <div
          class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          type="text"
          class="w-full py-2.5 px-2.5 pl-10 border border-gray-200 rounded-lg text-sm bg-gray-100 outline-none focus:ring-1 focus:ring-gray-300"
          placeholder="Search"
          v-model="searchQuery"
        />
      </div>
    </div>

    <!-- Tacklet cards -->
    <div class="grid grid-cols-1 gap-3 max-h-64 overflow-auto">
      <div
        v-for="tacklet in filteredTacklets"
        :key="`tacklet-${tacklet.id}`"
        class="bg-white overflow-hidden transition-all duration-200"
      >
        <div class="flex px-2 gap-2">
          <img
            :src="tacklet.icon"
            :class="[
              'w-10 h-10 rounded-lg mr-3 flex items-center justify-center text-white font-bold flex-shrink-0',
            ]"
          />
          
          
          <div class="flex-grow">
            <h3 class="text-sm font-medium mb-1 text-gray-800">
              {{ tacklet.name }}
            </h3>
            <p class="text-sm text-gray-500 mb-1.5 leading-tight">
              {{ tacklet.description.substring(0, 140) }}
            </p>
            <!-- <div
              class="flex items-center gap-3 mt-2 text-xs text-gray-400 hidden"
            >
              <span class="bg-gray-100 px-2 py-0.5 rounded">{{
                tacklet.type
              }}</span>
              <div class="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {{ formatNumber(tacklet.users || 0) }} users
              </div>
              <div class="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  ></path>
                </svg>
                {{ formatNumber(tacklet.likes || 0) }}
              </div>
            </div> -->
          </div>

          <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <button class="bg-black text-white px-2 py-0.5 rounded h-8" @click="addTacklet(tacklet)">Add</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTackletStore, type Tacklet } from '@/stores/tackletStore';
import  useTackletDirectory  from '@/composables/useTackletDirectory';

// State
const searchQuery = ref('');
const activeTab = ref('tacklets-widgets');
const showDropdown = ref(false);
const currentFilter = ref('Tacklets');
const currentSection = ref('Suggested');

const tackletStore = useTackletStore();
const {closeTackletDirectory} = useTackletDirectory();

// Data
const tabs = [
  { id: 'all', name: 'All' },
  { id: 'assets', name: 'Assets' },
  { id: 'tacklets-widgets', name: 'Tacklets & widgets' },
];

const filters = ['Tacklets', 'Widgets', 'All items'];

const tacklets = ref<Tacklet[]>([]);

// Fetch data on mount
onMounted(async () => {
  try {
    const response = await fetch('http://tacklets.tackpad.xyz/directory/tacklets.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    tacklets.value = data.tacklets || data; 
  } catch (error) {
    console.error("Failed to fetch tacklets:", error);
    // Handle error appropriately, maybe show a message to the user
  }
});

// Computed
const filteredTacklets = computed(() => {
  return tacklets.value.filter((tacklet) => {
    // Filter by search query
    if (searchQuery.value.trim() !== "") {
      const query = searchQuery.value.toLowerCase();
      return (
        tacklet.name.toLowerCase().includes(query) ||
        tacklet.description.toLowerCase().includes(query)
      );
    }
    return true;
  });
});

// Methods
const addTacklet = (tacklet: Tacklet) => {
  tackletStore.addTacklet(tacklet);
  closeTackletDirectory()
  
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const selectFilter = (filter: string) => {
  currentFilter.value = filter;
  showDropdown.value = false;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
};
</script>

<style>
/* Gradients for tacklet icons */
.pink-gradient {
  background: linear-gradient(45deg, #ff3a8c, #ff86b6);
}

.orange-gradient {
  background: linear-gradient(45deg, #ff6b6b, #ffa26b);
}

.purple-gradient {
  background: linear-gradient(45deg, #a256ff, #d896ff);
}

.blue-gradient {
  background: linear-gradient(45deg, #3a9cff, #65e1ff);
}
</style>