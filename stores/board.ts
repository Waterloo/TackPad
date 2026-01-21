import { ref, computed, unref } from "vue";
import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { assign, debounce } from "lodash";
import { useRoute } from "vue-router";

// import type { EncryptedData } from '~/types/encryption'
import type { Board, BoardItem, Boards, Task } from "~/types/board";
import type { BoardSettings } from "~/types/settings";
import type { BoardAccessRole, BoardAccessLevel } from "~/types/access";
import { decrypt, encrypt } from "~/utils/crypto";
import {
  deserializeBoard,
  serializeBoard,
  itemsMapToArray,
  mapToObject,
  deserializeBoardUniversal,
} from "~/utils/mapMigration";

// Define a type for the access list items based on the API response
export interface BoardAccessUser {
  id: number;
  profileId: string;
  role: BoardAccessRole | "owner";
  username: string | null;
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
  const isOldBoard = ref(false);
  const isOwner = ref(false);
  const translateX = ref(0);
  const translateY = ref(0);
  const ZOOM_LEVEL = ref(1);
  const password = ref<string | null>(null);
  const isEncrypted = ref(false);
  const showPasswordDialog = ref(false);
  const boards = useLocalStorage<Boards>("boards", {});
  const settings = useLocalStorage<BoardSettings>("settings", {});
  const board_id = ref(null)
  const boardActions = computed(() => {
    if (!board_id.value) return null
    return useYjsBoard(board_id.value)
  })
  let itemsCounter: Record<string, number> = {};

