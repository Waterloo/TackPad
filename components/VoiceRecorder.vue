<template>
  <div class="recorder-container">
    <div class="recorder-header">
      <input
        v-model="title"
        class="recorder-title"
        placeholder="Recording Title"
        :disabled="isRecording"
      />
      <span v-if="isRecording" class="recording-indicator">RECORD</span>
    </div>

    <div class="timer">{{ formatTimer(timerSeconds) }}</div>
    
    <div class="visualization">
      <div ref="waveformContainer" class="waveform-container"></div>
      <p v-if="!isRecording && !audioBlob" class="start-text">Start notes</p>
    </div>
    
    <!-- Add playback progress control when we have an audio recording -->
    <div v-if="audioBlob && !isRecording" class="playback-controls">
      <span class="time-display">{{ formatTimer(currentPlaybackTime) }}</span>
      <input 
        type="range" 
        min="0" 
        :max="timerSeconds" 
        v-model="currentPlaybackTime" 
        @input="seekTo"
        class="seek-slider"
      />
      <span class="time-display">{{ formatTimer(timerSeconds) }}</span>
    </div>
    
    <div class="controls">
      <button 
        v-if="!isRecording && !audioBlob" 
        @click="startRecording" 
        class="record-btn"
        aria-label="Start recording"
      >
        <span class="icon">⏺</span>
      </button>
      
      <template v-if="isRecording">
        <button 
          @click="pauseRecording" 
          class="pause-btn"
          aria-label="Pause recording"
        >
          <span class="icon">⏸</span>
        </button>
        <button 
          @click="stopRecording" 
          class="stop-btn"
          aria-label="Stop recording"
        >
          <span class="icon">⏹</span>
        </button>
      </template>
      
      <template v-if="audioBlob">
        <button 
          @click="playRecording" 
          class="play-btn"
          :aria-label="isPlaying ? 'Pause playback' : 'Play recording'"
        >
          <span class="icon">{{ isPlaying ? '⏸' : '▶' }}</span>
        </button>
        <button 
          @click="saveRecording" 
          class="save-btn"
          aria-label="Save recording"
        >
          <span class="icon">💾</span>
        </button>
        <button 
          @click="discardRecording" 
          class="discard-btn"
          aria-label="Discard recording"
        >
          <span class="icon">🗑</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'

// Props
const props = defineProps({
  initialTitle: {
    type: String,
    default: 'My Recording'
  }
});

// Emits
const emit = defineEmits(['save', 'discard']);

// Reactive state
const title = ref(props.initialTitle);
const isRecording = ref(false);
const isPaused = ref(false);
const isPlaying = ref(false);
const timerSeconds = ref(0);
const currentPlaybackTime = ref(0);
const audioBlob = ref(null);
const audioUrl = ref('');
const timerInterval = ref(null);
const playbackUpdateInterval = ref(null);
const waveformContainer = ref(null);
const wavesurfer = ref(null);
const recorder = ref(null);

// Get supported MIME type for recording
const getSupportedMimeType = () => {
  const types = [
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=pcm',
    'audio/wav'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
  
      return type;
    }
  }
  
  // Default fallback
  return 'audio/webm';
};

// Timer functionality
const startTimer = () => {
  timerInterval.value = setInterval(() => {
    timerSeconds.value++;
  }, 1000);
};

const pauseTimer = () => {
  clearInterval(timerInterval.value);
};

const resetTimer = () => {
  clearInterval(timerInterval.value);
  timerSeconds.value = 0;
};

// Format timer as HH:MM:SS
const formatTimer = (seconds) => {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

// Initialize WaveSurfer
const initWaveSurfer = () => {
  // Create WaveSurfer instance
  wavesurfer.value = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: 'rgb(75, 150, 255)',
    progressColor: 'rgb(60, 120, 220)',
    height: 50,
    cursorWidth: 2,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    responsive: true,
    interact: true,  // Enable waveform interaction
  });

  // Create and attach the recorder plugin
  recorder.value = wavesurfer.value.registerPlugin(RecordPlugin.create({
    // Record configuration options
    mimeType: getSupportedMimeType(),
    renderRecordedAudio: true
  }));

  // Set up recorder event handlers
  recorder.value.on('record-start', () => {
    isRecording.value = true;
    startTimer();
  });

  recorder.value.on('record-pause', () => {
    isPaused.value = true;
    pauseTimer();
  });

  recorder.value.on('record-resume', () => {
    isPaused.value = false;
    startTimer();
  });

  recorder.value.on('record-end', (blob) => {
    audioBlob.value = blob;
    audioUrl.value = URL.createObjectURL(blob);
    isRecording.value = false;
    isPaused.value = false;
    pauseTimer();
  });
  
  // Add playback event listeners for updating time
  wavesurfer.value.on('play', () => {
    isPlaying.value = true;
    startPlaybackUpdate();
  });
  
  wavesurfer.value.on('pause', () => {
    isPlaying.value = false;
    stopPlaybackUpdate();
  });
  
  wavesurfer.value.on('finish', () => {
    isPlaying.value = false;
    stopPlaybackUpdate();
    currentPlaybackTime.value = timerSeconds.value;
  });
  
  // Enable seeking when clicking on the waveform
  wavesurfer.value.on('interaction', () => {
    // Update the current time indicator when clicking on waveform
    const progress = wavesurfer.value.getCurrentTime() / wavesurfer.value.getDuration();
    currentPlaybackTime.value = Math.floor(timerSeconds.value * progress);
  });
};

