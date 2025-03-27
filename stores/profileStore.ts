import { defineStore } from "pinia";

export const useProfileStore = defineStore("profile", () => {
  const isProfileOpen = ref(false);
  let activeTab = ref<"user" | "settings">("user");

  const open = () => {
    isProfileOpen.value = true;
  };
  const close = () => {
    isProfileOpen.value = false;
  };
  const toggle = () => {
    isProfileOpen.value = !isProfileOpen.value;
  };
  const switchTab = (tab: "user" | "settings") => {
    activeTab.value = tab;
  };

  return {
    isProfileOpen,
    activeTab,
    open,
    close,
    toggle,
    switchTab,
  };
});
