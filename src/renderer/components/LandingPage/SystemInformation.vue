<template>
    <div>
        <div class="title">Information</div>
        <img :src="qrLoginImg" />
        <div class="items">
            <div class="item">
                <div class="name">Vue.js:</div>
                <div class="value">{{ vue }}</div>
            </div>
            <div class="item">
                <div class="name">Electron:</div>
                <div class="value">{{ electron }}</div>
            </div>
            <div class="item">
                <div class="name">Node:</div>
                <div class="value">{{ node }}</div>
            </div>
            <div class="item">
                <div class="name">Platform:</div>
                <div class="value">{{ platform }}</div>
            </div>
        </div>
    </div>
</template>

<script>
  const puppeteer = require('puppeteer')
  export default {
    data () {
      return {
        electron: process.versions.electron,
        node: process.versions.node,
        platform: require('os').platform(),
        vue: require('vue/package.json').version,
        qrLoginImg: ''
      }
    },
    created () {
      const self = this;
      (async () => {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setRequestInterception(true)
        page.on('request', interceptedRequest => {
          if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg') || interceptedRequest.url().endsWith('.gif') || interceptedRequest.url().endsWith('.webp') || interceptedRequest.url().startsWith('data:image/png')) {
            interceptedRequest.abort()
          } else {
            interceptedRequest.continue()
          }
        })
        await page.goto('https://login.taobao.com/member/login.jhtml?redirectURL=https%3A%2F%2Fwww.taobao.com%2F')
        self.qrLoginImg = await page.evaluate(() => {
          let qrLoginImg = document.querySelector('#J_QRCodeImg > img').src
          return qrLoginImg
        })
        console.log('time---0', new Date().getTime())
        await page.waitForNavigation({
          waitUntil: 'load'
        })
        console.log('time---1', new Date().getTime())
        await page.goto('https://detail.tmall.com/item.htm?id=583443319889')
        console.log('time---2', new Date().getTime())
        console.log('time---3', new Date().getTime())
        await page.click('#J_LinkBuy')
        console.log('time---4', new Date().getTime())
        await page.waitForSelector('#submitOrder_1 > div > a')
        console.log('time---5', new Date().getTime())
        // await page.click('#submitOrder_1 > div > a')
        console.log('time---6', new Date().getTime())

        // await page.waitForNavigation()
        console.log('time---7', new Date().getTime())
        console.log(page.url())
      })()
    }

  }
</script>

<style scoped>
    .title {
        color: #888;
        font-size: 18px;
        font-weight: initial;
        letter-spacing: .25px;
        margin-top: 10px;
    }

    .items {
        margin-top: 8px;
    }

    .item {
        display: flex;
        margin-bottom: 6px;
    }

    .item .name {
        color: #6a6a6a;
        margin-right: 6px;
    }

    .item .value {
        color: #35495e;
        font-weight: bold;
    }
</style>
