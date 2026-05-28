import App from './App'
import FFactorIntroFab from './components/f-factor-intro-fab/f-factor-intro-fab.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.component('f-factor-intro-fab', FFactorIntroFab)
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  app.component('f-factor-intro-fab', FFactorIntroFab)
  return {
    app
  }
}
// #endif