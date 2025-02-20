<template>
  <div class="image-editor">
    <div class="toolbar">
      <div class="toolbar-group">
        <input type="file" accept="image/*" @change="handleFileUpload" />

        <button
          :class="{ active: activeTool === 'eyedropper' }"
          @click="activeTool = 'eyedropper'"
          title="Пипетка: Кликните, чтобы выбрать цвет с изображения. Используйте Alt+Клик для выбора второго цвета."
        >
          Пипетка
        </button>
        <button
          :class="{ active: activeTool === 'hand' }"
          @click="activeTool = 'hand'"
          title="Инструмент 'Рука': Кликните и перетащите для перемещения изображения"
        >
          Рука
        </button>
        <button
          v-if="hasImage"
          @click="showResizeModal = true"
          title="Изменить размер: Изменить размеры изображения"
        >
          Изменить размер
        </button>
        <button
          v-if="hasImage"
          @click="showCurvesModal = true"
          title="Градационная коррекция: Настройка кривых для коррекции цветов"
        >
          Кривые
        </button>
        <button
          v-if="hasImage"
          @click="showFilterModal = true"
          title="Фильтрация: Применить фильтр к изображению"
        >
          Фильтр
        </button>
        <button
          v-if="hasImage"
          @click="saveImage"
          title="Сохранить: Скачать текущее изображение"
        >
          Сохранить
        </button>
        <button
          v-if="hasImage"
          @click="resetView"
          title="Сбросить вид для соответствия изображению"
        >
          Сбросить вид
        </button>

        <div class="scale-control">
          <input type="range" v-model="scale" min="0.1" max="3" step="0.1" @change="drawImage" />
          <span>{{ Math.round(scale * 100) }}%</span>
        </div>
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

    <!-- Панель информации о цвете -->
    <div v-if="selectedColor" class="color-info">
      <div class="color-samples">
        <div class="color-sample" :style="{ backgroundColor: getRgbString(selectedColor) }">
          Основной цвет
        </div>
        <div class="color-sample" :style="{ backgroundColor: getRgbString(secondColor) }">
          Вторичный цвет
        </div>
      </div>
      <div class="color-details">
        <p>Цвет 1 - RGB: {{ selectedColor.r }}, {{ selectedColor.g }}, {{ selectedColor.b }}</p>
        <p>Позиция: ({{ selectedColor.x }}, {{ selectedColor.y }})</p>
        <p v-if="colorSpaces">XYZ: {{ formatColorSpace(colorSpaces.xyz) }}</p>
        <p v-if="colorSpaces">Lab: {{ formatColorSpace(colorSpaces.lab) }}</p>
        <p v-if="colorSpaces">LCH: {{ formatColorSpace(colorSpaces.lch) }}</p>
        <p v-if="colorSpaces">OKLch: {{ formatColorSpace(colorSpaces.oklch) }}</p>
      </div>
      <div class="color-details">
        <p>Цвет 2 - RGB: {{ secondColor.r }}, {{ secondColor.g }}, {{ secondColor.b }}</p>
        <div class="contrast-info">
          <p>
            Контраст: {{ contrastRatio ? contrastRatio.toFixed(2) : 'N/A' }}:1
            <span v-if="contrastRatio && contrastRatio >= 4.5">✅</span>
            <span v-else-if="contrastRatio">⚠️ Недостаточный</span>
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

    <CurvesModal
      v-if="hasImage"
      :show="showCurvesModal"
      :image-data="currentImageData"
      @close="showCurvesModal = false"
      @preview="handleCurvesPreview"
      @apply="handleCurvesApply"
      @reset-preview="resetCurvesPreview"
    />

    <FilterModal
      v-if="hasImage"
      :show="showFilterModal"
      :image-data="currentImageData"
      @close="showFilterModal = false"
      @preview="handleCurvesPreview"
      @apply="handleCurvesApply"
      @reset-preview="resetCurvesPreview"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { getRgbColorSpaces } from '../utils/colorSpaces';
