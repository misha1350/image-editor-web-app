<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal">
      <h3>Изменить размер изображения</h3>
      
      <div class="form-group">
        <label>
          Ширина:
          <input 
            type="number" 
            v-model="width" 
            @input="handleWidthChange"
            min="1"
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          Высота:
          <input 
            type="number" 
            v-model="height"
            @input="handleHeightChange"
            min="1"
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          <input 
            type="checkbox" 
            v-model="maintainAspectRatio"
          />
          Сохранять пропорции
        </label>
      </div>

      <div class="button-group">
        <button @click="handleResize">Изменить размер</button>
        <button @click="$emit('close')">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    show: Boolean,
    originalWidth: Number,
    originalHeight: Number
  },
  data() {
    return {
      width: this.originalWidth,
      height: this.originalHeight,
      maintainAspectRatio: true
    }
  },
  methods: {
    handleWidthChange() {
      if (this.maintainAspectRatio && this.width) {
        this.height = Math.round(this.width * (this.originalHeight / this.originalWidth));
      }
    },
    handleHeightChange() {
      if (this.maintainAspectRatio && this.height) {
        this.width = Math.round(this.height * (this.originalWidth / this.originalHeight));
      }
    },
    handleResize() {
      this.$emit('resize', {
        width: Number(this.width),
        height: Number(this.height)
      });
      this.$emit('close');
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.width = this.originalWidth;
        this.height = this.originalHeight;
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 300px;
}

.form-group {
  margin: 1rem 0;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.form-group input[type="number"] {
  width: 100px;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.button-group button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color, #ccc);
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.button-group button:first-child {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
}

.button-group button:hover {
  opacity: 0.9;
}
</style>