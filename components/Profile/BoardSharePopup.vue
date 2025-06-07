<template>
    <UIModal
        :model-value="modelValue"
        @update:model-value="closeModal"
        :title="modalTitle"
        :close-on-backdrop-click="true"
        :close-on-esc="true"
    >
        <!-- Default slot for modal content -->
        <template #default>
            <div v-if="boardStore.board" class="share-content-wrapper">
                <!-- Copy Link Section ... -->
                <section class="popup-section">
                    <h4>Share Link</h4>
                    <div class="copy-link-wrapper">
                        <input
                            type="text"
                            :value="boardUrl"
                            readonly
                            class="link-input"
                        />
                        <button @click="copyBoardUrl" :disabled="copySuccess">
                            {{ copySuccess ? "Copied!" : "Copy Link" }}
                        </button>
                    </div>
                    <div class="current-access-info">
                        <span>Current Access:</span>
                        <strong>{{
                            formatAccessLevelText(boardStore.boardAccessLevel)
                        }}</strong>
                    </div>
                </section>

                <!-- Loading/Error Display (for general board/access loading) -->
                <div v-if="boardStore.loadingAccess" class="loading-indicator">
                    Updating access...
                    <!-- Keep this for role changes/removals -->
                </div>
                <div
                    v-if="boardStore.errorAccess"
                    class="error-message access-error"
                >
                    {{ boardStore.errorAccess }}
                </div>
                <div
                    v-if="
                        boardStore.error &&
                        !boardStore.errorAccess &&
                        !boardStore.loadingAccess
                    "
                    class="error-message general-error"
                >
                    {{ boardStore.error }}
                </div>

                <!-- Access Control Section -->
                <section class="popup-section" v-if="currentBoardId">
                    <!-- Invite User -->
                    <div class="invite-user" v-if="canInviteOrEdit">
                        <h5>Invite People</h5>
                        <div class="form-group invite-inputs">
                            <input
                                type="text"
                                v-model="inviteUsername"
                                placeholder="Enter username to invite"
                                :disabled="
                                    lookupState === 'loading' ||
                                    boardStore.loadingAccess
                                "
                                @keyup.enter="handleInviteUser"
                            />
                            <select
                                v-model="inviteRole"
                                :disabled="
                                    lookupState === 'loading' ||
                                    boardStore.loadingAccess
                                "
                            >
                                <option
                                    v-for="role in availableInviteRoles"
                                    :key="role.value"
                                    :value="role.value"
                                >
                                    {{ formatRoleText(role.value) }}
                                </option>
                            </select>
                            <button
                                @click="handleInviteUser"
                                :disabled="inviteButtonDisabled"
                            >
                                {{ inviteButtonText }}
                            </button>
                        </div>

                        <!-- User Lookup Feedback Area -->
                        <div
                            v-if="lookupState === 'loading'"
                            class="lookup-feedback loading"
                        >
                            Checking username...
                        </div>
                        <div v-if="lookupError" class="lookup-feedback error">
                            {{ lookupError }}
                        </div>
                        <div
                            v-if="lookupState === 'found' && foundUserDetails"
                            class="lookup-feedback success"
                        >
                            <p>
                                Invite
                                <strong>{{
                                    foundUserDetails.firstName ||
                                    foundUserDetails.username ||
                                    "Anonymous"
                                }}</strong>
                                ({{`@${foundUserDetails.username}` || "No username provided" }}) ?
                            </p>
                            <!-- Confirmation is implied by clicking the button again -->
                        </div>
                    </div>
                    <div v-else-if="!isOwner" class="permission-note">
                        Only owners or editors can invite others.
                    </div>

                    <!-- People with Access List ... -->
                    <div
                        class="access-list"
                        v-if="
                            boardStore.accessList &&
                            boardStore.accessList.length > 0
                        "
                    >
                        <h5>People with Access</h5>
                        <ul>
                            <li
                                v-for="user in boardStore.accessList"
                                :key="user.profileId"
                                class="access-list-item"
                            >
                                <span class="user-info">
                                    {{
                                        user.firstName ||
                                        user.username ||
                                        "User"
                                    }}
                                    <span
                                        v-if="
                                            user.profileId ===
                                            boardStore.boardOwnerId
                                        "
                                        class="owner-tag"
                                        >(Owner)</span
                                    >
                                </span>
                                <div class="user-controls">
                                    <!-- Role Selector -->
                                    <select
                                        v-if="
                                            isOwner &&
                                            user.profileId !==
                                                boardStore.boardOwnerId
                                        "
                                        :value="user.role"
                                        @change="
                                            handleRoleChange(
                                                user.profileId,
                                                $event,
                                            )
                                        "
                                        :disabled="boardStore.loadingAccess"
                                    >
                                        <option
                                            v-for="role in availableChangeRoles"
                                            :key="role.value"
                                            :value="role.value"
                                        >
                                            {{ formatRoleText(role.value) }}
                                        </option>
                                    </select>
                                    <span v-else class="user-role">
                                        {{ formatRoleText(user.role) }}
                                    </span>

                                    <!-- Remove Button -->
                                    <button
                                        v-if="
                                            (isOwner &&
                                                user.profileId !==
                                                    boardStore.boardOwnerId) ||
                                            (user.profileId ===
                                                boardStore.currentUserProfileId &&
                                                !isOwner)
                                        "
                                        @click="
                                            handleRemoveUser(user.profileId)
                                        "
                                        :disabled="boardStore.loadingAccess"
                                        class="remove-btn"
                                        aria-label="Remove access"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div v-else class="access-list">
                        <h5>People with Access</h5>
                        <p class="no-access-note">
                            No one else has explicit access.
                        </p>
                    </div>
                </section>
            </div>
            <div v-else class="loading-placeholder">
                <p>Loading board details...</p>
            </div>
        </template>
    </UIModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useBoardStore } from "~/stores/board";
