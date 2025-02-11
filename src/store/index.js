import { createStore } from 'vuex'

export default createStore({
  state: {
    image: null,
    scale: 1,
    offset: { x: 0, y: 0 },
    activeTool: 'eyedropper',
    selectedColor: null
  },
  mutations: {
    setImage(state, image) {
      state.image = image
    },
    setScale(state, scale) {
      state.scale = scale
    },
    setOffset(state, offset) {
      state.offset = offset
    },
    setActiveTool(state, tool) {
      state.activeTool = tool
    },
    setSelectedColor(state, color) {
      state.selectedColor = color
    }
  },
  actions: {
    async loadImage({ commit }, file) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            commit('setImage', img)
            resolve(img)
          }
          img.src = e.target.result
        }
        reader.readAsDataURL(file)
      })
    }
  }
})