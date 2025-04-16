<script setup>
import { ref, watch, computed } from "vue";
import { useProfileStore } from "~/stores/profileStore"; // 1. Import the store
import UsageIndicator from "./UsageIndicator.vue";

const { loggedIn, clear } = useUserSession();
const profileStore = useProfileStore(); // 2. Instantiate the store

// User profile data - now includes username and initial tracking
const profileData = ref(null); // Will hold { id, firstName, email, username, createdAt, initialEmail, initialUsername, ... }
const isLoading = ref(false);
const error = ref(null);
const updateStatus = ref({ loading: false, success: false, error: null });

// Check if profile is incomplete (added username check)
const isProfileIncomplete = computed(() => {
    if (!profileData.value) return false;
    // A profile is incomplete if any of these are missing
    return (
        !profileData.value.firstName ||
        !profileData.value.email ||
        !profileData.value.username
    );
});

// Fetch user profile data (Modified to store initial email/username)
const fetchProfileData = async () => {
    if (!loggedIn.value) return;

    isLoading.value = true;
    error.value = null;
    profileData.value = null; // Clear previous data

    try {
        // Use $fetch for better error handling and type inference with Nuxt 3
        // Assuming GET /api/profile returns { id, firstName, email, username, createdAt, ... }
        const profile = await $fetch("/api/profile");

        if (!profile) {
            // Handle cases where the API might return empty/null unexpectedly
            throw new Error("Received empty profile data");
        }

        profileData.value = {
            ...profile,
            // Store initial values to check if they can be edited
            initialEmail: profile.email,
            initialUsername: profile.username,
        };
    } catch (err) {
        console.error("Error fetching profile:", err);
        // Use error data from $fetch if available (e.g., err.data from createError)
        if (err.statusCode === 401 || err.statusCode === 403) {
            error.value =
                "Authentication error. Please sign out and sign back in.";
        } else if (err.statusCode === 404) {
            error.value = "Profile not found. It might need to be created.";
            // Potentially guide the user or automatically create one if applicable
        } else {
            error.value = err.data?.message || "Unable to load profile data";
        }
        profileData.value = null; // Ensure profileData is null on error
    } finally {
        isLoading.value = false;
    }
};

// --- 3. Use Store Action to Update Profile ---
const updateProfile = async () => {
    if (!profileData.value) return;

    updateStatus.value = { loading: true, success: false, error: null };

    // Construct the payload with only the necessary fields
    const payload = {};
    // Always allow firstName update (or add check if it changed if desired)
    if (profileData.value.firstName !== undefined) {
        // Or check against an initialFirstName if needed
        payload.firstName = profileData.value.firstName;
    }
    // Only include email if it's being set for the first time
    if (!profileData.value.initialEmail && profileData.value.email) {
        payload.email = profileData.value.email;
    }
    // Only include username if it's being set for the first time
    if (!profileData.value.initialUsername && profileData.value.username) {
        payload.username = profileData.value.username;
    }

    // Don't call API if nothing needs updating
    if (Object.keys(payload).length === 0) {
        updateStatus.value = {
            loading: false,
            success: false,
            error: "No changes to save.",
        };
        // Clear error message after a delay
        setTimeout(() => {
            if (updateStatus.value.error === "No changes to save.") {
                updateStatus.value.error = null;
            }
        }, 3000);
        return;
    }

    const updatedProfile = await profileStore.updateProfile(payload);

    if (updatedProfile) {
        // Success: Update local state with the response from the store/API
        profileData.value = {
            ...profileData.value, // Keep existing fields like createdAt etc.
            ...updatedProfile, // Overwrite with updated data (id, firstName, email, username)
            // Re-set initial values based on the successful update
            initialEmail: updatedProfile.email,
            initialUsername: updatedProfile.username,
        };
        updateStatus.value = { loading: false, success: true, error: null };
        // Reset success status after 3 seconds
        setTimeout(() => {
            updateStatus.value.success = false;
        }, 3000);
    } else {
        // Failure: Store action returned null, check console for specific error from store
        // You could potentially grab a more specific error message if the store provided one
        updateStatus.value = {
            loading: false,
            success: false,
            error: "Update failed. Check console or try again.",
        }; // Generic message
        // More specific error handling could be added here based on error types/codes if the store exposed them
    }
};
// --- End Store Action Usage ---

// Watch for login state changes
watch(
    loggedIn,
    async (newValue) => {
        if (newValue) {
            await fetchProfileData();
        } else {
            profileData.value = null;
            error.value = null; // Clear error on logout
            updateStatus.value = {
                loading: false,
                success: false,
                error: null,
            }; // Reset update status
        }
    },
    { immediate: true },
);

// Handle sign out and redirect
const handleSignOut = async () => {
    await clear(); // This should trigger the watch above
};
</script>

