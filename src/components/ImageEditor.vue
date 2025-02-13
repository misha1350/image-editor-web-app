<template>
  <div class="image-editor">
    <div class="toolbar">
      <input type="file" accept="image/*" @change="handleFileUpload" />
      
      <!-- Tool buttons - add new ones by following the same pattern -->
      <div class="tool-buttons">
        <button 
          :class="{ active: activeTool === 'eyedropper' }"
          @click="activeTool = 'eyedropper'"
          title="Eyedropper: Click to sample colors from the image. Use Alt+Click for second color."
        >
          Eyedropper
        </button>
        <button 
          :class="{ active: activeTool === 'hand' }"
          @click="activeTool = 'hand'"
          title="Hand Tool: Click and drag to move the image"
        >
          Hand Tool
        </button>
        <button 
          v-if="hasImage"
          @click="showResizeModal = true"
          title="Resize: Change image dimensions"
        >
          Resize
        </button>
        <button
          v-if="hasImage"
          @click="saveImage"
          title="Save: Download the current image"
        >
          Save
        </button>
        <button
          v-if="hasImage"
          @click="resetView"
          title="Reset view to fit image"
        >
          Reset View
        </button>
      </div>

      <div class="scale-control">
        <input type="range" v-model="scale" min="0.1" max="3" step="0.1" @change="drawImage" />
        <span>{{ Math.round(scale * 100) }}%</span>
      </div>
    </div>

    <div class="canvas-container" @mousemove="handleMouseMove">
      <canvas 
        ref="canvas" 
        @mousedown="handleMouseDown" 
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      ></canvas>
    </div>

    <!-- Enhanced color info panel -->
    <div v-if="selectedColor" class="color-info">
      <div class="color-samples">
        <div class="color-sample" :style="{ backgroundColor: getRgbString(selectedColor) }">
          Color 1
        </div>
        <div v-if="secondColor" class="color-sample" :style="{ backgroundColor: getRgbString(secondColor) }">
          Color 2
        </div>
      </div>
      <div class="color-details">
        <p>Color 1 - RGB: {{ selectedColor.r }}, {{ selectedColor.g }}, {{ selectedColor.b }}</p>
        <p>Position: ({{ selectedColor.x }}, {{ selectedColor.y }})</p>
        <p v-if="colorSpaces">XYZ: {{ formatColorSpace(colorSpaces.xyz) }}</p>
        <p v-if="colorSpaces">Lab: {{ formatColorSpace(colorSpaces.lab) }}</p>
        <p v-if="colorSpaces">LCH: {{ formatColorSpace(colorSpaces.lch) }}</p>
        <p v-if="colorSpaces">OKLch: {{ formatColorSpace(colorSpaces.oklch) }}</p>
      </div>
      <div v-if="secondColor" class="color-details">
        <p>Color 2 - RGB: {{ secondColor.r }}, {{ secondColor.g }}, {{ secondColor.b }}</p>
        <div v-if="contrastRatio" class="contrast-info">
          <p>Contrast Ratio: {{ contrastRatio.toFixed(2) }}:1</p>
          <p v-if="contrastRatio < 4.5" class="contrast-warning">
            ⚠️ Insufficient contrast (should be at least 4.5:1)
          </p>
        </div>
      </div>
    </div>

    <ResizeModal
      v-if="hasImage"
      :show="showResizeModal"
      :original-width="imageWidth"
      :original-height="imageHeight"
      @close="showResizeModal = false"
      @resize="handleResize"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { getRgbColorSpaces } from '../utils/colorSpaces'
import ResizeModal from './ResizeModal.vue'

