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

export const useBoardStore = defineStore("board", () => {
  // === Existing State ===
  const board = ref<Board | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedId = ref<string[]>([]);
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
  const randomNoteColor = useLocalStorage<Boolean>("randomNoteColor", false);

  let itemsCounter: Record<string, number> = {};

  function initalizeCounter(items: BoardItem[]) {
    const localCount: Record<string, number> = {};
    items.forEach((item) => {
      if (!localCount[item.kind]) {
        localCount[item.kind] = 0;
      }
      const match = item.displayName?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        localCount[item.kind] =
          num > localCount[item.kind] ? num : localCount[item.kind];
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
    board.value?.data.items.forEach((item) => {
      if (!item.displayName) {
        item.displayName = getDisplayName(
          (item.kind === "tacklet" && item.content.tackletId) || item.kind
        );
      }
    });
  };

  function getDisplayName(kind: string) {
    let prefix = `${(kind === "tacklet" && item?.content?.tackletId) || kind}`;
    prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
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
      // RESOLVED: Keep $fetch from HEAD but add oldSelectionBox logic from feat/align-and-arrange
      const response = await $fetch(`/api/board/${boardId}`);
      const boardData = response.data;

      const oldSelectionBox = ref(null)
      if(board.value?.data){
        oldSelectionBox.value = board.value.data?.items.find((item)=>item.id == 'SELECTION-BOX')
      }
      const settingsData = response.settings;
      isOldBoard.value = response.OldBoard ?? false;
      isOwner.value = response.isOwner ?? false;
      // settings.value = settingsData;

      if (boardData.data?.encrypted) {
        isEncrypted.value = true;
        if (!password.value) {
          showPasswordDialog.value = true;
          loading.value = false;
          return;
        }
        try {
          board.value = {
            board_id: boardData.board_id,
            data: await decrypt(boardData.data, password.value!),
          };
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

        board.value = boardData;
      }

      // re add selection if exist on old board
      if(oldSelectionBox.value!==null && oldSelectionBox.value!==undefined && board.value?.data){
              board.value.data.items.push(oldSelectionBox.value)
      }

      if (!board.value) {
        throw new Error("Board data could not be processed.");
      }

      const loadedBoardId = board.value.board_id;

      // Save to local storage
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
// spatialIndex setup
if (board.value?.data.items) {
      spatialIndex.bulkLoad(board.value.data.items);
    }
//

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

    initalizeCounter(board.value?.data.items || []);
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
    role: BoardAccessRole
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
    removeUserAccess: boolean
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

  const toggleRandomColor = (disable = true) => {
    if (disable === true) {
      if (randomNoteColor.value) {
        randomNoteColor.value = !randomNoteColor.value;
      } else {
        randomNoteColor.value = true;
      }
    } else {
      randomNoteColor.value = false;
    }
  };
  let multiSelectionMode = ref(false)
  const setSelectedId = (id: string | null, multiple = false) => {
    // Handle null id case (deselect all)
    if (id === null) {
      selectedId.value = [];
      board.value!.data.items = board.value!.data.items.filter(item => item.id !== "SELECTION-BOX");
      multiSelectionMode.value = false;
      return;
    }

    // Special handling when selection box is clicked
    if (id === "SELECTION-BOX") {
      // Keep the existing selection intact, just add the selection box to selectedIds if not already there
      if (!selectedId.value.includes("SELECTION-BOX")) {
        selectedId.value.push("SELECTION-BOX");
      }
      return;
    }

    if (multiple) {
      // Toggle the selected item
      if (selectedId.value.includes(id)) {
        selectedId.value = selectedId.value.filter(item => item !== id);
      } else {
        selectedId.value.push(id);
      }

      // Update selection box based on number of items selected (excluding SELECTION-BOX itself)
      const realSelectedItems = selectedId.value.filter(item => item !== "SELECTION-BOX");

      if (realSelectedItems.length <= 1) {
        // Remove selection box if 1 or fewer items selected
        board.value!.data.items = board.value!.data.items.filter(item => item.id !== "SELECTION-BOX");
        // Also remove from selectedId if it's there
        selectedId.value = selectedId.value.filter(item => item !== "SELECTION-BOX");
        multiSelectionMode.value = false;
      } else {
        // Calculate the bounds for the selection box

        const bounds = calculateSelectionBoxBounds(realSelectedItems, board.value!.data.items);

        if (!bounds) return; // No items to select

        const selectionBox = board.value?.data.items.find(item => item.id === "SELECTION-BOX");
        if (selectionBox) {
          // Update existing selection box content and dimensions
          selectionBox.content = realSelectedItems;
          selectionBox.x_position = bounds.x_position;
          selectionBox.y_position = bounds.y_position;
          selectionBox.width = bounds.width;
          selectionBox.height = bounds.height;

        } else {
          // Add new selection box
          board.value?.data.items.push({
            "id": "SELECTION-BOX",
            "kind": "selection",
            "content": realSelectedItems,
            "x_position": bounds.x_position,
            "y_position": bounds.y_position,
            "width": bounds.width,
            "height": bounds.height,
            "displayName":"selection"
          });

          if (!selectedId.value.includes("SELECTION-BOX")) {
                 selectedId.value.push("SELECTION-BOX");
               }
          multiSelectionMode.value = true;
        }
      }
    } else {
      // Single selection mode
      // If the same ID is clicked again, deselect it
      if (selectedId.value.length === 1 && selectedId.value[0] === id) {
        selectedId.value = [];
      } else {
        selectedId.value = [id];
      }
      // Remove selection box since only one or no items selected
      board.value!.data.items = board.value!.data.items.filter(item => item.id !== "SELECTION-BOX");
    }

  };
// HELPER FUNCTION TO CALCULATE SELECTION BOUNDS
const calculateSelectionBoxBounds = (itemIds: string[], boardItems: any[], padding: number = 20) => {
  // Filter out the items that are selected
  const selectedItems = boardItems.filter(item => itemIds.includes(item.id));
  if (selectedItems.length === 0) {
    return null;
  }

  // Initialize min/max with the first item's bounds
  let minX = selectedItems[0].x_position;
  let minY = selectedItems[0].y_position;
  let maxX = selectedItems[0].x_position + selectedItems[0].width;
  let maxY = selectedItems[0].y_position + selectedItems[0].height;

  // Find the min/max bounds across all selected items
  selectedItems.forEach(item => {
    minX = Math.min(minX, item.x_position);
    minY = Math.min(minY, item.y_position);
    maxX = Math.max(maxX, item.x_position + item.width);
    maxY = Math.max(maxY, item.y_position + item.height);
  });

  // Apply padding to give some space around the items
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    x_position: minX,
    y_position: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};


const mouseSelectionItems = (selectionBox) => {
  // Find everything in the drag-box
  const items = spatialIndex.findItemsInBox(selectionBox)
  if (items.length < 2) return

  // 1) Clear any existing selection (and remove old SELECTION-BOX)
  setSelectedId(null)

  // 2) Now select each hit, ALWAYS in "multi" mode
  items.forEach(item => {
    setSelectedId(item.id, true)
  })

}

// END SELECTION HELPER
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
    if (!board.value || !selectedId.value || selectedId.value.length < 1) return;

    const itemsToDelete = selectedId.value;
    const deletedItems: BoardItem[] = [];

    board.value.data.items = board.value.data.items.filter((item) => {
      if (!itemsToDelete.includes(item.id)) return true;
      deletedItems.push(item);
      return false;
    });

    // Process each deleted item
    for (const item of deletedItems) {
      // Handle file deletion for uploaded content
      if (
        (item.kind === "image") ||
        (item.kind === "audio") ||
        (item.kind === "file")
      ) {
        $fetch(`/api/upload/delete`, {
          method: "POST",
          body: { file_url: item.content.url },
        }).catch((err) => console.error("Failed to delete uploaded file:", err));
      }

      // Remove from spatial index
      spatialIndex.removeItem(item.id);
    }

    selectedId.value = [];
    debouncedSaveBoard();
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

    // Destructure the original data
    let { data, board_id } = unref(board.value);
    let dataToSend: any = data;

    // Create a deep copy of the data for saving
    let dataToSave = JSON.parse(JSON.stringify(data));

    // Filter out the SELECTION-BOX only from the copy
    dataToSave.items = dataToSave.items.filter(item => item.id !== "SELECTION-BOX");

    if (password.value) {
      try {
        dataToSend = await encrypt(dataToSave, password.value);
        isEncrypted.value = true;
      } catch (encErr) {
        console.error("Encryption failed during save:", encErr);
        error.value = "Encryption failed. Board not saved.";
        return;
      }
    } else {
      dataToSend = dataToSave;
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
      selectedId.value = [];
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
      } else {
        await navigateTo("/home");
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

  const customUpdateZoom = (
    newScale: number,
    centerX: number,
    centerY: number,
  ) => {
    const { scale, translateX, translateY, updateZoom } = usePanZoom();
    // In the original updateZoom, the first parameter is a multiplier
    // But in applyOptimalZoom, it's expecting to pass the absolute scale value
    // So we need to adapt the function to handle this difference

    const zoomPoint = {
      x: (centerX - translateX.value) / scale.value,
      y: (centerY - translateY.value) / scale.value,
    };

    scale.value = newScale;
    translateX.value = centerX - zoomPoint.x * newScale;
    translateY.value = centerY - zoomPoint.y * newScale;
  };

  const setTranslate = (x: number, y: number) => {
    translateX.value = x;
    translateY.value = y;
  };
  function addBoardItem(item: BoardItem) {

    if (!board.value) return;
    item.displayName =
      item.displayName ||
      getDisplayName(
        (item.kind === "tacklet" && item.content.tackletId) || item.kind
      );
    spatialIndex.addItem(item)
    board.value.data.items.push(item);

    applyOptimalZoom(
      board.value.data.items,
      customUpdateZoom,
      setTranslate,
      item.id,
    );
    debouncedSaveBoard();
  }

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
      (u) => u.profileId === currentUserProfileId.value
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
      (u) => u.profileId === currentUserProfileId.value
    );
    return !!userAccess;
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
    randomNoteColor,
    toggleRandomColor,
    multiSelectionMode,

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
    mouseSelectionItems,

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
