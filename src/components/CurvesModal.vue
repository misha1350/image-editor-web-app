<template>
  <div v-if="show" class="curves-modal">
    <div class="curves-content">
      <h3>Градационная коррекция</h3>
      
      <div class="graph-container">
        <svg ref="graphSvg" width="256" height="256" class="graph">
          <!-- Background grid -->
          <g class="grid">
            <line x1="0" y1="0" x2="256" y2="0" />
            <line x1="0" y1="256" x2="256" y2="256" />
            <line x1="0" y1="0" x2="0" y2="256" />
            <line x1="256" y1="0" x2="256" y2="256" />
          </g>
          
          <!-- Histograms -->
          <polyline
            v-for="(histogram, color) in histograms"
            :key="color"
            :points="getHistogramPoints(histogram)"
            :class="color"
          />
          
          <!-- Curve lines -->
          <line
            x1="0"
            :y1="256 - points[0].output"
            :x2="points[0].input"
            :y2="256 - points[0].output"
            class="curve-line"
          />
          <line
            :x1="points[0].input"
            :y1="256 - points[0].output"
            :x2="points[1].input"
            :y2="256 - points[1].output"
            class="curve-line"
          />
          <line
            :x1="points[1].input"
            :y1="256 - points[1].output"
            :x2="256"
            :y2="256 - points[1].output"
            class="curve-line"
          />
          
          <!-- Points -->
          <circle
            v-for="(point, index) in points"
            :key="index"
            :cx="point.input"
            :cy="256 - point.output"
            r="4"
            class="control-point"
          />
        </svg>
      </div>

      <div class="points-control">
        <div class="point-inputs">
          <div>
            <label>Точка 1:</label>
            <input
              type="number"
              v-model.number="points[0].input"
              min="0"
              max="254"
              @input="validatePoints"
            />
            <input
              type="number"
              v-model.number="points[0].output"
              min="0"
              max="255"
            />
          </div>
          <div>
            <label>Точка 2:</label>
            <input
              type="number"
              v-model.number="points[1].input"
              min="1"
              max="255"
              @input="validatePoints"
            />
            <input
              type="number"
              v-model.number="points[1].output"
              min="0"
              max="255"
            />
          </div>
        </div>

        <label class="preview-checkbox">
          <input type="checkbox" v-model="showPreview" />
          Предпросмотр
        </label>
      </div>

      <div class="button-group">
        <button @click="applyChanges">Применить</button>
        <button @click="resetPoints">Сбросить</button>
        <button @click="$emit('close')">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script>
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
      points: [
        { input: 0, output: 0 },
        { input: 255, output: 255 }
      ],
      histograms: {
        red: new Array(256).fill(0),
        green: new Array(256).fill(0),
        blue: new Array(256).fill(0)
      },
      showPreview: false
    }
  },
  
  watch: {
    imageData: {
      immediate: true,
      handler() {
        this.calculateHistograms()
      }
    },
    showPreview(newVal) {
      if (newVal) {
        this.previewChanges()
      } else {
        this.$emit('reset-preview')
      }
    }
  },
  
  methods: {
    calculateHistograms() {
      // Сброс гистограмм
      for (let i = 0; i < 256; i++) {
        this.histograms.red[i] = 0
        this.histograms.green[i] = 0
        this.histograms.blue[i] = 0
      }
      
      const data = this.imageData.data
      for (let i = 0; i < data.length; i += 4) {
        this.histograms.red[data[i]]++
        this.histograms.green[data[i + 1]]++
        this.histograms.blue[data[i + 2]]++
      }
      
      // Нормализация
      const maxCount = Math.max(
        ...Object.values(this.histograms).flat()
      )
      
      for (const color in this.histograms) {
        this.histograms[color] = this.histograms[color].map(
          count => (count / maxCount) * 256
        )
      }
    },
    
    getHistogramPoints(histogram) {
      return histogram
        .map((value, index) => `${index},${256 - value}`)
        .join(' ')
    },
    
    validatePoints() {
      if (this.points[0].input >= this.points[1].input) {
        this.points[1].input = this.points[0].input + 1
      }
    },
    
    createLUT() {
      const lut = new Array(256)
      const p1 = this.points[0]
      const p2 = this.points[1]
      
      // Левый сегмент
      for (let i = 0; i <= p1.input; i++) {
        lut[i] = p1.output
      }
      
      // Средний сегмент
      const slope = (p2.output - p1.output) / (p2.input - p1.input)
      for (let i = p1.input + 1; i < p2.input; i++) {
        lut[i] = Math.round(p1.output + slope * (i - p1.input))
      }
      
      // Правый сегмент
      for (let i = p2.input; i < 256; i++) {
        lut[i] = p2.output
      }
      
      return lut
    },
    
    previewChanges() {
      const lut = this.createLUT()
      const newImageData = new ImageData(
        new Uint8ClampedArray(this.imageData.data),
        this.imageData.width,
        this.imageData.height
      )
      
      for (let i = 0; i < newImageData.data.length; i += 4) {
        newImageData.data[i] = lut[newImageData.data[i]]
        newImageData.data[i + 1] = lut[newImageData.data[i + 1]]
        newImageData.data[i + 2] = lut[newImageData.data[i + 2]]
      }
      
      this.$emit('preview', newImageData)
    },
    
    applyChanges() {
      if (this.showPreview) {
        this.$emit('apply')
      } else {
        this.previewChanges()
        this.$emit('apply')
      }
      this.$emit('close')
    },
    
    resetPoints() {
      this.points = [
        { input: 0, output: 0 },
        { input: 255, output: 255 }
      ]
      if (this.showPreview) {
        this.$emit('reset-preview')
      }
    }
  }
}
</script>

<style scoped>
.curves-modal {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.curves-content {
  padding: 1rem;
  max-width: 400px;
}

.graph-container {
  background: #f5f5f5;
  border: 1px solid #ddd;
  margin: 1rem 0;
}

.graph {
  display: block;
}

.grid line {
  stroke: #ddd;
  stroke-width: 1;
}

polyline {
  fill: none;
  stroke-width: 1;
}

polyline.red {
  stroke: rgba(255, 0, 0, 0.5);
}

polyline.green {
  stroke: rgba(0, 255, 0, 0.5);
}

polyline.blue {
  stroke: rgba(0, 0, 255, 0.5);
}

.curve-line {
  stroke: #000;
  stroke-width: 2;
}

.control-point {
  fill: #000;
  cursor: pointer;
}

.points-control {
  margin: 1rem 0;
}

.point-inputs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.point-inputs input {
  width: 60px;
  margin: 0 0.5rem;
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