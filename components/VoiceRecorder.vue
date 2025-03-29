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
      
      <div class="recordings-list" v-if="previousRecordings.length > 0">
        <p class="recordings-header">Today's</p>
        <div 
          v-for="(recording, index) in previousRecordings" 
          :key="index"
          class="recording-item"
        >
          <span>{{ formatTime(recording.timestamp) }}</span>
        </div>
      </div>
  
      <div class="timer">{{ formatTimer(timerSeconds) }}</div>
      
      <div class="visualization">
        <canvas ref="visualizer" height="50"></canvas>
        <p v-if="!isRecording && !audioBlob" class="start-text">Start notes</p>
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
            aria-label="Play recording"
          >
            <span class="icon">▶</span>
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
  
  <script>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  
  export default {
    name: 'VoiceRecorder',
    props: {
      initialTitle: {
        type: String,
        default: 'My Recording'
      }
    },
    setup(props, { emit }) {
      const title = ref(props.initialTitle);
      const isRecording = ref(false);
      const isPaused = ref(false);
      const timerSeconds = ref(0);
      const audioBlob = ref(null);
      const audioUrl = ref('');
      const mediaRecorder = ref(null);
      const visualizer = ref(null);
      const audioChunks = ref([]);
      const timerInterval = ref(null);
      const audioContext = ref(null);
      const analyser = ref(null);
      const audioPlayer = ref(null);
      const previousRecordings = ref([]);
      
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
      
      // Format timestamp for recording list
      const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'am' : 'pm';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
      };
      
      // Recording functionality
      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Set up audio context for visualization
          audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
          analyser.value = audioContext.value.createAnalyser();
          const source = audioContext.value.createMediaStreamSource(stream);
          source.connect(analyser.value);
          
          // Set up media recorder
          mediaRecorder.value = new MediaRecorder(stream);
          mediaRecorder.value.ondataavailable = (event) => {
            audioChunks.value.push(event.data);
          };
          
          mediaRecorder.value.onstop = () => {
            const audioData = new Blob(audioChunks.value, { type: 'audio/wav' });
            audioBlob.value = audioData;
            audioUrl.value = URL.createObjectURL(audioData);
            visualizeRecording(); // Switch to static visualization
          };
          
          // Start recording
          audioChunks.value = [];
          mediaRecorder.value.start();
          isRecording.value = true;
          isPaused.value = false;
          startTimer();
          visualizeStream();
          
        } catch (error) {
          console.error('Error starting recording:', error);
        }
      };
      
      const pauseRecording = () => {
        if (isRecording.value && !isPaused.value) {
          mediaRecorder.value.pause();
          pauseTimer();
          isPaused.value = true;
        } else if (isPaused.value) {
          mediaRecorder.value.resume();
          startTimer();
          isPaused.value = false;
        }
      };
      
      const stopRecording = () => {
        if (mediaRecorder.value && isRecording.value) {
          mediaRecorder.value.stop();
          isRecording.value = false;
          isPaused.value = false;
          pauseTimer();
          
          // Stop all tracks on the stream
          mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
        }
      };
      
      // Playback functionality
      const playRecording = () => {
        if (!audioPlayer.value) {
          audioPlayer.value = new Audio(audioUrl.value);
          audioPlayer.value.onended = () => {
            console.log('Playback ended');
          };
        }
        audioPlayer.value.play();
      };
      
      const saveRecording = () => {
        // Add to previous recordings
        previousRecordings.value.push({
          title: title.value,
          timestamp: new Date(),
          blob: audioBlob.value,
          duration: timerSeconds.value
        });
        
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
        audioUrl.value = '';
        resetTimer();
        
        // Clear audio player if exists
        if (audioPlayer.value) {
          audioPlayer.value.pause();
          audioPlayer.value = null;
        }
        
        // Clear URL object to avoid memory leaks
        if (audioUrl.value) {
          URL.revokeObjectURL(audioUrl.value);
        }
      };
      
      // Visualization functions
      const visualizeStream = () => {
        if (!visualizer.value || !analyser.value) return;
        
        const canvas = visualizer.value;
        const canvasCtx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        analyser.value.fftSize = 256;
        const bufferLength = analyser.value.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvasCtx.clearRect(0, 0, width, height);
        
        const draw = () => {
          if (!isRecording.value) return;
          
          requestAnimationFrame(draw);
          analyser.value.getByteFrequencyData(dataArray);
          
          canvasCtx.fillStyle = '#f5f5f5';
          canvasCtx.fillRect(0, 0, width, height);
          
          const barWidth = (width / bufferLength) * 2.5;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 4;
            
            canvasCtx.fillStyle = `rgb(75, 150, 255)`;
            canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
          }
        };
        
        draw();
      };
      
      const visualizeRecording = () => {
        if (!visualizer.value) return;
        
        const canvas = visualizer.value;
        const canvasCtx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Draw static waveform representation
        canvasCtx.fillStyle = '#f5f5f5';
        canvasCtx.fillRect(0, 0, width, height);
        
        // Simple static waveform
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, height / 2);
        
        const segments = 50;
        for (let i = 0; i < segments; i++) {
          const x = width * (i / segments);
          const y = height / 2 + (Math.sin(i * 0.5) * 15);
          canvasCtx.lineTo(x, y);
        }
        
        canvasCtx.strokeStyle = 'rgb(75, 150, 255)';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      };
      
      // Lifecycle hooks
      onMounted(() => {
        // Initialize canvas
        if (visualizer.value) {
          const canvas = visualizer.value;
          canvas.width = canvas.parentElement.clientWidth;
        }
      });
      
      onBeforeUnmount(() => {
        // Clean up resources
        resetTimer();
        
        if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
          mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
        }
        
        if (audioContext.value) {
          audioContext.value.close();
        }
        
        if (audioUrl.value) {
          URL.revokeObjectURL(audioUrl.value);
        }
        
        if (audioPlayer.value) {
          audioPlayer.value.pause();
          audioPlayer.value = null;
        }
      });
      
      return {
        title,
        isRecording,
        timerSeconds,
        visualizer,
        audioBlob,
        previousRecordings,
        startRecording,
        pauseRecording,
        stopRecording,
        playRecording,
        saveRecording,
        discardRecording,
        formatTimer,
        formatTime
      };
    }
  };
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
  
  .recordings-list {
    margin-bottom: 16px;
  }
  
  .recordings-header {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }
  
  .recording-item {
    font-size: 14px;
    padding: 4px 0;
    color: #333;
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
  
  .start-text {
    color: #999;
    position: absolute;
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