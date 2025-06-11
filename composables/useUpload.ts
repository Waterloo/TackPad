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
  const toast = useToast();

  const fileStore = useFileStore();
  const imageStore = useImageStore();
  const audioStore = useAudioStore();

  const isUploading = ref(false);

  const uploadFiles = async (files: File[], title?: string) => {
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

        switch (fileType) {
          case "image":
            await imageStore.addImage(file);
                       toast.add({
                         severity: 'success',
                         summary: 'Upload Successful',
                         detail: 'Image uploaded successfully',
                         life: 3000
                       });
            break;
          case "audio":
            await audioStore.addAudio(file, title ?? null);
                       toast.add({
                         severity: 'success',
                         summary: 'Upload Successful',
                         detail: 'Audio uploaded successfully',
                         life: 3000
                       });
            break;
          default:
            await fileStore.addFile(file);
                       toast.add({
                         severity: 'success',
                         summary: 'Upload Successful',
                         detail: 'File uploaded successfully',
                         life: 3000
                       });
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
