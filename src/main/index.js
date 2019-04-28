'use strict'

import { app, BrowserWindow } from 'electron'

let log4js = require('log4js')
log4js.configure({
  appenders: { UI: { type: 'file', filename: 'electron.log' } },
  categories: { default: { appenders: ['UI'], level: 'info' } }
})

let logger = log4js.getLogger('UI')

global.logger = logger
logger.info('日志初始化成功')
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 300,
    useContentSize: true,
    width: 450
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

const puppeteer = require('puppeteer')
const ipc = require('electron').ipcMain
let page = null
let browser = null
ipc.on('create-page', function (event, arg) {
  async function main () {
    browser = await puppeteer.launch({headless: false})
    page = await browser.newPage()
    event.sender.send('page-ok', '')
  }
  main()
})

ipc.on('login', function (event, arg) {
  async function main () {
    await page.goto('https://login.taobao.com/member/login.jhtml?redirectURL=https%3A%2F%2Fwww.taobao.com%2F')
    let qrLoginImg = await page.evaluate(() => {
      let qrLoginImg = document.querySelector('#J_QRCodeImg > img').src
      return qrLoginImg
    })
    event.sender.send('qr-img-ok', qrLoginImg)
    try {
      await page.waitForNavigation({
        waitUntil: 'load'
      })
      event.sender.send('login-ok', '')
    } catch (e) {
      event.sender.send('re-login', '')
    }
  }
  main()
})

ipc.on('get-nick-name', function (event, arg) {
  async function main () {
    let nickName = await page.evaluate(() => {
      let nickName = document.querySelector('#J_SiteNavLogin > div.site-nav-menu-hd > div.site-nav-user > a.site-nav-login-info-nick').innerHTML
      return nickName
    })
    event.sender.send('nick-name-ok', nickName)
  }
  main()
})

ipc.on('get-address', function (event, arg) {
  async function main () {
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (request.url().startsWith('https://h5api.m.taobao.com/h5/mtop.taobao.mbis.getdeliveraddrlist')) {
        logger.info(request.url())
        logger.info('拦截到了这条url然后就该请求了')
        page.on('response', response => {
          if (response.url().startsWith('https://h5api.m.taobao.com/h5/mtop.taobao.mbis.getdeliveraddrlist')) {
            const req = response.request()
            logger.info('Response 的:' + req.method, response.status, req.url)
            let message = response.text()
            message.then(function (result) {
              result = result.replace(' mtopjsonp5(', '').replace('})', '}')
              result = JSON.parse(result)
              event.sender.send('get-address', JSON.parse(result.data.returnValue))
            })
          }
        })
        request.continue()
      } else {
        request.continue()
      }
    })
    await page.goto('https://member1.taobao.com/member/fresh/deliver_address.htm')
  }
  main()
})

ipc.on('get-goods-info', function (event, arg) {
  console.log('arg：', arg)
  async function main () {
    await page.goto(arg)
    let goodsInfo = await page.evaluate(() => {
      let innerText = document.querySelector('#J_DetailMeta > div.tm-clear > script:nth-child(6)').innerText
      innerText = innerText.substring(innerText.indexOf('{"valItemInfo')).replace('})();', '').replace(');', '')
      let data = JSON.parse(innerText)
      let goodsImgUrl = document.querySelector('#J_ImgBooth').src
      return {
        goodsImgUrl: goodsImgUrl,
        goodsJson: data
      }
    })
    let skuList = goodsInfo.goodsJson.valItemInfo.skuList
    let skuMap = goodsInfo.goodsJson.valItemInfo.skuMap
    skuList.forEach(item => {
      Object.values(skuMap).forEach(value => {
        if (item.skuId === value.skuId) {
          item.stock = value.stock
          item.price = value.price
        }
      })
    })
    goodsInfo.goodsJson = skuList.filter(item => {
      return item.stock > 0
    })
    event.sender.send('goods-info-ok', goodsInfo)
  }
  main()
})

ipc.on('get-goods-total', function (event, arg) {
  async function main () {
    let orderMaxNum = await page.evaluate(arg => {
      let arr = arg.split(';')
      for (let i in arr) {
        if (document.querySelector(`[data-value='${arr[i]}']`).style.display === '') {
          page.click(`[data-value='${arr[i]}']`)
        } else {
          return 0
        }
      }
      return document.querySelector(`#J_EmStock`).innerHTML
    }, arg)
    event.sender.send('goods-total-ok', orderMaxNum)
  }
  // event.sender.send('goods-total-ok', 5)
  main()
})