import { useProfileStore } from "~/stores/profileStore"; // Import profile store
import { BoardAccessRole, BoardAccessLevel } from "~/types/access";
import UIModal from "~/components/UI/Modal.vue";

// Define the structure for the fetched user details
interface UserDetails {
    username: string;
    firstName: string | null;
    email: string | null;
}

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

// Emits
const emit = defineEmits(["update:modelValue"]);

// Stores
const boardStore = useBoardStore();
const profileStore = useProfileStore(); // Instantiate profile store

// Local state
const inviteUsername = ref("");
const inviteRole = ref<BoardAccessRole>(BoardAccessRole.VIEWER);
const copySuccess = ref(false);
const copyTimeout = ref<NodeJS.Timeout | null>(null);

// State for the user lookup process
const lookupState = ref<"idle" | "loading" | "found" | "not_found" | "error">(
    "idle",
);
const foundUserDetails = ref<UserDetails | null>(null);
const lookupError = ref<string | null>(null);

// --- Computed Properties ---

const modalTitle = computed(() => {
    return boardStore.board
        ? `Share "${boardStore.board.data.title}"`
        : "Share Board";
});

const currentBoardId = computed(() => boardStore.board?.board_id);
const isOwner = computed(() => boardStore.isOwner);
const boardUrl = computed(() =>
    typeof window !== "undefined" ? window.location.href : "",
);

const canInviteOrEdit = computed(() => {
    if (!boardStore.board) return false; // Need board context
    if (isOwner.value) return true;
    const currentUserAccess = boardStore.accessList.find(
        (u) => u.profileId === boardStore.currentUserProfileId,
    );
    return currentUserAccess?.role === BoardAccessRole.EDITOR;
});

// Note: accessLevels computed property removed

const availableInviteRoles = computed(() => {
    const roles = [BoardAccessRole.VIEWER, BoardAccessRole.EDITOR];
    return roles.map((value) => ({
        value,
        text: formatRoleText(value),
    }));
});

const availableChangeRoles = computed(() => {
    return [BoardAccessRole.VIEWER, BoardAccessRole.EDITOR].map((value) => ({
        value,
        text: formatRoleText(value),
    }));
});

