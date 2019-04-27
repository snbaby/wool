import Vue from 'vue'

import App from './App'

import ElementUI from 'element-ui'

import '../../static/index.css'

Vue.use(ElementUI)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  template: '<App/>'
}).$mount('#app')
