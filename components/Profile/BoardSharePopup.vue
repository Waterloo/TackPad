<template>
    <Dialog
        v-model:visible="isOpen"
        :header="modalTitle"
        :modal="true"
        :closable="true"
        :close-on-escape="true"
        :style="{ width: '32rem' }"
        :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    >
        <div v-if="boardStore.board" class="space-y-6">
            <!-- Copy Link Section -->
            <div class="space-y-4">
                <h4 class="text-lg font-semibold text-gray-800 mb-3">
                    Share Link
                </h4>
                <div class="flex gap-2">
                    <InputText
                        :value="boardUrl"
                        readonly
                        fluid
                        class="flex-1"
                    />
                    <Button
                        :label="copySuccess ? 'Copied!' : 'Copy Link'"
                        :disabled="copySuccess"
                        @click="copyBoardUrl"
                        size="small"
                    />
                </div>
                <div class="text-sm text-gray-600">
                    <span>Current Access: </span>
                    <strong class="text-gray-800">{{
                        formatAccessLevelText(boardStore.boardAccessLevel)
                    }}</strong>
                </div>
            </div>

            <!-- Loading/Error Display -->
            <div v-if="boardStore.loadingAccess" class="text-center py-4">
                <i class="pi pi-spinner pi-spin mr-2"></i>
                <span class="text-gray-600">Updating access...</span>
            </div>

            <Message
                v-if="boardStore.errorAccess"
                severity="error"
                :closable="false"
                class="mb-4"
            >
                {{ boardStore.errorAccess }}
            </Message>

            <Message
                v-if="
                    boardStore.error &&
                    !boardStore.errorAccess &&
                    !boardStore.loadingAccess
                "
                severity="warn"
                :closable="false"
                class="mb-4"
            >
                {{ boardStore.error }}
            </Message>

            <!-- Access Control Section -->
            <div v-if="currentBoardId" class="space-y-6">
                <!-- Invite User -->
                <div v-if="canInviteOrEdit" class="space-y-4">
                    <h5 class="text-base font-medium text-gray-700 mb-3">
                        Invite People
                    </h5>
                    <div class="flex gap-2 items-start">
                        <InputText
                            v-model="inviteUsername"
                            placeholder="Enter username to invite"
                            :disabled="
                                lookupState === 'loading' ||
                                boardStore.loadingAccess
                            "
                            @keyup.enter="handleInviteUser"
                            class="flex-1"
                        />
                        <Select
                            v-model="inviteRole"
                            :options="availableInviteRoles"
                            optionLabel="text"
                            optionValue="value"
                            :disabled="
                                lookupState === 'loading' ||
                                boardStore.loadingAccess
                            "
                            class="min-w-[120px]"
                        />
                        <Button
                            :label="inviteButtonText"
                            :disabled="inviteButtonDisabled"
                            @click="handleInviteUser"
                            :loading="lookupState === 'loading'"
                            size="small"
                        />
                    </div>

                    <!-- User Lookup Feedback -->
                    <div
                        v-if="lookupState === 'loading'"
                        class="text-sm text-gray-600 italic"
                    >
                        <i class="pi pi-spinner pi-spin mr-2"></i>
                        Checking username...
                    </div>

                    <Message
                        v-if="lookupError"
                        severity="error"
                        :closable="false"
                        class="text-sm"
                    >
                        {{ lookupError }}
                    </Message>

                    <div
                        v-if="lookupState === 'found' && foundUserDetails"
                        class="p-3 bg-green-50 border border-green-200 rounded-md text-sm"
                    >
                        <p class="text-green-800">
                            Invite
                            <strong>{{
                                foundUserDetails.firstName ||
                                foundUserDetails.username ||
                                "Anonymous"
                            }}</strong>
                            ({{
                                foundUserDetails.username
                                    ? `@${foundUserDetails.username}`
                                    : "No username provided"
                            }}) ?
                        </p>
                    </div>
                </div>

                <div v-else-if="!isOwner" class="text-sm text-gray-500 italic">
                    Only owners or editors can invite others.
                </div>

                <!-- People with Access List -->
                <div class="space-y-4">
                    <h5 class="text-base font-medium text-gray-700 mb-3">
                        People with Access
                    </h5>

                    <div
                        v-if="
                            boardStore.accessList &&
                            boardStore.accessList.length > 0
                        "
                        class="border border-gray-200 rounded-md max-h-48 overflow-y-auto"
                    >
                        <div
                            v-for="user in boardStore.accessList"
                            :key="user.profileId"
                            class="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0"
                        >
                            <div class="flex-1 min-w-0">
                                <span class="text-sm font-medium text-gray-900">
                                    {{
                                        user.firstName ||
                                        user.username ||
                                        "User"
                                    }}
                                </span>
                                <span
                                    v-if="
                                        user.profileId ===
                                        boardStore.boardOwnerId
                                    "
                                    class="ml-2 text-xs text-gray-500 font-medium"
                                >
                                    (Owner)
                                </span>
                            </div>

                            <div class="flex items-center gap-2">
                                <!-- Role Selector -->
                                <Select
                                    v-if="isOwner && user.profileId !== boardStore.boardOwnerId"
                                    :modelValue="user.role"
                                    :options="availableChangeRoles"
                                    optionLabel="text"
                                    optionValue="value"
                                    @update:modelValue="handleRoleChange(user.profileId, $event)"
                                    :disabled="boardStore.loadingAccess"
                                    class="min-w-[100px]"
                                />

                                <span
                                    v-else
                                    class="text-sm text-gray-600 min-w-[100px] text-right"
                                >
                                    {{ formatRoleText(user.role) }}
                                </span>

                                <!-- Remove Button -->
                                <Button
                                    v-if="
                                        (isOwner &&
                                            user.profileId !==
                                                boardStore.boardOwnerId) ||
                                        (user.profileId ===
                                            boardStore.currentUserProfileId &&
                                            !isOwner)
                                    "
                                    icon="pi pi-times"
                                    severity="danger"
                                    variant="text"
                                    size="small"
                                    :disabled="boardStore.loadingAccess"
                                    @click="handleRemoveUser(user.profileId)"
                                    aria-label="Remove access"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        v-else
                        class="text-center py-4 text-sm text-gray-500 italic border border-dashed border-gray-300 rounded-md"
                    >
                        No one else has explicit access.
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="text-center py-8">
            <i class="pi pi-spinner pi-spin text-2xl text-gray-400 mb-2"></i>
            <p class="text-gray-600">Loading board details...</p>
        </div>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useBoardStore } from "~/stores/board";
