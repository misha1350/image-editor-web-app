<template>
  <div class="image-editor">
    <div class="toolbar">

      <input type="file" accept="image/*" @change="handleFileUpload" />
      
      <!-- Кнопки для инструментов -->
      <div class="tool-buttons">
        <button 
          :class="{ active: $store.state.activeTool === 'eyedropper' }"
          @click="$store.commit('setActiveTool', 'eyedropper')"
        >
          Eyedropper
        </button>
        <button 
          :class="{ active: $store.state.activeTool === 'hand' }"
          @click="$store.commit('setActiveTool', 'hand')"
        >
          Hand Tool
        </button>
      </div>

      <div class="scale-control">
        <input type="range" v-model="scale" min="0.5" max="3" step="0.1" />
        <span>{{ Math.round(scale * 100) }}%</span>
      </div>
    </div>
    <div class="canvas-container" @mousemove="handleMouseMove">
      <canvas ref="canvas" @mousedown="handleMouseDown" @mouseup="handleMouseUp"></canvas>
    </div>
    <div v-if="selectedColor" class="color-info">
      <p>RGB: {{ selectedColor.r }}, {{ selectedColor.g }}, {{ selectedColor.b }}</p>
      <p>Position: ({{ selectedColor.x }}, {{ selectedColor.y }})</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

export default {
  setup() {
    const store = useStore()
    const canvas = ref(null)
    const ctx = ref(null)
    const scale = ref(1)
    const isDragging = ref(false)
    const lastPos = ref({ x: 0, y: 0 })
    const selectedColor = ref(null)

    const drawImage = () => {
      if (!store.state.image || !ctx.value) return
      
      const img = store.state.image
      const container = canvas.value.parentElement
      
      // Размеры холста
      canvas.value.width = container.clientWidth
      canvas.value.height = container.clientHeight
      
      // Центрирование
      const centerX = (canvas.value.width - img.width * scale.value) / 2
      const centerY = (canvas.value.height - img.height * scale.value) / 2
      
      ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
      ctx.value.save()
      ctx.value.translate(centerX + store.state.offset.x, centerY + store.state.offset.y)
      ctx.value.scale(scale.value, scale.value)
      ctx.value.drawImage(img, 0, 0)
      ctx.value.restore()
    }
    
    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        store.dispatch('loadImage', file).then(() => {
          drawImage()
        })
      }
    }

    const handleMouseDown = (e) => {
      if (store.state.activeTool === 'hand') {
        isDragging.value = true
        lastPos.value = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseUp = () => {
      isDragging.value = false
    }

    const handleMouseMove = (e) => {
      if (store.state.activeTool === 'eyedropper' && ctx.value) {
        const rect = canvas.value.getBoundingClientRect()
        const x = Math.floor((e.clientX - rect.left) / scale.value)
        const y = Math.floor((e.clientY - rect.top) / scale.value)
        const pixel = ctx.value.getImageData(x, y, 1, 1).data
        selectedColor.value = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          x,
          y
        }
      } else if (isDragging.value && store.state.activeTool === 'hand') {
        const deltaX = e.clientX - lastPos.value.x
        const deltaY = e.clientY - lastPos.value.y
        store.commit('setOffset', {
          x: store.state.offset.x + deltaX,
          y: store.state.offset.y + deltaY
        })
        lastPos.value = { x: e.clientX, y: e.clientY }
        drawImage()
      }
    }

    watch(scale, () => {
      store.commit('setScale', scale.value)
      drawImage()
    })

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')
    })

    return {
      canvas,
      handleFileUpload,
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
      scale,
      selectedColor
    }
  }
}
</script>

<style scoped>
.image-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  width: 100%;
  height: 100vh;
}

.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Для кнопок */
.tool-buttons {
  display: flex;
  gap: 0.5rem;
}

.tool-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color, #ccc);
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.tool-buttons button.active {
  background: #e0e0e0;
  border-color: #999;
}

.tool-buttons button:hover {
  background: #f0f0f0;
}

/* Для остального */
.canvas-container {
  flex: 1;
  border: 1px solid #ccc;
  overflow: hidden;
  min-height: 500px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  position: relative;
}

canvas {
  background: white;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.scale-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-info {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: white;
  padding: 0.5rem;
  border: 1px solid #ccc;
}
</style>