  function initializeCounter(items: Map<string, BoardItem>) {
    const localCount: Record<string, number> = {};
    items.forEach((item) => {
      if (!localCount[item.kind]) {
        localCount[item.kind] = 0;
      }
      const match = item.displayName?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        localCount[item.kind] = Math.max(num, localCount[item.kind]);
      }
    });
    itemsCounter = localCount;
  }
  const getCounter = (kind: string) => {
    if (!itemsCounter[kind]) {
      itemsCounter[kind] = 0;
    }
    itemsCounter[kind]++;
    return itemsCounter[kind];
  };
  const assignDisplayNames = () => {
    board.value?.data.items?.forEach((item) => {
      if (!item.displayName) {
        item.displayName = getDisplayName(
          (item.kind === "tacklet" && item.content.tackletId) || item.kind,
        );
      }
    });
  };
  function getDisplayName(kind: string) {
    const prefix = kind.charAt(0).toUpperCase() + kind.slice(1);
    return `${prefix} ${getCounter(kind)}`;
  }

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
  const currentUserProfileId = ref<string | null>(null);

  // Get route at the store level
  const route = useRoute();

  // Actions
  const initializeBoard = async (boardId: string = "load") => {
    loading.value = true;
    error.value = null;
    errorAccess.value = null;
    accessList.value = [];
    boardAccessLevel.value = null;
    boardOwnerId.value = null;
    currentUserProfileId.value = null;
    isOwner.value = false;

    // Case: 'load' - Load the latest board from local storage (or redirect)
    if (boardId === "load") {
      const settingsData = useLocalStorage<Record<string, any>>("settings", {});
      let mostRecentBoardId: string | null = null;
      let mostRecentTimestamp = 0;

      Object.entries(settingsData.value).forEach(([id, boardSetting]) => {
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
        loading.value = false;
        return;
      } else {
        const existingBoardIds = Object.keys(boards.value);
        if (existingBoardIds.length > 0) {
          const lastBoardId =
            boards.value[existingBoardIds[existingBoardIds.length - 1]]
              .board_id;
          await navigateTo(`/board/${lastBoardId}`);
          loading.value = false;
          return;
        } else {
          await navigateTo("/board/create");
          loading.value = false;
          return;
        }
      }
    }

    // Case: 'create' or specific board ID
    try {
      const response = await $fetch(`/api/board/${boardId}`);
      const boardData = response.data;
      const settingsData = response.settings;
      isOldBoard.value = response.OldBoard ?? false;

      if (boardData.data?.encrypted) {
        isEncrypted.value = true;
        if (!password.value) {
          showPasswordDialog.value = true;
          loading.value = false;
          return;
        }

        try {
          const decryptedData = await decrypt(boardData.data, password.value!);
          // Convert from serialized format to Map format
          board.value = deserializeBoardUniversal({
            board_id: boardData.board_id,
            data: decryptedData,
          });
        } catch (e) {
          console.error("Decryption failed:", e);
          error.value = "Decryption failed. Please check the password.";
          password.value = null;
          showPasswordDialog.value = true;
          loading.value = false;
          return;
        }
      } else {
        isEncrypted.value = false;
        board.value = deserializeBoardUniversal(boardData);
        board_id.value = boardData.board_id;
      }

      if (!board.value) {
        throw new Error("Board data could not be processed.");
      }

      const loadedBoardId = board.value.board_id;

      boards.value[loadedBoardId] = {
        board_id: loadedBoardId,
        title: board.value?.data.title || "New TackPad",
      };

      if (settingsData) {
        settings.value = {
          ...settings.value,
          [loadedBoardId]: settingsData,
        };
      }

      await fetchAccessDetails(loadedBoardId);

      if (
        boardId === "create" ||
        (route?.params?.id && route.params.id !== loadedBoardId)
      ) {
        await navigateTo(`/board/${loadedBoardId}`);
      }
    } catch (err: any) {
      console.error("Failed to load board:", err);
      if (err.response?.status === 404) {
        error.value = "Board not found.";
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        error.value = "You don't have permission to access this board.";
      } else {
        error.value = "Failed to load board data.";
      }
      board.value = null;
    } finally {
      loading.value = false;
    }

    initializeCounter(board.value?.data.items || new Map());
    assignDisplayNames();
  };

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
        currentUserProfileId: string;
      }>(`/api/board/${boardId}/access`);
      accessList.value = response.accessList;
      boardAccessLevel.value = response.accessLevel;
      boardOwnerId.value = response.owner;
      currentUserProfileId.value = response.currentUserProfileId;

      if (currentUserProfileId.value && boardOwnerId.value) {
        isOwner.value = currentUserProfileId.value === boardOwnerId.value;
      } else {
        isOwner.value = false;
      }
    } catch (err: any) {
      console.error("Failed to load access details:", err);
      errorAccess.value = err.data?.message || "Failed to load access details.";
      accessList.value = [];
      boardAccessLevel.value = null;
      boardOwnerId.value = null;
      isOwner.value = false;
    } finally {
      loadingAccess.value = false;
    }
  };

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
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      errorAccess.value = err.data?.message || "Failed to update role.";
    } finally {
      loadingAccess.value = false;
    }
  };

  const removeUserAccess = async (targetProfileId: string) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      await $fetch(`/api/board/${board.value.board_id}/access`, {
        method: "DELETE",
        body: { profileId: targetProfileId },
      });
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to remove user access:", err);
      errorAccess.value = err.data?.message || "Failed to remove user.";
    } finally {
      loadingAccess.value = false;
    }
  };

  const updateBoardAccessLevel = async (
    accessLevel: BoardAccessLevel,
    removeUserAccess: boolean,
  ) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      const response = await $fetch<{
        boardId: string;
        accessLevel: BoardAccessLevel;
      }>(`/api/board/${board.value.board_id}/access-level`, {
        method: "PATCH",
        body: { accessLevel, removeUserAccess },
      });
      boardAccessLevel.value = response.accessLevel;
    } catch (err: any) {
      console.error("Failed to update board access level:", err);
      errorAccess.value = err.data?.message || "Failed to update access level.";
    } finally {
      loadingAccess.value = false;
    }
  };

  const inviteUser = async (username: string, role: BoardAccessRole) => {
    if (!board.value?.board_id) return;
    loadingAccess.value = true;
    errorAccess.value = null;
    try {
      await $fetch(`/api/board/${board.value.board_id}/invite`, {
        method: "POST",
        body: { username, role },
      });
      await fetchAccessDetails(board.value.board_id);
    } catch (err: any) {
      console.error("Failed to invite user:", err);
      errorAccess.value = err.data?.message || "Failed to invite user.";
      throw err;
    } finally {
      loadingAccess.value = false;
    }
  };

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

    const curItem = board.value.data.items.get(selectedId.value);

    if (curItem) {
      boardActions.value?.removeItem(selectedId.value);
      board.value.data.items.delete(selectedId.value);

      if (
        curItem &&
        (curItem.kind === "image" ||
          curItem.kind === "audio" ||
          curItem.kind === "file") &&
        curItem.content?.url
      ) {
        $fetch(`/api/upload/delete`, {
          method: "POST",
          body: { file_url: curItem.content.url },
        }).catch((err) =>
          console.error("Failed to delete uploaded file:", err),
        );
      }

      selectedId.value = null;
      debouncedSaveBoard();
    }
  };

  const setBoardTitle = (title: string) => {
    if (!board.value) return;
    board.value.data.title = title;
    if (boards.value[board.value.board_id]) {
      boards.value[board.value.board_id].title = title;
    }
    debouncedSaveBoard();
  };

  const saveBoard = async () => {
    if (!board.value) return;
    error.value = null;

    const dataToStore = {
      ...board.value.data,
      items: mapToObject(board.value.data.items),
    };
    const { board_id } = board.value;
    let dataToSend: any = dataToStore;

    if (password.value) {
      try {
        dataToSend = await encrypt(data, password.value);
        isEncrypted.value = true;
      } catch (encErr) {
        console.error("Encryption failed during save:", encErr);
        error.value = "Encryption failed. Board not saved.";
        return;
      }
    } else {
      isEncrypted.value = false;
    }

    try {
      await $fetch(`/api/save/${board_id}`, {
        method: "POST",
        body: { board_id, data: dataToSend },
      });
    } catch (err: any) {
      console.error("Failed to save board:", err);
      error.value = err.data?.message || "Failed to save board.";
      if (err.response?.status === 403) {
        error.value = "Permission denied. You might not have edit access.";
      }
    }
  };

  const deleteBoard = async () => {
    if (!board.value) return;
    error.value = null;

    try {
      await $fetch(`/api/board/${board.value.board_id}`, {
        method: "DELETE",
      });

      delete boards.value[board.value.board_id];
      delete settings.value[board.value.board_id];

      board.value = null;
      selectedId.value = null;
      password.value = null;
      isEncrypted.value = false;
      accessList.value = [];
      boardAccessLevel.value = null;
      boardOwnerId.value = null;
      isOwner.value = false;

      const remainingBoardIds = Object.keys(boards.value);
      if (remainingBoardIds.length > 0) {
        const lastBoardId =
          boards.value[remainingBoardIds[remainingBoardIds.length - 1]]
            .board_id;
        await navigateTo(`/board/${lastBoardId}`);
      }
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
      password.value = null;
      isEncrypted.value = false;
      console.log("Board encryption disabled.");
      await saveBoard();
    } else {
      if (!newPassword) {
        console.warn("Password needed to enable encryption.");
        showPasswordDialog.value = true;
        return;
      }
      password.value = newPassword;
      isEncrypted.value = true;
      showPasswordDialog.value = false;
      console.log("Board encryption enabled.");
      await saveBoard();
    }
  };

  function addBoardItem(item: BoardItem) {
    if (!board.value) return;
    item.displayName =
      item.displayName ||
      getDisplayName(
        (item.kind === "tacklet" && item.content.tackletId) || item.kind,
      );

    board.value.data.items.set(item.id, item);
    boardActions.value?.addItem(item);
    debouncedSaveBoard();
  }
  const updateBoardItem = async(itemId,item)=>{
    if (!board.value) return;
    board.value.data.items.set(itemId, item);
    boardActions.value?.updateItem(itemId, item);
    debouncedSaveBoard();
  }
  const updateBoardItems = async (items) => {
    if (!board.value && !board.value.data) return;
    board.value.data.items = items;
  };
  async function backupBoards(boardsToExport: any) {
    const res = await fetch("/api/backup/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ boardsToExport }),
    });
    if (!res.ok) {
      console.error("Failed to backup boards");
      return {
        success: false,
        message: "Failed to backup boards",
      };
    }
    const data = await res.json();

    return {
      success: true,
      data,
      message: "Boards backed up successfully",
    };
  }

  // Debounced save action
  const debouncedSaveBoard = debounce(saveBoard, 3000);

  // Set page title
  useHead({
    title: computed(() => `${board.value?.data.title || "TackPad"} | TackPad`),
  });

  // === Computed properties (DEDUPLICATED) ===
  const canEdit = computed(() => {
    if (!board.value || !currentUserProfileId.value) return false;
    if (isOwner.value) return true;

    const userAccess = accessList.value.find(
      (u) => u.profileId === currentUserProfileId.value,
    );
    return userAccess?.role === "editor";
  });

  const canView = computed(() => {
    if (!board.value) return false;
    if (canEdit.value) return true;

    if (
      boardAccessLevel.value === "public" ||
      boardAccessLevel.value === "view_only"
    ) {
      return true;
    }

    if (!currentUserProfileId.value) return false;
    const userAccess = accessList.value.find(
      (u) => u.profileId === currentUserProfileId.value,
    );
    return !!userAccess;
  });

  // Add a computed property for components that need arrays
  const boardItemsArray = computed(() => {
    if (!board.value?.data.items) return [];
    return itemsMapToArray(board.value.data.items);
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
    password,
    isOldBoard,
    isOwner,
    fromListId,
    targetIndex,
    draggedTask,
    isEncrypted,
    showPasswordDialog,
    isProfileVisible,
    profileTab,
    isFilePickerVisible,
    isVoiceRecorderVisible,
    boards: computed(() => boards.value),
    settings: computed(() => settings.value),

    // Access Control State
    accessList,
    boardAccessLevel,
    boardOwnerId,
    loadingAccess,
    errorAccess,
    currentUserProfileId,

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
    toggleEncryption,
    addBoardItem,
    backupBoards,
    // updataBoardYjs
    updateBoardItems,
    updateBoardItem,
    // Access Control Actions
    fetchAccessDetails,
    updateUserRole,
    removeUserAccess,
    updateBoardAccessLevel,
    inviteUser,
    boardItemsArray,
    // Computed Permissions
    canEdit,
    canView,
  };
});
