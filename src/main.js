import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import store from './store';
import CanvasJSStockChart from '@canvasjs/vue-stockcharts';
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
app.use(store);
app.use(ElementPlus)
app.use(CanvasJSStockChart);
app.mount('#app')