// Add contrast calculation utility
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(color1, color2) {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export default {
  components: { ResizeModal },
  
  setup() {
    const canvas = ref(null)
    const ctx = ref(null)
    const image = ref(null)
    const imageWidth = ref(0)
    const imageHeight = ref(0)
    
    // состояние интерфейса
    const scale = ref(1)
    const activeTool = ref('eyedropper')
    const showResizeModal = ref(false)
    const isDragging = ref(false)
    const offset = ref({ x: 0, y: 0 })
    const lastPos = ref({ x: 0, y: 0 })

    const resetView = () => {
      if (!image.value || !canvas.value) return
      
      const container = canvas.value.parentElement
      const containerRatio = container.clientWidth / container.clientHeight
      const imageRatio = imageWidth.value / imageHeight.value
      
      // Calculate scale to fit image within container with 50px margin
      const marginScale = 0.9 // Factor to add margin
      if (imageRatio > containerRatio) {
        scale.value = (container.clientWidth / imageWidth.value) * marginScale
      } else {
        scale.value = (container.clientHeight / imageHeight.value) * marginScale
      }
      
      offset.value = { x: 0, y: 0 }
      drawImage()
    }
    
    const selectedColor = ref(null)
    const colorSpaces = ref(null)
    const secondColor = ref(null);
    const contrastRatio = computed(() => {
      if (selectedColor.value && secondColor.value) {
        return calculateContrastRatio(selectedColor.value, secondColor.value);
      }
      return null;
    });

    const hasImage = computed(() => !!image.value)

    // Drawing functions
    const drawImage = () => {
      if (!image.value || !ctx.value) return
      
      const container = canvas.value.parentElement
      canvas.value.width = container.clientWidth
      canvas.value.height = container.clientHeight
      
      // Center the image (remove subtraction of offset)
      const centerX = (canvas.value.width - imageWidth.value * scale.value) / 2;
      const centerY = (canvas.value.height - imageHeight.value * scale.value) / 2;
      ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
      ctx.value.save()
      ctx.value.translate(centerX + offset.value.x, centerY + offset.value.y)
      ctx.value.scale(scale.value, scale.value)
      ctx.value.drawImage(image.value, 0, 0)
      ctx.value.restore()
    }

    // Event handlers
    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          image.value = img
          imageWidth.value = img.width
          imageHeight.value = img.height
          resetView() // Use resetView instead of drawImage
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }

    const handleMouseDown = (e) => {
      if (activeTool.value === 'hand') {
        isDragging.value = true
        lastPos.value = { x: e.clientX, y: e.clientY }
      } else if (activeTool.value === 'eyedropper') {
        pickColor(e)
      }
    }

    const handleMouseUp = () => {
      isDragging.value = false
    }

    const handleMouseMove = (e) => {
      if (activeTool.value === 'eyedropper') {
        pickColor(e)
      } else if (isDragging.value && activeTool.value === 'hand') {
        const deltaX = e.clientX - lastPos.value.x
        const deltaY = e.clientY - lastPos.value.y
        offset.value = {
          x: offset.value.x + deltaX,
          y: offset.value.y + deltaY
        }
        lastPos.value = { x: e.clientX, y: e.clientY }
        drawImage()
      }
    }

    // Modified pickColor to handle Alt key for second color
    const pickColor = (event) => {
      if (!ctx.value) return
      
      const rect = canvas.value.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const pixel = ctx.value.getImageData(x, y, 1, 1).data
      const color = {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        x: Math.round(x),
        y: Math.round(y)
      };

      if (event.altKey) {
        secondColor.value = color;
      } else {
        selectedColor.value = color;
        colorSpaces.value = getRgbColorSpaces(pixel[0], pixel[1], pixel[2]);
      }
    }

    const handleResize = ({ width, height }) => {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.drawImage(image.value, 0, 0, width, height)
      
      const newImage = new Image()
      newImage.onload = () => {
        image.value = newImage
        imageWidth.value = width
        imageHeight.value = height
        drawImage()
      }
      newImage.src = tempCanvas.toDataURL()
    }

    const saveImage = () => {
      if (!canvas.value) return;
      
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvas.value.toDataURL();
      link.click();
    };

    const getRgbString = (color) => {
      if (!color) return '';
      return `rgb(${color.r}, ${color.g}, ${color.b})`;
    };

    const formatColorSpace = (space) => {
      return Object.entries(space)
        .map(([key, value]) => `${key}: ${value.toFixed(2)}`)
        .join(', ')
    }

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d')
      window.addEventListener('resize', () => {
        if (image.value) resetView()
      })
    })

    return {
      // Template refs and state
      canvas,
      scale,
      activeTool,
      selectedColor,
      colorSpaces,
      showResizeModal,
      imageWidth,
      imageHeight,
      hasImage,  // Now returning as a computed property instead of a function
      secondColor,
      contrastRatio,
      
      // Methods
      handleFileUpload,
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
      handleResize,
      saveImage,
      getRgbString,
      formatColorSpace,
      resetView,
      drawImage
    }
  }
}
</script>

<style scoped>
.image-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.tool-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
}

canvas {
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
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.color-samples {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.color-sample {
  width: 50px;
  height: 50px;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #fff;
  text-shadow: 0 0 2px #000;
}

.contrast-warning {
  color: #f44336;
  font-weight: bold;
}

.contrast-info {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}
</style>
</style>