// Keep track of current playback position
const startPlaybackUpdate = () => {
  playbackUpdateInterval.value = setInterval(() => {
    if (wavesurfer.value && timerSeconds.value > 0) {
      const progress = wavesurfer.value.getCurrentTime() / wavesurfer.value.getDuration();
      currentPlaybackTime.value = Math.floor(timerSeconds.value * progress);
    }
  }, 250); // Update 4 times per second for smoother slider movement
};

const stopPlaybackUpdate = () => {
  clearInterval(playbackUpdateInterval.value);
};

// Seeking functionality
const seekTo = () => {
  if (wavesurfer.value && timerSeconds.value > 0) {
    const seekPosition = currentPlaybackTime.value / timerSeconds.value;
    wavesurfer.value.seekTo(seekPosition);
  }
};

// Recording functionality
const startRecording = async () => {
  try {
    if (!recorder.value) {
      console.error('WaveSurfer recorder not initialized');
      return;
    }
    
    await recorder.value.startRecording();
    
  } catch (error) {
    console.error('Error starting recording:', error);
  }
};

const pauseRecording = () => {
  if (isRecording.value && !isPaused.value) {
    recorder.value.pauseRecording();
  } else if (isPaused.value) {
    recorder.value.resumeRecording();
  }
};

const stopRecording = () => {
  if (recorder.value && isRecording.value) {
    recorder.value.stopRecording();
  }
};

// Playback functionality
const playRecording = () => {
  if (wavesurfer.value) {
    if (isPlaying.value) {
      wavesurfer.value.pause();
    } else {
      wavesurfer.value.play();
    }
  }
};

const saveRecording = () => {
  // Emit save event with recording data
  emit('save', {
    title: title.value,
    blob: audioBlob.value,
    duration: timerSeconds.value
  });
  
  // Reset component
  resetRecorder();
};

const discardRecording = () => {
  // Emit discard event
  emit('discard');
  
  // Reset component
  resetRecorder();
};

const resetRecorder = () => {
  audioBlob.value = null;
  currentPlaybackTime.value = 0;
  isPlaying.value = false;
  
  // Clean up playback interval
  stopPlaybackUpdate();
  
  // Clear URL object to avoid memory leaks
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = '';
  }
  
  resetTimer();
  
  // Reset wavesurfer
  if (wavesurfer.value) {
    wavesurfer.value.empty();
  }
};

// Lifecycle hooks
onMounted(() => {
  // Initialize WaveSurfer
  if (waveformContainer.value) {
    initWaveSurfer();
  }
});

onBeforeUnmount(() => {
  // Clean up resources
  resetTimer();
  stopPlaybackUpdate();
  
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
  
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }
});
</script>

<style scoped>
.recorder-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 100%;
  max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.recorder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recorder-title {
  font-size: 16px;
  font-weight: bold;
  border: none;
  outline: none;
  background: transparent;
  flex-grow: 1;
}

.recording-indicator {
  background-color: #ff5252;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.timer {
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  margin: 16px 0;
  font-variant-numeric: tabular-nums;
}

.visualization {
  background-color: #f5f5f5;
  border-radius: 8px;
  height: 60px;
  position: relative;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waveform-container {
  width: 100%;
  height: 100%;
}

.start-text {
  color: #999;
  position: absolute;
}

/* Playback controls styling */
.playback-controls {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
}

.seek-slider {
  flex-grow: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #ddd;
  border-radius: 3px;
}

.seek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4caf50;
  border-radius: 50%;
  cursor: pointer;
}

.seek-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #4caf50;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.time-display {
  font-size: 12px;
  color: #666;
  font-variant-numeric: tabular-nums;
  min-width: 44px;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 16px;
}

button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background-color: #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #e0e0e0;
}

.record-btn {
  background-color: #ff5252;
  color: white;
}

.record-btn:hover {
  background-color: #ff3232;
}

.pause-btn, .stop-btn {
  background-color: #666;
  color: white;
}

.play-btn {
  background-color: #4caf50;
  color: white;
}

.play-btn:hover {
  background-color: #3d8b40;
}

.icon {
  font-size: 20px;
}
</style>