// Computed property for the invite button text
const inviteButtonText = computed(() => {
    switch (lookupState.value) {
        case "loading":
            return "Checking...";
        case "found":
            return "Confirm Invite";
        case "idle":
        case "not_found":
        case "error":
        default:
            return "Invite";
    }
});

// Computed property for disabling the invite button
const inviteButtonDisabled = computed(() => {
    if (boardStore.loadingAccess || lookupState.value === "loading") {
        return true; // Always disable if board access update or lookup is in progress
    }
    if (lookupState.value === "found") {
        return false; // Enable for confirmation click
    }
    // Disable if username is empty for the initial "Invite" click
    return !inviteUsername.value.trim();
});

// --- Methods ---

const closeModal = () => {
    emit("update:modelValue", false);
    resetInviteState(); // Reset lookup state when closing modal
};

const copyBoardUrl = async () => {
    if (copyTimeout.value) clearTimeout(copyTimeout.value);
    try {
        await navigator.clipboard.writeText(boardUrl.value);
        copySuccess.value = true;
        copyTimeout.value = setTimeout(() => {
            copySuccess.value = false;
        }, 2000);
    } catch (err) {
        console.error("Failed to copy URL: ", err);
        // Consider a more user-friendly error display instead of alert
        // e.g., show a temporary error message near the button
    }
};

const resetInviteState = () => {
    lookupState.value = "idle";
    foundUserDetails.value = null;
    lookupError.value = null;
    // Don't clear inviteUsername here automatically, user might want to retry
};

const handleInviteUser = async () => {
    const usernameToInvite = inviteUsername.value.trim();
    if (!usernameToInvite) return; // Should be covered by disabled state, but double-check

    // If user details were already found, this click confirms the invite
    if (lookupState.value === "found" && foundUserDetails.value) {
        try {
            // Set loading state specifically for the *invite* action
            // We reuse boardStore.loadingAccess for simplicity here,
            // assuming role changes/removals/invites share this loading state.
            // If finer control is needed, add a dedicated 'invitingUser' ref.
            // boardStore.setLoadingAccess(true); // Assuming boardStore manages its loading state

            await boardStore.inviteUser(
                usernameToInvite, // Use the username that was confirmed
                inviteRole.value,
            );
            inviteUsername.value = ""; // Clear input on successful invite
            inviteRole.value = BoardAccessRole.VIEWER; // Reset role
            resetInviteState(); // Reset lookup state
        } catch (err) {
            // Error is handled by the boardStore, potentially setting errorAccess
            console.error("Invite failed (handled by store):", err);
            // Optionally, keep the user found state but show the invite error?
            // For now, we reset.
            resetInviteState();
        } finally {
            // boardStore.setLoadingAccess(false);
        }
    }
    // Otherwise, this is the first click, so perform the user lookup
    else if (
        lookupState.value === "idle" ||
        lookupState.value === "not_found" ||
        lookupState.value === "error"
    ) {
        lookupState.value = "loading";
        foundUserDetails.value = null;
        lookupError.value = null;

        try {
            const result = await profileStore.fetchUsersByUsername([
                usernameToInvite,
            ]);

            if (result === null) {
                // Fetch itself failed (network/server error)
                lookupState.value = "error";
                lookupError.value = "Error checking user. Please try again.";
            } else if (result.length === 0) {
                // Fetch succeeded, but user not found
                lookupState.value = "not_found";
                lookupError.value = `User "${usernameToInvite}" not found.`;
            } else {
                // User found!
                foundUserDetails.value = result[0];
                lookupState.value = "found";
                // Now the button text will change to "Confirm Invite"
            }
        } catch (error) {
            // Catch unexpected errors during fetch call setup
            console.error("Unexpected error during user lookup:", error);
            lookupState.value = "error";
            lookupError.value = "An unexpected error occurred.";
        }
        // Note: 'loading' state is implicitly ended by setting state to found/not_found/error
    }
};

