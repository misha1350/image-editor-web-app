<template>
  <div v-if="show" class="filter-modal">
    <div class="filter-content">
      <h3>Фильтрация изображения</h3>

      <div class="presets">
        <label>Пресеты:</label>
        <select v-model="selectedPreset" @change="applyPreset">
          <option value="identity">Без изменений</option>
          <option value="sharpen">Повышение резкости</option>
          <option value="gaussian">Размытие по Гауссу</option>
          <option value="boxBlur">Размытие среднее</option>
        </select>
      </div>

      <div class="kernel-grid">
        <div v-for="i in 9" :key="i - 1" class="kernel-input">
          <input
            type="number"
            v-model.number="kernel[i - 1]"
            step="0.1"
            @input="onKernelChange"
          />
        </div>
      </div>

      <div class="controls">
        <label class="preview-checkbox">
          <input type="checkbox" v-model="showPreview" />
          Предпросмотр
        </label>

        <div class="button-group">
          <button @click="applyFilter">Применить</button>
          <button @click="resetKernel">Сбросить</button>
          <button @click="$emit('close')">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const PRESETS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  gaussian: [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16],
  boxBlur: [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9]
}

export default {
  props: {
    show: Boolean,
    imageData: {
      type: ImageData,
      required: true
    }
  },

  data() {
    return {
      kernel: [...PRESETS.identity],
      selectedPreset: 'identity',
      showPreview: false
    }
  },

  watch: {
    showPreview(newVal) {
      if (newVal) {
        this.previewChanges()
      } else {
        this.$emit('reset-preview')
      }
    }
  },

  methods: {
    applyPreset() {
      this.kernel = [...PRESETS[this.selectedPreset]]
      if (this.showPreview) {
        this.previewChanges()
      }
    },

    resetKernel() {
      this.selectedPreset = 'identity'
      this.kernel = [...PRESETS.identity]
      if (this.showPreview) {
        this.$emit('reset-preview')
      }
    },

    onKernelChange() {
      if (this.showPreview) {
        this.previewChanges()
      }
    },

    applyFilter() {
      if (this.showPreview) {
        this.$emit('apply')
      } else {
        this.previewChanges()
        this.$emit('apply')
      }
      this.$emit('close')
    },

    previewChanges() {
      const paddedData = this.padImageData(this.imageData)
      const newImageData = this.applyConvolution(paddedData)
      this.$emit('preview', newImageData)
    },

    padImageData(imageData) {
      const width = imageData.width
      const height = imageData.height
      const paddedWidth = width + 2
      const paddedHeight = height + 2
      const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4)

      // Fill the center with the original image data
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sourcePos = (y * width + x) * 4
          const targetPos = ((y + 1) * paddedWidth + (x + 1)) * 4
          for (let i = 0; i < 4; i++) {
            paddedData[targetPos + i] = imageData.data[sourcePos + i]
          }
        }
      }

      // Pad edges by copying nearest pixels
      // Top and bottom rows
      for (let x = 0; x < paddedWidth; x++) {
        const topSourceY = x < 1 || x >= paddedWidth - 1 ? 1 : x
        const bottomSourceY = (height - 1) * paddedWidth + x
        for (let i = 0; i < 4; i++) {
          paddedData[x * 4 + i] = paddedData[topSourceY * 4 + i]
          paddedData[((paddedHeight - 1) * paddedWidth + x) * 4 + i] = 
            paddedData[bottomSourceY * 4 + i]
        }
      }

      // Left and right columns
      for (let y = 0; y < paddedHeight; y++) {
        const leftSourceX = (y * paddedWidth + 1) * 4
        const rightSourceX = (y * paddedWidth + (width - 1)) * 4
        for (let i = 0; i < 4; i++) {
          paddedData[y * paddedWidth * 4 + i] = paddedData[leftSourceX + i]
          paddedData[(y * paddedWidth + paddedWidth - 1) * 4 + i] = 
            paddedData[rightSourceX + i]
        }
      }

      return new ImageData(paddedData, paddedWidth, paddedHeight)
    },

    applyConvolution(paddedImageData) {
      const width = this.imageData.width
      const height = this.imageData.height
      const newImageData = new ImageData(width, height)

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pos = (y * width + x) * 4
          let r = 0, g = 0, b = 0

          // Apply kernel
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const kernelPos = ky * 3 + kx
              const imgPos = ((y + ky) * (width + 2) + (x + kx)) * 4
              const weight = this.kernel[kernelPos]
              
              r += paddedImageData.data[imgPos] * weight
              g += paddedImageData.data[imgPos + 1] * weight
              b += paddedImageData.data[imgPos + 2] * weight
            }
          }

          newImageData.data[pos] = r
          newImageData.data[pos + 1] = g
          newImageData.data[pos + 2] = b
          newImageData.data[pos + 3] = this.imageData.data[pos + 3] // Keep original alpha
        }
      }

      return newImageData
    }
  }
}
</script>

<style scoped>
.filter-modal {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.filter-content {
  padding: 1rem;
  max-width: 400px;
}

.presets {
  margin: 1rem 0;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.presets select {
  flex: 1;
  padding: 0.5rem;
}

.kernel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
}

.kernel-input input {
  width: 100%;
  padding: 0.5rem;
  text-align: center;
}

.controls {
  margin-top: 1rem;
}

.preview-checkbox {
  display: block;
  margin: 1rem 0;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button:first-child {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
}

button:hover {
  opacity: 0.9;
}
</style>