
<script setup lang="ts">
import UserTab from "./UserTab.vue";
import SettingsTab from "./SettingsTab.vue";
import { useProfileStore } from "~/stores/profileStore";

const profileStore = useProfileStore();

// Convert activeTab to work with PrimeVue Tabs
const activeTabValue = computed({
    get: () => profileStore.activeTab,
    set: (value) => profileStore.switchTab(value)
});
</script>

<template>
    <!-- Toggle button -->
    <button
        @click="profileStore.toggle"
        class="fixed top-6 right-4 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
    </button>

    <!-- Drawer coming from right -->
    <Drawer
        v-model:visible="profileStore.isProfileOpen"
        position="right"
        class="!w-full md:!w-[24rem] lg:!w-[24rem]"
        @wheel.stop
    >
        <template #header>
            <div class="flex items-center justify-between w-full">
                <h2 class="text-lg font-semibold">Profile</h2>
            </div>
        </template>

        <!-- Tabs -->
        <div class="h-full flex flex-col">
            <Tabs v-model:value="activeTabValue" class="flex-1 flex flex-col">
                <TabList class="mb-4">
                    <Tab value="user" class="flex-1">
                        <i class="pi pi-user mr-2"></i>
                        Accounts
                    </Tab>
                    <Tab value="settings" class="flex-1">
                        <i class="pi pi-cog mr-2"></i>
                        Settings
                    </Tab>
                </TabList>

                <TabPanels class="flex-1 overflow-y-auto">
                    <TabPanel value="user" class="h-full">
                        <UserTab />
                    </TabPanel>
                    <TabPanel value="settings" class="h-full">
                        <SettingsTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>
    </Drawer>
</template>