const handleRoleChange = (profileId: string, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value as BoardAccessRole;
    const currentUser = boardStore.accessList.find(
        (u) => u.profileId === profileId,
    );
    if (currentUser && currentUser.role !== newRole) {
        boardStore.updateUserRole(profileId, newRole);
    }
};

const handleRemoveUser = (profileId: string) => {
    // Use a more integrated confirmation dialog if available instead of window.confirm
    if (
        window.confirm(`Are you sure you want to remove access for this user?`)
    ) {
        boardStore.removeUserAccess(profileId);
    }
};

// --- Formatting Helpers ---
const formatRoleText = (role: BoardAccessRole | "owner" | null): string => {
    if (!role) return "Unknown";
    switch (role) {
        case BoardAccessRole.VIEWER:
            return "Viewer";
        case BoardAccessRole.EDITOR:
            return "Editor";
        case BoardAccessRole.OWNER: // Keep OWNER for display if needed
            return "Owner";
        case "owner": // Handle explicit 'owner' string if used
            return "Owner";
        default:
            // Return the role value itself if it's unexpected
            return role;
    }
};
const formatAccessLevelText = (level: BoardAccessLevel | null): string => {
    if (!level) return "Unknown";
    switch (level) {
        case BoardAccessLevel.PUBLIC:
            return "Public - Anyone can view and edit";
        case BoardAccessLevel.LIMITED_EDIT:
            return "Limited - Signed-in users can edit";
        case BoardAccessLevel.PRIVATE_SHARED:
            return "Private - Only invited users can access";
        case BoardAccessLevel.VIEW_ONLY:
            return "View Only - No one can edit";
        case BoardAccessLevel.ADMIN_ONLY:
            return "Admin Only - Only owner can access";
        default:
            return level;
    }
};

// --- Watchers ---

// Reset lookup state if the username input changes after a lookup result
watch(inviteUsername, (newValue, oldValue) => {
    // Only reset if the state was showing a result ('found', 'not_found', 'error')
    // and the username actually changed. Don't reset while typing before the first lookup.
    if (
        lookupState.value !== "idle" &&
        lookupState.value !== "loading" &&
        newValue !== oldValue
    ) {
        resetInviteState();
    }
});

// Reset state when modal opens/closes
watch(
    () => props.modelValue,
    (isVisible) => {
        if (!isVisible) {
            // Reset copy button state
            if (copyTimeout.value) clearTimeout(copyTimeout.value);
            copySuccess.value = false;
            // Reset invite state
            resetInviteState();
            inviteUsername.value = ""; // Clear username input on close
            inviteRole.value = BoardAccessRole.VIEWER;
            // Optionally clear boardStore errors if appropriate
            // boardStore.clearAccessError();
        } else {
            // Reset state when opening too, ensuring a clean start
            resetInviteState();
            inviteUsername.value = "";
            inviteRole.value = BoardAccessRole.VIEWER;
        }
    },
    { immediate: true }, // Run immediately to set initial state if modal starts open
);
</script>

<style scoped>
/* Keep styles for the content *inside* the modal */

.loading-placeholder {
    padding: 30px;
    text-align: center;
    color: #666;
}

.popup-section {
    margin-bottom: 24px;
}
.popup-section:last-child {
    margin-bottom: 0;
}

.popup-section h4,
.popup-section h5 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #333;
    font-weight: 600;
}
.popup-section h5 {
    font-size: 0.95em;
    color: #555;
    margin-top: 15px; /* Add space above invite/list titles */
}

.copy-link-wrapper {
    display: flex;
    gap: 8px;
    margin-bottom: 5px; /* Reduced space as access level info is gone */
}

