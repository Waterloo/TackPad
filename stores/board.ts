// stores/boardStore.ts
import { ref, computed, unref } from "vue";
import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { debounce } from "lodash";
import { useRoute } from "vue-router";

// import type { EncryptedData } from '~/types/encryption'
import type { Board, BoardItem, Boards, Task } from "~/types/board";
import type { BoardSettings } from "~/types/settings"; // Assuming you have this type
import type { BoardAccessRole, BoardAccessLevel } from "~/types/access"; // Assuming you create this type based on schem
import { decrypt, encrypt } from "~/utils/crypto";

// Define a type for the access list items based on the API response
export interface BoardAccessUser {
  id: number; // Access record ID or placeholder (like 0 for owner if added manually)
  profileId: string;
  role: BoardAccessRole | "owner"; // Include 'owner' pseudo-role
  username: string | null; // Might be null if profile join fails? API suggests it's there.
  firstName: string | null;
  lastAccessed: string | null;
}

export const useBoardStore = defineStore("board", () => {
  // === Existing State ===
  const board = ref<Board | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedId = ref<string | null>(null);
  const scale = ref(1);
  const isOldBoard = ref(false); // Note: Consider if this is still needed with new auth/access
  const isOwner = ref(false); // Will be set based on API response
  const translateX = ref(0);
  const translateY = ref(0);
  const ZOOM_LEVEL = ref(1);
  const password = ref<string | null>(null); // Explicitly type as string | null
  const isEncrypted = ref(false);
  const showPasswordDialog = ref(false);
  const boards = useLocalStorage<Boards>("boards", {});
  const settings = useLocalStorage<BoardSettings>("settings", {}); // Use BoardSettings type

  const isProfileVisible = ref(false);
  const isFilePickerVisible = ref(false);
  const isVoiceRecorderVisible = ref(false);

  let profileTab = ref("user");

  const fromListId = ref<string | null>(null);
  const targetIndex = ref<number | null>(null);
  const draggedTask = ref<Task | null>(null);

  // === New Access Control State ===
  const accessList = ref<BoardAccessUser[]>([]);
  const boardAccessLevel = ref<BoardAccessLevel | null>(null);
  const boardOwnerId = ref<string | null>(null);
  const loadingAccess = ref(false);
  const errorAccess = ref<string | null>(null);
  const currentUserProfileId = ref<string | null>(null); // You'll need to populate this, e.g., from an auth store/composable

  // Get route at the store level
  const route = useRoute();

  // Actions

  const initializeBoard = async (boardId: string = "load") => {
    loading.value = true;
    error.value = null;
    errorAccess.value = null; // Reset access error on new load
    accessList.value = []; // Reset access list
    boardAccessLevel.value = null;
    boardOwnerId.value = null;
    currentUserProfileId.value = null;
    isOwner.value = false; // Reset owner status

    // Case: 'load' - Load the latest board from local storage (or redirect)
    if (boardId === "load") {
      // --- Load logic (slightly simplified for clarity) ---
      const settingsData = useLocalStorage<Record<string, any>>("settings", {});
      let mostRecentBoardId: string | null = null;
      let mostRecentTimestamp = 0;

      Object.entries(settingsData.value).forEach(([id, boardSetting]) => {
        // Assuming settings structure is { [boardId]: { last_accessed: timestamp, ... } }
        // Or potentially an array as in your original code: { [boardId]: [..., { last_accessed: timestamp }] }
        // Adapt this logic based on your actual 'settings' structure
        let lastAccessedTime = 0;
        if (Array.isArray(boardSetting) && boardSetting.length > 0) {
          const lastEntry = boardSetting[boardSetting.length - 1];
          if (lastEntry?.last_accessed) {
            lastAccessedTime = new Date(lastEntry.last_accessed).getTime();
          }
        } else if (
          typeof boardSetting === "object" &&
          boardSetting?.last_accessed
        ) {
          lastAccessedTime = new Date(boardSetting.last_accessed).getTime();
        }

        if (lastAccessedTime > mostRecentTimestamp) {
          mostRecentTimestamp = lastAccessedTime;
          mostRecentBoardId = id;
        }
      });

      if (mostRecentBoardId) {
        await navigateTo(`/board/${mostRecentBoardId}`);
        loading.value = false; // Stop loading as navigation will trigger a new load
        return;
      } else {
        // Fallback if no settings or timestamps found
        const existingBoardIds = Object.keys(boards.value);
        if (existingBoardIds.length > 0) {
          const lastBoardId =
            boards.value[existingBoardIds[existingBoardIds.length - 1]]
              .board_id;
          await navigateTo(`/board/${lastBoardId}`);
          loading.value = false; // Stop loading
          return;
        } else {
          // No boards in local storage, redirect to create
          await navigateTo("/board/create");
          loading.value = false; // Stop loading
          return;
        }
      }
    }

    // Case: 'create' or specific board ID
    try {
      // Fetch main board data
      const response = await $fetch(`/api/board/${boardId}`); // Using $fetch for Nuxt
      // Assuming response structure based on your original code: { data: BoardData, settings: BoardSettingsData, OldBoard: boolean, isOwner: boolean }
      // Adjust based on the *actual* structure returned by `/api/board/[id]` (GET)
      const boardData = response.data; // The actual board content { board_id, data: { encrypted?, title, items... } }
      const settingsData = response.settings; // Settings associated with the board for the *current* user
      isOldBoard.value = response.OldBoard ?? false; // Handle potential undefined
      // isOwner.value = response.isOwner ?? false; // We will set this more reliably from access details below

      if (boardData.data?.encrypted) {
        isEncrypted.value = true;
        if (!password.value) {
          showPasswordDialog.value = true;
          loading.value = false; // Stop loading, wait for password
          return; // Don't proceed further until password is provided
        }
        try {
          board.value = {
            board_id: boardData.board_id,
            data: await decrypt(boardData.data, password.value!),
          };
        } catch (e) {
          console.error("Decryption failed:", e);
          error.value = "Decryption failed. Please check the password.";
          password.value = null; // Clear potentially wrong password
          showPasswordDialog.value = true; // Re-show dialog
          loading.value = false;
          return;
        }
      } else {
        isEncrypted.value = false;
        board.value = boardData;
      }

      if (!board.value) {
        throw new Error("Board data could not be processed.");
      }

      const loadedBoardId = board.value.board_id;

      // Save basic board info to local storage
      boards.value[loadedBoardId] = {
        board_id: loadedBoardId,
        title: board.value?.data.title || "New TackPad",
      };

      // Save user-specific settings to local storage (might need refinement based on structure)
      if (settingsData) {
        settings.value = {
          ...settings.value,
          [loadedBoardId]: settingsData, // Check if settingsData is an array or object
        };
      }

      // --- Fetch Access Details ---
      await fetchAccessDetails(loadedBoardId);
      // isOwner is now set within fetchAccessDetails

      // Redirect if needed
      if (
        boardId === "create" ||
        (route?.params?.id && route.params.id !== loadedBoardId)
      ) {
        await navigateTo(`/board/${loadedBoardId}`);
        // No need to set loading = false here, navigation handles it
      }
    } catch (err: any) {
      console.error("Failed to load board:", err);
      // Check for specific error statuses (e.g., 401, 403, 404)
      if (err.response?.status === 404) {
        error.value = "Board not found.";
        // Maybe redirect to a 404 page or home
        // await navigateTo("/home");
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        error.value = "You don't have permission to access this board.";
        // Maybe redirect to login or home
        // await navigateTo("/home");
      } else {
        error.value = "Failed to load board data.";
      }
      board.value = null; // Clear board state on error
    } finally {
      loading.value = false;
    }
  };

  // --- NEW: Fetch Access Details Action ---
  const fetchAccessDetails = async (boardId: string) => {
    if (!boardId) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      const response = await $fetch<{
        boardId: string;
        accessLevel: BoardAccessLevel;
        owner: string;
        accessList: BoardAccessUser[];
      }>(`/api/board/${boardId}/access`);
      accessList.value = response.accessList;
      boardAccessLevel.value = response.accessLevel;
      boardOwnerId.value = response.owner;
      currentUserProfileId.value = response.currentUserProfileId;

      // Determine if the currently logged-in user is the owner
      // Ensure currentUserProfileId is populated correctly before this check

      if (currentUserProfileId.value && boardOwnerId.value) {
        isOwner.value = currentUserProfileId.value === boardOwnerId.value;
      } else {
        isOwner.value = false; // Cannot determine ownership if IDs are missing
      }
    } catch (err: any) {
      console.error("Failed to load access details:", err);
      errorAccess.value = err.data?.message || "Failed to load access details.";
      // Clear potentially sensitive data on access error
      accessList.value = [];
      boardAccessLevel.value = null;
      boardOwnerId.value = null;
      isOwner.value = false;
    } finally {
      loadingAccess.value = false;
    }
  };

  // --- NEW: Update User Role Action ---
  const updateUserRole = async (
    targetProfileId: string,
    role: BoardAccessRole,
  ) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      await $fetch(`/api/board/${board.value.board_id}/access`, {
        method: "PATCH",
        body: { profileId: targetProfileId, role },
      });
      // Re-fetch access details to update the list accurately
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      errorAccess.value = err.data?.message || "Failed to update role.";
    } finally {
      loadingAccess.value = false;
    }
  };

  // --- NEW: Remove User Access Action ---
  const removeUserAccess = async (targetProfileId: string) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      await $fetch(`/api/board/${board.value.board_id}/access`, {
        method: "DELETE",
        body: { profileId: targetProfileId }, // API expects profileId in body
      });
      // Re-fetch access details
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to remove user access:", err);
      errorAccess.value = err.data?.message || "Failed to remove user.";
    } finally {
      loadingAccess.value = false;
    }
  };

  // --- NEW: Update Board Access Level Action ---
  const updateBoardAccessLevel = async (accessLevel: BoardAccessLevel) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      const response = await $fetch<{
        boardId: string;
        accessLevel: BoardAccessLevel;
      }>(`/api/board/${board.value.board_id}/access-level`, {
        method: "PATCH",
        body: { accessLevel },
      });
      boardAccessLevel.value = response.accessLevel; // Update local state directly
    } catch (err: any) {
      console.error("Failed to update board access level:", err);
      errorAccess.value = err.data?.message || "Failed to update access level.";
    } finally {
      loadingAccess.value = false;
    }
  };

  // --- NEW: Invite User Action ---
  const inviteUser = async (username: string, role: BoardAccessRole) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      await $fetch(`/api/board/${board.value.board_id}/invite`, {
        method: "POST",
        body: { username, role },
      });
      // Re-fetch access details to include the new user
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to invite user:", err);
      errorAccess.value = err.data?.message || "Failed to invite user.";
      // Re-throw or handle specific errors (e.g., user not found) if needed by the UI
      throw err; // Or return a specific error object
    } finally {
      loadingAccess.value = false;
    }
  };

  // --- Existing Actions (modified slightly) ---

  const setSelectedId = (id: string | null) => {
    selectedId.value = id;
  };

  const setScale = (newScale: number) => {
    scale.value = newScale;
  };

  const setZoomLevel = (level: number) => {
    ZOOM_LEVEL.value = level;
  };

  const setTranslateX = (x: number) => {
    translateX.value = x;
  };

  const setTranslateY = (y: number) => {
    translateY.value = y;
  };

  const deleteSelected = () => {
    if (!board.value || !selectedId.value) return;

    let curItem: BoardItem | null = null; // Type the item

    board.value.data.items = board.value.data.items.filter((item) => {
      if (item.id !== selectedId.value) return true;
      curItem = item;
      return false;
    });

    if (
      curItem &&
      (curItem.kind === "image" ||
        curItem.kind === "audio" ||
        curItem.kind === "file") &&
      curItem.content?.url // Check if content and url exist
    ) {
      // Use $fetch and handle errors
      $fetch(`/api/upload/delete`, {
        method: "POST",
        body: { file_url: curItem.content.url },
      }).catch((err) => console.error("Failed to delete uploaded file:", err));
    }

    selectedId.value = null;
    debouncedSaveBoard();
  };

  const setBoardTitle = (title: string) => {
    if (!board.value) return;
    board.value.data.title = title;
    if (boards.value[board.value.board_id]) {
      // Check if entry exists
      boards.value[board.value.board_id].title = title;
    }
    debouncedSaveBoard();
  };

  const saveBoard = async () => {
    if (!board.value) return;
    error.value = null; // Clear previous save errors

    // Check permissions before attempting save
    // You might want a more granular check (e.g., allow viewers to save locally?)
    // This requires knowing the current user's role from the accessList
    // const currentUserRole = computed(() => accessList.value.find(u => u.profileId === currentUserProfileId.value)?.role);
    // if (currentUserRole.value === 'viewer') {
    //   console.warn("Viewers cannot save changes to the server.");
    //   // Optionally provide feedback to the user
    //   // error.value = "You have view-only permission and cannot save changes.";
    //   return;
    // }

    let { data, board_id } = unref(board.value);
    let dataToSend: any = data; // Use 'any' carefully or define a type for encrypted data

    if (password.value) {
      try {
        dataToSend = await encrypt(data, password.value);
        isEncrypted.value = true; // Ensure this is set if encrypting
      } catch (encErr) {
        console.error("Encryption failed during save:", encErr);
        error.value = "Encryption failed. Board not saved.";
        return; // Stop save if encryption fails
      }
    } else {
      isEncrypted.value = false; // Ensure this is false if not encrypting
    }

    try {
      // Use $fetch for consistency and better error handling
      await $fetch(`/api/save/${board_id}`, {
        method: "POST",
        body: { board_id, data: dataToSend }, // API expects board_id and data in body
      });
      // Optional: Provide success feedback
    } catch (err: any) {
      console.error("Failed to save board:", err);
      error.value = err.data?.message || "Failed to save board.";
      // Consider re-throwing or specific handling based on error type (e.g., 403 Forbidden)
      if (err.response?.status === 403) {
        error.value = "Permission denied. You might not have edit access.";
      }
    }
  };

  const deleteBoard = async () => {
    if (!board.value) return;
    error.value = null;

    // Add confirmation dialog here in the UI before calling this action

    try {
      await $fetch(`/api/board/${board.value.board_id}`, {
        method: "DELETE",
      });

      // Remove board from local storage
      delete boards.value[board.value.board_id];
      delete settings.value[board.value.board_id]; // Also remove settings

      // Clear current board state
      board.value = null;
      selectedId.value = null;
      password.value = null;
      isEncrypted.value = false;
      accessList.value = [];
      boardAccessLevel.value = null;
      boardOwnerId.value = null;
      isOwner.value = false;

      // Navigate away after deletion
      const remainingBoardIds = Object.keys(boards.value);
      if (remainingBoardIds.length > 0) {
        // Navigate to the most recently accessed *remaining* board
        // (You might need to re-implement the logic from initializeBoard('load') here
        // or simply navigate to the last one in the list)
        const lastBoardId =
          boards.value[remainingBoardIds[remainingBoardIds.length - 1]]
            .board_id;
        await navigateTo(`/board/${lastBoardId}`);
      }
      // else {
      //   await navigateTo("/home"); // Or '/board/create'
      // }
    } catch (err: any) {
      console.error("Failed to delete board:", err);
      error.value = err.data?.message || "Failed to delete board.";
      if (err.response?.status === 403) {
        error.value = "Permission denied. Only the owner can delete the board.";
      }
    }
  };

  const toggleEncryption = async (newPassword?: string) => {
    if (!board.value) return;

    if (isEncrypted.value) {
      // Decrypting: Clear password
      password.value = null;
      isEncrypted.value = false;
      console.log("Board encryption disabled.");
      // Save immediately to remove encryption on the server
      await saveBoard();
    } else {
      // Encrypting: Need a password
      if (!newPassword) {
        // Prompt for password - Show dialog or handle input flow
        console.warn("Password needed to enable encryption.");
        showPasswordDialog.value = true; // Assuming this dialog handles setting the password
        return; // Wait for password input
      }
      password.value = newPassword;
      isEncrypted.value = true;
      showPasswordDialog.value = false; // Hide dialog if it was shown
      console.log("Board encryption enabled.");
      // Save immediately to apply encryption on the server
      await saveBoard();
    }
  };

  // Debounced save action
  const debouncedSaveBoard = debounce(saveBoard, 3000); // Adjusted debounce time

  // Set page title
  useHead({
    title: computed(() => `${board.value?.data.title || "TackPad"} | TackPad`),
  });

  // === Computed properties ===
  const canEdit = computed(() => {
    if (!board.value || !currentUserProfileId.value) return false;
    if (isOwner.value) return true; // Owner can always edit

    const userAccess = accessList.value.find(
      (u) => u.profileId === currentUserProfileId.value,
    );
    return userAccess?.role === "editor"; // Only editors (besides owner) can edit
  });

  const canView = computed(() => {
    if (!board.value) return false; // No board loaded
    if (canEdit.value) return true; // Editors/Owners can view

    // Check public access level
    if (
      boardAccessLevel.value === "public" ||
      boardAccessLevel.value === "view_only"
    ) {
      return true;
    }

    // Check if user is explicitly listed with any role (including viewer)
    if (!currentUserProfileId.value) return false; // Anonymous users only covered by public access
    const userAccess = accessList.value.find(
      (u) => u.profileId === currentUserProfileId.value,
    );
    return !!userAccess; // If they are in the list, they have at least viewer access
  });

  return {
    // State
    board,
    loading,
    error,
    selectedId,
    scale,
    translateX,
    translateY,
    ZOOM_LEVEL,
    password, // Keep for decryption input
    isOldBoard, // Review if needed
    isOwner, // Now derived from access details
    fromListId,
    targetIndex,
    draggedTask,
    isEncrypted,
    showPasswordDialog,
    isProfileVisible,
    profileTab,
    isFilePickerVisible,
    isVoiceRecorderVisible,
    boards: computed(() => boards.value), // Existing local storage cache
    settings: computed(() => settings.value), // Existing local storage settings cache

    // Access Control State
    accessList,
    boardAccessLevel,
    boardOwnerId,
    loadingAccess,
    errorAccess,
    currentUserProfileId, // Expose if needed by components, manage setting it appropriately

    // Actions
    initializeBoard,
    setSelectedId,
    setScale,
    setZoomLevel,
    setTranslateX,
    setTranslateY,
    deleteSelected,
    setBoardTitle,
    saveBoard,
    deleteBoard,
    debouncedSaveBoard,
    toggleEncryption, // Modified to handle password setting flow better

    // Access Control Actions
    fetchAccessDetails,
    updateUserRole,
    removeUserAccess,
    updateBoardAccessLevel,
    inviteUser,

    // Computed Permissions
    canEdit,
    canView,
  };
});
