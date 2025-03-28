import { ref } from "vue";
import { useFileStore } from "@/stores/fileStore";
import { useImageStore } from "@/stores/imageStore";
import { useAudioStore } from "@/stores/audioStore";
import { useProfileStore } from "~/stores/profileStore";

async function redirectToLogin() {
  const profileStore = useProfileStore();
  profileStore.open();
  profileStore.activeTab = "user";
}
export function useUpload() {
  const { loggedIn } = useUserSession();
  const { triggerError } = useErrorHandler();
  const { success } = useToast();

  const fileStore = useFileStore();
  const imageStore = useImageStore();
  const audioStore = useAudioStore();

  const isUploading = ref(false);

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) {
      triggerError({
        message: "No files selected",
        title: "Upload Error",
      });
      return;
    }

    if (isUploading.value) return;

    isUploading.value = true;
    try {
      if (!loggedIn.value) {
        triggerError({
          message: "Login to use Images and Files",
          title: "Login Required",
          onConfirm: redirectToLogin,
        });
        return;
      }

      // Process files sequentially
      for (const file of files) {
        const fileType = file.type ? file.type.split("/")[0] : "unknown";
        console.log(file.type);
        switch (fileType) {
          case "image":
            await imageStore.addImage(file);
            success("Image uploaded successfully");
            break;
          case "audio":
            await audioStore.addAudio(file);
            success("Audio uploaded successfully");
            break;
          default:
            await fileStore.addFile(file);
            success("File uploaded successfully");
            break;
        }
      }
    } catch (error) {
      console.error(error);
      triggerError({
        message: "Failed to upload files",
        title: "Upload Error",
      });
    } finally {
      isUploading.value = false;
    }
  };

  // Update the return to include the new method
  return {
    isUploading,
    uploadFiles, // Changed from uploadFile
  };
}