.link-input {
    flex-grow: 1;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f9f9f9;
    font-size: 0.9em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Styles for .current-access-info removed */

.copy-link-wrapper button,
.invite-user button {
    /* Note: delete-board-btn styles removed */
    padding: 8px 15px;
    border: 1px solid #ccc;
    background-color: #eee;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
}
.copy-link-wrapper button:hover,
.invite-user button:hover {
    background-color: #ddd;
}
.copy-link-wrapper button:disabled,
.invite-user button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.form-group {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column; /* Keep column layout for potential future labels */
    gap: 4px;
}
/* General styles for select/input kept in case of future additions */
.form-group select,
.form-group input[type="text"] {
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
}

/* Styles specific to the invite section */
.invite-user .invite-inputs {
    display: flex;
    flex-direction: row; /* Override .form-group default if needed */
    gap: 8px;
    align-items: center;
}
.invite-user input[type="text"] {
    flex-grow: 1; /* Allow username input to take space */
}
.invite-user select {
    min-width: 100px; /* Ensure role selector is usable */
    width: auto; /* Don't force select to 100% width */
}

.permission-note {
    font-size: 0.8em;
    color: #777;
    margin-top: 5px;
    margin-bottom: 10px;
}

.access-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px; /* Limit height of user list */
    overflow-y: auto; /* Allow scrolling within the list */
    border: 1px solid #eee; /* Optional: frame the list */
    border-radius: 4px;
}

.access-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
}
.access-list-item:last-child {
    border-bottom: none;
}

.user-info {
    flex-grow: 1;
    margin-right: 10px;
    font-size: 0.95em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.owner-tag {
    font-size: 0.8em;
    color: #666;
    margin-left: 5px;
    font-weight: 500;
}

.user-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0; /* Prevent controls from shrinking */
}
.user-controls select {
    padding: 4px 6px;
    font-size: 0.9em;
    border-radius: 4px;
    min-width: 80px; /* Ensure select is usable */
    border: 1px solid #ccc; /* Add border consistent with inputs */
    background-color: white;
}
.user-role {
    font-size: 0.9em;
    color: #555;
    padding: 4px 6px;
    /* Adjust min-width or padding as needed for alignment */
    min-width: 80px; /* Match select width roughly */
    text-align: right; /* Align text consistently */
    box-sizing: border-box;
}

.remove-btn {
    background: none;
    border: none;
    color: #a00;
    font-size: 1.4em;
    line-height: 1;
    cursor: pointer;
    padding: 0 5px;
}
.remove-btn:hover {
    color: #d00;
}
.remove-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.no-access-note {
    font-size: 0.9em;
    color: #666;
    padding: 10px;
    text-align: center;
    font-style: italic;
    border: 1px dashed #eee; /* Make it look like an empty state */
    border-radius: 4px;
    margin-top: 5px;
}

/* Styles for .danger-zone, .delete-board-btn, .warning-note removed */

.loading-indicator {
    padding: 10px;
    text-align: center;
    color: #555;
    font-style: italic;
}

.error-message {
    padding: 10px 12px; /* Adjusted padding */
    margin-bottom: 15px;
    border-radius: 4px;
    font-size: 0.9em;
    border: 1px solid transparent; /* Base border */
}
.access-error {
    background-color: #fdecea;
    color: #a73431;
    border-color: #f5c6cb;
}
.general-error {
    background-color: #fff3cd;
    color: #856404;
    border-color: #ffeeba;
}

.lookup-feedback {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 0.9em;
    text-align: left;
}

.lookup-feedback.loading {
    color: #666;
    font-style: italic;
}

.lookup-feedback.error {
    background-color: #fdecea;
    color: #a73431;
    border: 1px solid #f5c6cb;
}

.lookup-feedback.success {
    background-color: #d4edda; /* Light green background */
    color: #155724; /* Dark green text */
    border: 1px solid #c3e6cb; /* Green border */
}
.lookup-feedback.success p {
    margin: 0;
    padding: 0;
}
.lookup-feedback.success strong {
    font-weight: 600;
}
/* Adjust input group layout if needed */
.invite-user .invite-inputs {
    align-items: flex-start; /* Align items top if feedback pushes button down */
    flex-wrap: wrap; /* Allow wrapping if space is tight */
}

/* Ensure button doesn't shrink */
.invite-user button {
    flex-shrink: 0;
    margin-top: 0; /* Reset potential margin if wrapping */
}
</style>
