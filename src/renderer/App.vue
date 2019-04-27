<template>
  <div id="app">
    <div class="qrLoginImg" v-if="!isLogin">
      <img :src="qrLoginImg"/>
    </div>
    <div v-if="isLogin">
        <el-tabs v-model="activeName" @tab-click="handleClick">
          <el-tab-pane label="抢购" name="first">
            <el-row>
              <el-col :span="22">
                <el-input placeholder="请输入商品地址" size="mini" v-model="goodsUrl">
                  <template slot="prepend">URL</template>
                  <el-button slot="append" icon="el-icon-search" @click="searchGoods"></el-button>
                </el-input>
              </el-col>
              <el-col :span="2">
                <img v-if="goodsImgUrl.length>0" :src="goodsImgUrl" width="28px" height="28px"/>
              </el-col>
            </el-row>
          </el-tab-pane>
          <el-tab-pane label="地址" name="second"></el-tab-pane>
        </el-tabs>
    </div>
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
        isLogin: false,
        activeName: 'first',
        goodsUrl: '',
        goodsImgUrl: ''
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

      ipc.on('goods-info-ok', function (event, arg) {
        self.goodsImgUrl = arg.goodsImgUrl
        console.log('goodsInfo', arg)
      })
    },
    methods: {
      handleClick (tab, event) {
        console.log(tab, event)
      },
      searchGoods () {
        const self = this
        ipc.send('get-goods-info', self.goodsUrl)
      }
    }
  }
</script>

<style>
  /* CSS */
</style>
