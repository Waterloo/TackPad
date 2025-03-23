<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { WindowMessenger, connect } from 'penpal';
import type { Tacklet } from '~/types/board';

type Prop = Pick<Tacklet, 'content'> & {isSelected: boolean, itemId: string}
const props = defineProps<Prop>();
const emit = defineEmits(['update:content', 'widgetInteraction']);

const iframeRef = ref<HTMLIFrameElement | null>(null);
const connection = ref<any>(null);
const messenger = ref<any>(null);
const isConnected = ref(false);
const isLoading = ref(true);
const remoteTacklet = ref<any>(null);

const tackletURL = computed(() => {
   const url =  new URL(props.content.url)
   url.searchParams.set('node_id', props.itemId);
   return url.toString();
});

// Set up the Penpal connection to the iframe
const setupConnection = () => {
  if (!iframeRef.value || !iframeRef.value.contentWindow) return;
    console.log('Setting up connection');
  try {
    // Create a dedicated messenger for this iframe
    const targetOrigin = new URL(props.content.url).origin;
    messenger.value = new WindowMessenger({
      remoteWindow: iframeRef.value.contentWindow,
      // Allow only the specific origin of the iframe
      allowedOrigins:["*"],
    });

    // Create a connection with methods our parent exposes to the iframe
    // We use a unique channel based on the widget ID to avoid conflicts
    const channelId = props.itemId;
    
    connection.value = connect({
      messenger: messenger.value,
      channel: channelId,
      methods: {
        // Methods to expose to the iframe
        getWidgetData: () => {
          return JSON.parse(JSON.stringify(props.content.data)) || {};
        },
        registerWidget: () => {
          console.log('Widget registered');
        },
        setWidgetData: (id: string, data: any) => {
            console.log(data);
          // Update the widget data and emit the change
          emit('update:content', data);
          return true;
        },
        widgetInteraction: (action: string, data: any) => {
          emit('widgetInteraction', action, data);
        },
        getWidgetId: () => props.itemId,
        
        getTheme: () => 'light', // You could make this dynamic based on your app theme
      }
    });

    // Wait for the connection to be established
    connection.value.promise
      .then((child: any) => {
        console.log('Connection established with iframe', channelId);
        isConnected.value = true;
        isLoading.value = false;
        remoteTacklet.value = child;
        // You can call methods on the child if the iframe exposes them
        // For example: child.initialize()
      })
      .catch((err: Error) => {
        console.error('Failed to connect to iframe:', err);
        isLoading.value = false;
      });
  } catch (error) {
    console.error('Error setting up Penpal connection:', error);
    isLoading.value = false;
  }
};

// Clean up the connection when the component is unmounted
const destroyConnection = () => {
  if (connection.value) {
    connection.value.destroy();
    connection.value = null;
    messenger.value = null;
    isConnected.value = false;
  }
};

const handleIframeLoad = () => {
    console.log('Iframe loaded');
  // Set up the connection once the iframe has loaded
  setupConnection();
};


// Clean up when the component is unmounted
onBeforeUnmount(destroyConnection);

watch(() => props.isSelected, async (val) => {
  if (remoteTacklet.value) {
    console.log('Tacklet selection state changed:', val);
    val ? remoteTacklet.value.onSelected() : remoteTacklet.value.onDeselected();
  }
});
</script>

<template>
  <div class="w-full h-full flex flex-col relative min-h-72 min-w-72">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
      <span class="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
    </div>
    
    <iframe 
      ref="iframeRef"
      :src="tackletURL" 
      frameborder="0" 
      class="w-full h-full"
      @load="handleIframeLoad"
      allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    ></iframe>
  </div>
</template>

<style scoped>
iframe {
  border-radius: inherit;
  background-color: white;
}
</style>