import ResizeModal from './ResizeModal.vue';
import CurvesModal from './CurvesModal.vue';
import FilterModal from './FilterModal.vue';

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
  components: { ResizeModal, CurvesModal, FilterModal },
  
  setup() {
    const canvas = ref(null);
    const ctx = ref(null);
    const image = ref(null);
    const imageWidth = ref(0);
    const imageHeight = ref(0);
    
    const scale = ref(1);
    const activeTool = ref('eyedropper');
    const showResizeModal = ref(false);
    const showCurvesModal = ref(false);
    const showFilterModal = ref(false);
    const isDragging = ref(false);
    const offset = ref({ x: 0, y: 0 });
    const lastPos = ref({ x: 0, y: 0 });
    
    // Оптимизация пипетки
    const eyedropperThrottleInterval = ref(null);
    const canvasRect = ref(null);
    let rafId = null;
    let lastPickedPos = { x: -1, y: -1 };
    let lastThrottledPick = 0;
    const THROTTLE_MS = 66; // ~15 fps

    const debouncedDraw = (() => {
      let timeout;
      return () => {
        if (timeout) cancelAnimationFrame(timeout);
        timeout = requestAnimationFrame(() => drawImage());
      };
    })();

    // Инициализируем второй цвет по умолчанию как белый
    const secondColor = ref({ r: 255, g: 255, b: 255, x: 0, y: 0 });
    const selectedColor = ref(null);
    const colorSpaces = ref(null);
    const contrastRatio = computed(() => {
      if (selectedColor.value && secondColor.value) {
        return calculateContrastRatio(selectedColor.value, secondColor.value);
      }
      return null;
    });

    const hasImage = computed(() => !!image.value);
    const currentImageData = ref(null);
    const originalImageData = ref(null);

    const resetView = () => {
      if (!image.value || !canvas.value) return;
      
      const container = canvas.value.parentElement;
      const margin = 50;
      
      offset.value = { x: 0, y: 0 };
      
      const availableWidth = container.clientWidth - margin * 2;
      const availableHeight = container.clientHeight - margin * 2;
      
      scale.value = Math.min(
        availableWidth / imageWidth.value,
        availableHeight / imageHeight.value
      );
      
      drawImage();
    }
    
    const drawImage = () => {
      if (!image.value || !ctx.value || !canvas.value) return;
      
      const container = canvas.value.parentElement;
      
      // Обновляем размеры canvas только если они изменились
      if (canvas.value.width !== container.clientWidth || 
          canvas.value.height !== container.clientHeight) {
        canvas.value.width = container.clientWidth;
        canvas.value.height = container.clientHeight;
      }
      
      const scaledWidth = imageWidth.value * scale.value;
      const scaledHeight = imageHeight.value * scale.value;
      
      const x = Math.round((container.clientWidth - scaledWidth) / 2) + offset.value.x;
      const y = Math.round((container.clientHeight - scaledHeight) / 2) + offset.value.y;
      
      ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
      ctx.value.drawImage(
        image.value,
        x,
        y,
        Math.round(scaledWidth),
        Math.round(scaledHeight)
      );

      // Обновляем кэш только когда необходимо
      if (!currentImageData.value || 
          currentImageData.value.width !== Math.round(scaledWidth) || 
          currentImageData.value.height !== Math.round(scaledHeight)) {
        currentImageData.value = ctx.value.getImageData(
          x,
          y,
          Math.round(scaledWidth),
          Math.round(scaledHeight)
        );
        if (!originalImageData.value) {
          originalImageData.value = new ImageData(
            new Uint8ClampedArray(currentImageData.value.data),
            currentImageData.value.width,
            currentImageData.value.height
          );
        }
      }
    }

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          image.value = img;
          imageWidth.value = img.width;
          imageHeight.value = img.height;
          resetView();
        }
        img.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }

    const handleMouseDown = (e) => {
      if (activeTool.value === 'hand') {
        isDragging.value = true;
        lastPos.value = { x: e.clientX, y: e.clientY };
      } else if (activeTool.value === 'eyedropper') {
        pickColor(e);
      }
    }

    const handleMouseUp = () => {
      isDragging.value = false;
    }

    const handleMouseMove = (e) => {
      if (!canvas.value) return;

      if (isDragging.value && activeTool.value === 'hand') {
        e.preventDefault();
        
        const deltaX = e.clientX - lastPos.value.x;
        const deltaY = e.clientY - lastPos.value.y;
        
        offset.value = {
          x: offset.value.x + deltaX,
          y: offset.value.y + deltaY
        };
        
        lastPos.value = { x: e.clientX, y: e.clientY };
        
        debouncedDraw();
      } else if (activeTool.value === 'eyedropper') {
        // Throttle the color picking to ~15fps
        const now = Date.now();
        if (now - lastThrottledPick >= THROTTLE_MS) {
          lastThrottledPick = now;
          pickColor(e);
        }
      }
    }

    const pickColor = (event) => {
      if (!ctx.value || activeTool.value !== 'eyedropper') return;
      
      // Обновляем canvasRect при каждом пике для точности
      canvasRect.value = canvas.value.getBoundingClientRect();
      
      const x = Math.round(event.clientX - canvasRect.value.left);
      const y = Math.round(event.clientY - canvasRect.value.top);
      
      // Проверяем, находится ли курсор в пределах изображения
      const container = canvas.value.parentElement;
      const scaledWidth = imageWidth.value * scale.value;
      const scaledHeight = imageHeight.value * scale.value;
      const imgX = Math.round((container.clientWidth - scaledWidth) / 2) + offset.value.x;
      const imgY = Math.round((container.clientHeight - scaledHeight) / 2) + offset.value.y;
      
      if (x >= imgX && x < imgX + scaledWidth && y >= imgY && y < imgY + scaledHeight) {
        const pixel = ctx.value.getImageData(x, y, 1, 1).data;
        const color = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          x: x,
          y: y
        };

        if (event.altKey) {
          secondColor.value = color;
        } else {
          selectedColor.value = color;
          colorSpaces.value = getRgbColorSpaces(pixel[0], pixel[1], pixel[2]);
        }
      }
    }

    const handleResize = ({ width, height }) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(image.value, 0, 0, width, height);
      
      const newImage = new Image();
      newImage.onload = () => {
        image.value = newImage;
        imageWidth.value = width;
        imageHeight.value = height;
        drawImage();
      }
      newImage.src = tempCanvas.toDataURL();
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
        .join(', ');
    }

    const handleCurvesPreview = (previewImageData) => {
      if (!ctx.value || !canvas.value) return;
      
      const container = canvas.value.parentElement;
      const scaledWidth = imageWidth.value * scale.value;
      const scaledHeight = imageHeight.value * scale.value;
      const x = Math.round((container.clientWidth - scaledWidth) / 2) + offset.value.x;
      const y = Math.round((container.clientHeight - scaledHeight) / 2) + offset.value.y;
      
      ctx.value.putImageData(previewImageData, x, y);
    }

    const handleCurvesApply = () => {
      if (!ctx.value || !canvas.value) return;
      
      // Обновление изображения с примененными кривыми
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageWidth.value;
      tempCanvas.height = imageHeight.value;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas.value, 0, 0);
      
      const newImage = new Image();
      newImage.onload = () => {
        image.value = newImage;
        originalImageData.value = null; // Сброс кэша для нового изображения
        drawImage();
      };
      newImage.src = tempCanvas.toDataURL();
    }

    const resetCurvesPreview = () => {
      if (originalImageData.value) {
        const container = canvas.value.parentElement;
        const scaledWidth = imageWidth.value * scale.value;
        const scaledHeight = imageHeight.value * scale.value;
        const x = Math.round((container.clientWidth - scaledWidth) / 2) + offset.value.x;
        const y = Math.round((container.clientHeight - scaledHeight) / 2) + offset.value.y;
        
        ctx.value.putImageData(originalImageData.value, x, y);
      }
    }

    onMounted(() => {
      ctx.value = canvas.value.getContext('2d', { willReadFrequently: true });
      canvasRect.value = canvas.value.getBoundingClientRect();
      
      const resizeObserver = new ResizeObserver(() => {
        canvasRect.value = canvas.value.getBoundingClientRect();
        if (image.value) debouncedDraw();
      });
      
      resizeObserver.observe(canvas.value.parentElement);
      
      // Обновляем canvasRect при скролле
      window.addEventListener('scroll', () => {
        canvasRect.value = canvas.value.getBoundingClientRect();
      }, { passive: true });
    })

    onUnmounted(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    })

    return {
      canvas,
      scale,
      activeTool,
      selectedColor,
      colorSpaces,
      showResizeModal,
      showCurvesModal,
      showFilterModal,
      imageWidth,
      imageHeight,
      hasImage,
      secondColor,
      contrastRatio,
      currentImageData,
      
      handleFileUpload,
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
      handleResize,
      saveImage,
      getRgbString,
      formatColorSpace,
      resetView,
      drawImage,
      handleCurvesPreview,
      handleCurvesApply,
      resetCurvesPreview
    }
  }
}
</script>

<style scoped>
.image-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
}

.toolbar {
  flex: 0 0 auto;
  padding: 4px 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar input[type="file"] {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  height: 32px;
}

.toolbar button {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  height: 32px;
  white-space: nowrap;
}

.toolbar button:hover {
  background: #f5f5f5;
}

.toolbar button.active {
  background: #e6e6e6;
}

.scale-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.scale-control input[type="range"] {
  width: 100px;
}

.scale-control span {
  min-width: 48px;
  font-size: 14px;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: #f0f0f0;
}

canvas {
  display: block;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
