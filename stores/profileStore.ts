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

  /**
   * Updates the current user's profile details.
   * Sends only the fields provided in the payload.
   * Intended for setting email/username for the first time or updating firstName.
   * @param payload - An object containing the fields to update (firstName, email, username).
   * @returns A Promise resolving to the updated UserDetails object on success, or null on failure.
   */
  const updateProfile = async (
    payload: ProfileUpdatePayload,
  ): Promise<UserDetails | null> => {
    // Ensure there's actually something to update
    if (!payload || Object.keys(payload).length === 0) {
      console.warn("updateProfile called with empty payload.");
      // Or throw an error, depending on desired behavior
      return null; // Nothing to do
    }

    try {
      // Use Nuxt's $fetch to call the PATCH endpoint
      // The backend returns the updated profile, matching UserDetails structure
      const updatedUser = await $fetch<UserDetails>("/api/profile", {
        method: "PATCH",
        body: payload, // Send only the fields needing update/setting
      });

      // Optional: If you store the current user's details in this store,
      // update them here. Example (assuming you add a currentUser ref):
      // currentUser.value = { ...currentUser.value, ...updatedUser };

      return updatedUser; // Return the updated profile data from the API
    } catch (error: any) {
      // Catch specific errors if needed (e.g., from createError)
      console.error("Error updating profile:", error);
      // You might want to inspect error.data or error.statusCode
      // to provide more specific feedback to the user
      // e.g., if (error.statusCode === 409) { show message "Username taken" }
      return null; // Indicate failure
    }
  };
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
  };
});
