<template>
  <div id="app">
    <div class="qrLoginImg" v-if="!isLogin">
      <img :src="qrLoginImg"/>
    </div>
    <div ></div>
  </div>
</template>

<script>
  // 通过全局变量获取page对象
  const ipc = require('electron').ipcRenderer
  export default {
    name: 'wool',
    data () {
      return {
        qrLoginImg: '',
        page: null,
        isLogin: false
      }
    },
    created () {
      const self = this
      // 创建浏览器
      ipc.send('create-page', '')
      // 浏览器创建成功
      ipc.on('page-ok', function (event, arg) {
        // 登陆
        ipc.send('login', '')
      })
      // 获得二维码
      ipc.on('qr-img-ok', function (event, arg) {
        // 二维码地址
        self.qrLoginImg = arg
      })
      // 二维码失效
      ipc.on('re-login', function (event, arg) {
        // 重新登陆
        ipc.send('login', '')
      })

      // 二维码失效
      ipc.on('login-ok', function (event, arg) {
        // 重新登陆
        ipc.send('get-nick-name', '')
      })

      ipc.on('nick-name-ok', function (event, arg) {
        // 重新登陆
        document.title = arg
        self.isLogin = true
      })
    },
    methods: {
    }
  }
</script>

<style>
  /* CSS */
</style>
