<template>
  <div id="app">
    <div class="qrLoginImg" v-if="!isLogin">
      <img :src="qrLoginImg"/>
    </div>
    <div v-if="isLogin">
        <el-tabs v-model="activeName" @tab-click="handleClick">
          <el-tab-pane label="抢购" name="first">
            <el-row>
              <el-col :span="20">
                <el-input placeholder="请输入商品地址" size="mini" v-model="goodsUrl">
                  <el-button slot="append" icon="el-icon-search" @click="searchGoods"></el-button>
                </el-input>
              </el-col>
              <el-col :span="4">
                <img v-if="goodsImgUrl.length>0" :src="goodsImgUrl" width="28px" height="28px"/>
              </el-col>
            </el-row>
            <el-row v-if="goodsImgUrl.length>0">
              <el-col :span="10">
                <el-select v-model="orderType" size="mini" filterable clearable placeholder="请选择商品类型" style="width: 100%" @change="handleOrderType">
                  <el-option
                          v-for="item in goodsJson"
                          :key="item.pvs"
                          :label="item.names"
                          :value="item.pvs">
                  </el-option>
                </el-select>
              </el-col>
              <el-col :span="10" v-if="orderMaxNum>-1">
                <el-input-number v-model="orderNum" size="mini" @change="handleChange" :min="0" :max="orderMaxNum" label="描述文字" style="width: 100%"></el-input-number>
              </el-col>
              <el-col :span="4"  v-if="orderMaxNum>-1">
                <span style="font-size: 12px;color: #606266;line-height: 28px">库存：{{orderMaxNum}}</span>
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
        goodsImgUrl: '',
        goodsJson: [],
        orderType: '',
        orderNum: 0,
        orderMaxNum: -1
      }
    },
    created () {
      const a = 1
      if (a === 2) {
        return
      }
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
        self.goodsJson = arg.goodsJson
        console.log('goodsInfo', arg)
      })

      ipc.on('goods-total-ok', function (event, arg) {
        self.orderMaxNum = arg
        console.log('goods-tota', arg)
      })
    },
    methods: {
      handleClick (tab, event) {
        console.log(tab, event)
      },
      handleChange (value) {
        console.log(value)
      },
      searchGoods () {
        const self = this
        ipc.send('get-goods-info', self.goodsUrl)
      },
      handleOrderType (value) {
        const self = this
        if (value == null) {
          self.orderMaxNum = -1
        } else {
          ipc.send('get-goods-total', value)
        }
      }
    }
  }
</script>

<style>
  /* CSS */
</style>
