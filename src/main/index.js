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
const sleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
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
            let message = response.text()
            message.then(function (result) {
              result = result.substring(result.indexOf('({') + 1).replace('})', '}')
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

ipc.on('set-def-address', function (event, arg) {
  async function main () {
    await page.click('#container > div > div.addressList > div.next-table > table > tbody > tr:nth-child(' + arg + ') > td.next-table-cell.last > div > div > span')
  }
  main()
})

ipc.on('set-address-info', function (event, arg) {
  logger.info('arg', arg)
  async function main () {
    const handLi = async function (value) {
      let num = await page.evaluate(value => {
        let ulArr = document.querySelectorAll('#cndzkEntrance > div:nth-child(2) > div > div > div.cndzk-entrance-division-box > ul.cndzk-entrance-division-box-content > div > li')
        let list = Array.prototype.slice.call(ulArr)
        let num = null
        list.forEach((item, index) => {
          if (item.innerText === value) {
            num = index + 1
          }
        })
        return num
      }, value)
      if (num) {
        await page.click('#cndzkEntrance > div:nth-child(2) > div > div > div.cndzk-entrance-division-box > ul.cndzk-entrance-division-box-content > div > li:nth-child(' + num + ')')
      }
    }
    await page.click('#cndzkEntrance > div:nth-child(2) > div > div > div > div')
    await sleep(200)
    await page.click('#cndzkEntrance > div:nth-child(2) > div > div > div.cndzk-entrance-division-box > ul.cndzk-entrance-division-box-title > li:nth-child(1)')
    await sleep(200)
    await handLi(arg[0])
    await sleep(200)
    await handLi(arg[1])
    await sleep(200)
    await handLi(arg[2])
    await sleep(200)
    await page.click('#cndzkEntrance > div:nth-child(2) > div > div > div > div')
  }
  main()
})

ipc.on('set-address-other', function (event, arg) {
  logger.info('arg', arg)
  async function main () {
    await page.type('#cndzkEntrance > div:nth-child(4) > div > div > textarea', arg.address, { delay: 10 })
    await page.type('#myForm > div:nth-child(1) > div.next-col.next-col-19.next-form-item-control > span > input', arg.mail, { delay: 10 })
    await page.type('#myForm > div:nth-child(2) > div.next-col.next-col-19.next-form-item-control > span > input', arg.name, { delay: 10 })
    await page.type('#myForm > div.next-row.next-form-item.next-left.next-medium.form-item-mobile > div.next-col.next-col-19.next-form-item-control > div > div.next-col.next-col-14 > div > div > span > input', arg.phone, { delay: 100 })
    await sleep(200)
    await page.click('#defaultAddress')
    await sleep(200)
    await page.click('#myForm > div:nth-child(5) > div.next-col.next-col-19.next-form-item-control > button')
    await sleep(500)
    await page.click('body > div.next-overlay-wrapper.opened > div.next-dialog.next-closeable.next-overlay-inner > div.next-dialog-footer.next-align-right > button.next-btn.next-medium.next-btn-primary.next-dialog-btn')
  }
  main()
})
