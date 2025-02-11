<template>
  <div class="image-editor">
    <div class="toolbar">
      <input type="file" accept="image/*" @change="handleFileUpload" />
      <select v-model="$store.state.activeTool">
        <option value="eyedropper">Eyedropper</option>
        <option value="hand">Hand Tool</option>
      </select>
      <div class="scale-control">
        <input type="range" v-model="scale" min="0.1" max="3" step="0.1" />
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
      canvas.value.width = img.width
      canvas.value.height = img.height
      
      ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
      ctx.value.save()
      ctx.value.translate(store.state.offset.x, store.state.offset.y)
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
  max-width: 100%;
  max-height: 100vh;
}

.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.canvas-container {
  border: 1px solid #ccc;
  overflow: auto;
  max-width: 100%;
  max-height: calc(100vh - 150px);
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