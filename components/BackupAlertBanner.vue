<template>
    <Transition name="slide-down">
        <div
            v-if="shouldShowBanner && !dismissed"
            class="backup-indicator"
            role="alert"
            aria-live="polite"
        >
            <div class="backup-content">
                <div class="backup-icon" aria-hidden="true">
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
                        <path
                            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                        ></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <span class="backup-message">
                    <strong>Important Backup Notice:</strong>
                    <br />
                    Dear valued user, Heads up! We'll be making some significant
                    updates to our system soon. To ensure you don't lose any of
                    your important work, please take a moment to back up your
                    boards before <strong> May 15th, 2025.</strong>
                </span>
                <div class="backup-actions flex gap-3 pt-3">
                    <button @click="redirectToBackup" class="backup-now-button">
                        Export Board Now
                    </button>
                    <button @click="dismiss">Dismiss</button>
                    <button
                        @click="dismiss"
                        class="dismiss-button fixed right-10 top-5"
                        title="Dismiss"
                        aria-label="Dismiss notification"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProfileStore } from "@/stores/profileStore";
const profileStore = useProfileStore();
const shouldShowBanner = ref(false);
const dismissed = ref(false);

const BACKUP_LOCALSTORAGE_KEY = "isBackedUp";

onMounted(() => {
    try {
        const backupStatus = localStorage.getItem(BACKUP_LOCALSTORAGE_KEY);
        if (backupStatus === null || backupStatus === "false") {
            shouldShowBanner.value = true;
        }
    } catch (error) {
        console.warn(
            "Could not access localStorage. Backup reminder banner will be shown as a precaution.",
            error,
        );
        shouldShowBanner.value = true;
    }
});

const dismiss = () => {
    dismissed.value = true;
};

const redirectToBackup = () => {
    // For external links, you might want to open in a new tab:
    // window.open(props.backupUrl, '_blank');
    // For internal navigation (if using Vue Router), you'd use router.push():
    // import { useRouter } from 'vue-router';
    // const router = useRouter();
    // router.push(props.backupUrl);
    // For simple redirection:
    profileStore.activeTab = "settings";
    profileStore.open();
};
</script>
<style scoped>
.backup-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: #fff3cd;
    color: #664d03; /* Improved contrast for better readability */
    z-index: 9998;
    padding: 12px 16px; /* Slightly more padding for better touch targets */
    display: flex;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    font-size: 1rem; /* Increased from 0.9rem for better readability */
    border-bottom: 1px solid #ffe69c; /* Added border for better definition */
}

.backup-message {
    flex-grow: 1;
    line-height: 1.4; /* Improved line height for readability */
    font-weight: 400; /* Regular weight for main text */
}

.backup-message strong {
    font-weight: 600; /* Make the heading stand out */
}

.backup-now-button {
    background-color: #fd7e14; /* More contrasting color */
    color: white; /* White text for better contrast */
    border: 1px solid #fd7e14;
    padding: 8px 16px; /* Larger button for better touch target */
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    white-space: nowrap;
    font-size: 0.95rem; /* Slightly larger font for button */
}

.backup-now-button:hover {
    background-color: #e8710a;
    border-color: #e8710a;
}

.backup-now-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(253, 126, 20, 0.4);
}
</style>