<template>
    <div class="user-tab">
        <template v-if="loggedIn">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex justify-center py-8">
                <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
                ></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-8">
                <div class="text-red-500 mb-2">{{ error }}</div>
                <button
                    @click="fetchProfileData"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-4"
                >
                    Try Again
                </button>
                <div class="pt-2">
                    <button
                        @click="handleSignOut"
                        class="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-center hover:bg-gray-200 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <!-- Profile Data Display and Edit -->
            <div v-else-if="profileData" class="space-y-6">
                <!-- Incomplete Profile Alert -->
                <div
                    v-if="isProfileIncomplete"
                    class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"
                >
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg
                                class="h-5 w-5 text-yellow-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                <!-- Updated incomplete message -->
                                Please complete your profile information (Name,
                                Email, Username).
                            </p>
                        </div>
                    </div>
                </div>

                <!-- User Header with Avatar and Username -->
                <div class="flex items-center space-x-4 mb-4">
                    <div
                        class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-xl font-bold"
                    >
                        {{
                            profileData.firstName
                                ? profileData.firstName.charAt(0).toUpperCase()
                                : profileData.username
                                  ? profileData.username.charAt(0).toUpperCase()
                                  : "U"
                        }}
                    </div>
                    <div>
                        <!-- 4. Display Username if available -->
                        <p
                            v-if="profileData.username"
                            class="text-lg font-semibold text-gray-800"
                        >
                            @{{ profileData.username }}
                        </p>
                        <!-- Fallback or Display Name if needed -->
                        <p
                            v-else-if="profileData.firstName"
                            class="text-lg font-semibold text-gray-800"
                        >
                            {{ profileData.firstName }}
                        </p>
                        <p class="text-xs text-gray-400">
                            Joined
                            {{
                                new Date(
                                    profileData.createdAt,
                                ).toLocaleDateString()
                            }}
                        </p>
                    </div>
                </div>

                <!-- Profile Form -->
                <div class="space-y-4">
                    <div>
                        <label
                            for="displayName"
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Display Name</label
                        >
                        <input
                            id="displayName"
                            type="text"
                            v-model="profileData.firstName"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800"
                            placeholder="Enter your name"
                        />
                    </div>

                    <div>
                        <label
                            for="email"
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Email</label
                        >
                        <input
                            id="email"
                            type="email"
                            v-model="profileData.email"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800"
                            :disabled="!!profileData.initialEmail"
                            :class="{
                                'cursor-not-allowed opacity-75':
                                    !!profileData.initialEmail,
                            }"
                            placeholder="Enter your email"
                            autocomplete="email"
                        />
                        <p
                            class="text-xs text-gray-500 mt-1"
                            v-if="!!profileData.initialEmail"
                        >
                            Email cannot be changed once set.
                        </p>
                        <p class="text-xs text-gray-500 mt-1" v-else>
                            Set your unique email address (cannot be changed
                            later).
                        </p>
                    </div>

                    <!-- 5. Username Input Field -->
                    <div>
                        <label
                            for="username"
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Username</label
                        >
                        <div class="relative rounded-md shadow-sm">
                            <div
                                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                            >
                                <span class="text-gray-500 sm:text-sm">@</span>
                            </div>
                            <input
                                id="username"
                                type="text"
                                v-model="profileData.username"
                                class="w-full px-3 py-2 pl-7 border border-gray-300 rounded-md bg-white text-gray-800"
                                :disabled="!!profileData.initialUsername"
                                :class="{
                                    'cursor-not-allowed opacity-75':
                                        !!profileData.initialUsername,
                                }"
                                placeholder="Choose a username"
                                autocomplete="username"
                                aria-describedby="username-description"
                            />
                        </div>
                        <p
                            id="username-description"
                            class="text-xs text-gray-500 mt-1"
                            v-if="!!profileData.initialUsername"
                        >
                            Username cannot be changed once set.
                        </p>
                        <p
                            id="username-description"
                            class="text-xs text-gray-500 mt-1"
                            v-else
                        >
                            Choose your unique username (cannot be changed
                            later).
                        </p>
                    </div>
                    <!-- End Username Input -->
                    <div>
                        <UsageIndicator
                            :consumption="profileData.consumption"
                            :limit="profileData.limit"
                        />
                    </div>

                    <!-- Save Button & Status -->
                    <div class="pt-2">
                        <button
                            class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="updateProfile"
                            :disabled="updateStatus.loading || isLoading"
                        >
                            <span v-if="updateStatus.loading">Updating...</span>
                            <span v-else>Save Profile</span>
                        </button>
                        <div
                            v-if="updateStatus.success"
                            class="text-green-500 mt-2 text-center"
                        >
                            Profile updated successfully!
                        </div>
                        <div
                            v-if="updateStatus.error"
                            class="text-red-500 mt-2 text-center"
                        >
                            {{ updateStatus.error }}
                        </div>
                    </div>
                </div>

                <!-- Logout Button -->
                <div class="pt-4">
                    <button
                        @click="handleSignOut"
                        class="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-center hover:bg-gray-200 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <!-- Fallback for No Profile Data but Logged In -->
            <div v-else class="text-center py-8 text-gray-500">
                <p class="mb-4">Profile data could not be loaded.</p>
                <button
                    @click="fetchProfileData"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-4"
                >
                    Retry Fetching Profile
                </button>
                <div class="pt-2">
                    <button
                        @click="handleSignOut"
                        class="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-center hover:bg-gray-200 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </template>

        <!-- Logged Out State (Keep as is) -->
        <div v-else class="space-y-6 py-4">
            <!-- ... existing sign-in prompt and buttons ... -->
            <div class="text-center mb-6">
                <h3 class="text-lg font-medium text-gray-800 mb-2">
                    Sign in to TackPad
                </h3>
                <p class="text-sm text-gray-500">
                    Access your boards and settings across devices
                </p>
            </div>

            <div class="space-y-3">
                <a
                    href="/api/_auth/google"
                    class="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 48 48"
                    >
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                    </svg>
                    <span>Sign in with Google</span>
                </a>

                <a
                    href="/api/_auth/github"
                    class="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-gray-800 border-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                    </svg>
                    <span>Sign in with GitHub</span>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.user-tab {
    min-height: 300px; /* Keep styling */
}
</style>
