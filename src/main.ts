import { createApp } from 'vue'

import { createPinia } from 'pinia'

import './style/reset.css'
import App from './App.vue'
import router from './router.ts'

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.mount('#app')

if (import.meta.env.DEV) {
  console.log('envs:', {
    mode: import.meta.env.MODE,
    baseUrl: import.meta.env.BASE_URL,
    api: import.meta.env.VITE_API_ENDPOINT,
    dev: import.meta.env.DEV,
  })
}