import { useProfileStore } from "~/stores/profileStore";
import { BoardAccessRole, BoardAccessLevel } from "~/types/access";

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
const profileStore = useProfileStore();

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

// Computed property for modal visibility
const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

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
    if (!boardStore.board) return false;
    if (isOwner.value) return true;
    const currentUserAccess = boardStore.accessList.find(
        (u) => u.profileId === boardStore.currentUserProfileId,
    );
    return currentUserAccess?.role === BoardAccessRole.EDITOR;
});

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

const inviteButtonDisabled = computed(() => {
    if (boardStore.loadingAccess || lookupState.value === "loading") {
        return true;
    }
    if (lookupState.value === "found") {
        return false;
    }
    return !inviteUsername.value.trim();
});

// --- Methods ---
const closeModal = () => {
    emit("update:modelValue", false);
    resetInviteState();
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
    }
};

const resetInviteState = () => {
    lookupState.value = "idle";
    foundUserDetails.value = null;
    lookupError.value = null;
};

const handleInviteUser = async () => {
    const usernameToInvite = inviteUsername.value.trim();
    if (!usernameToInvite) return;

    if (lookupState.value === "found" && foundUserDetails.value) {
        try {
            await boardStore.inviteUser(usernameToInvite, inviteRole.value);
            inviteUsername.value = "";
            inviteRole.value = BoardAccessRole.VIEWER;
            resetInviteState();
        } catch (err) {
            console.error("Invite failed (handled by store):", err);
            resetInviteState();
        }
    } else if (
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
                lookupState.value = "error";
                lookupError.value = "Error checking user. Please try again.";
            } else if (result.length === 0) {
                lookupState.value = "not_found";
                lookupError.value = `User "${usernameToInvite}" not found.`;
            } else {
                foundUserDetails.value = result[0];
                lookupState.value = "found";
            }
        } catch (error) {
            console.error("Unexpected error during user lookup:", error);
            lookupState.value = "error";
            lookupError.value = "An unexpected error occurred.";
        }
    }
};

const handleRoleChange = (profileId: string, newRole: BoardAccessRole) => {
    const currentUser = boardStore.accessList.find(
        (u) => u.profileId === profileId,
    );
    if (currentUser && currentUser.role !== newRole) {
        boardStore.updateUserRole(profileId, newRole);
    }
};

const handleRemoveUser = (profileId: string) => {
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
        case BoardAccessRole.OWNER:
            return "Owner";
        case "owner":
            return "Owner";
        default:
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
watch(inviteUsername, (newValue, oldValue) => {
    if (
        lookupState.value !== "idle" &&
        lookupState.value !== "loading" &&
        newValue !== oldValue
    ) {
        resetInviteState();
    }
});

watch(
    () => props.modelValue,
    (isVisible) => {
        if (!isVisible) {
            if (copyTimeout.value) clearTimeout(copyTimeout.value);
            copySuccess.value = false;
            resetInviteState();
            inviteUsername.value = "";
            inviteRole.value = BoardAccessRole.VIEWER;
        } else {
            resetInviteState();
            inviteUsername.value = "";
            inviteRole.value = BoardAccessRole.VIEWER;
        }
    },
    { immediate: true },
);
</script>
