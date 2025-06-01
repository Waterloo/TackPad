// TackPad/stores/profileStore.ts
import { defineStore } from "pinia";

// Define an interface for the user data structure we expect from the API
interface UserDetails {
  username: string | null; // Allow null based on potential initial state
  firstName: string | null;
  email: string | null;
}
interface ProfileUpdatePayload {
  firstName?: string; // Optional: Only send if updating
  email?: string; // Optional: Only send if setting for the first time
  username?: string; // Optional: Only send if setting for the first time
}
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

  /**
   * Fetches details for a list of users based on their usernames.
   * @param usernames - An array of usernames to fetch details for.
   * @returns A Promise that resolves to an array of UserDetails objects,
   *          or null if the request fails. Returns an empty array if input is empty.
   */
  const fetchUsersByUsername = async (
    usernames: string[],
  ): Promise<UserDetails[] | null> => {
    // Handle empty input directly to avoid unnecessary API call
    if (!usernames || usernames.length === 0) {
      return [];
    }

    try {
      // Use Nuxt's $fetch to call the server API endpoint
      // Specify the expected return type for type safety
      const users = await $fetch<UserDetails[]>("/api/profile/getUsers", {
        method: "POST",
        body: { usernames }, // Send the usernames in the request body
      });
      return users;
    } catch (error) {
      console.error("Error fetching user details by username:", error);
      // Return null to indicate failure to the caller
      return null;
    }
  };

  const updateProfile = async (
    payload: ProfileUpdatePayload,
  ): Promise<{ data: UserDetails | null; error?: { message: string; field?: string } }> => {
    // Ensure there's actually something to update
    if (!payload || Object.keys(payload).length === 0) {
      console.warn("updateProfile called with empty payload.");
      return {
        data: null,
        error: { message: "No valid fields to update" }
      };
    }

    try {
      // Use Nuxt's $fetch to call the PATCH endpoint
      const updatedUser = await $fetch<UserDetails>("/api/profile", {
        method: "PATCH",
        body: payload, // Send only the fields needing update/setting
      });

      return { data: updatedUser };
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Extract error information from the API response
      const errorMessage = error.data?.message || "Update failed. Please try again.";
      const field = getFieldFromErrorMessage(errorMessage);

      return {
        data: null,
        error: { message: errorMessage, field }
      };
    }
  };

  // Helper function to determine which field an error relates to
  function getFieldFromErrorMessage(message: string): string | undefined {
    if (message.includes("Username already taken") || message.includes("Username can only be set")) {
      return "username";
    }
    if (message.includes("Email can only be set")) {
      return "email";
    }
    return undefined;
  }
  return {
    // Existing state and actions
    isProfileOpen,
    activeTab,
    open,
    close,
    toggle,
    switchTab,

    // New action
    fetchUsersByUsername,
    updateProfile,
    getFieldFromErrorMessage
  };
});
