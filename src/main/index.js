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
// eslint-disable-next-line handle-callback-err
process.on('uncaughtException', (error) => {
  logger.info('call uncaughtException handle')
})
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
let order = null
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
    global.logger.info(JSON.stringify(goodsInfo))
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

// 点击抢购按钮事件
ipc.on('create-order', function (event, arg) {
  logger.info('开始抢购', arg)
  order = arg
  async function main () {
    let buyStatus = await page.evaluate(value => {
      if (document.querySelector('#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-key > div > div > div.tm-countdown > div.tm-countdown-notice > div')) {
        return false
      } else {
        return true
      }
    })
    if (buyStatus) {
      event.sender.send('buy-order-start', '')
    }
  }
  main()
})

// 确认商品型号
ipc.on('buy-order', function (event, arg) {
  arg = order
  async function main () {
    let list = arg.orderType.split(';')
    logger.info('list', list)
    await page.$eval('#J_Amount > span.tb-amount-widget.mui-amount-wrap > input', (input, orderNum) => { input.value = orderNum }, arg.orderNum)
    for (let i in list) {
      logger.info('listi', list[i])
      let status = await page.evaluate(value => {
        if (document.querySelector(`[data-value='${value}']`).classList.value.indexOf('tb-selected') === -1) {
          return true
        } else {
          return false
        }
      }, list[i])
      logger.info('status', status)
      if (status) {
        await page.click(`[data-value='${list[i]}']`)
      }
    }
    event.sender.send('comfirm-order-info', order.buyStatus)
  }
  main()
})

// 提交订单
ipc.on('confirm-order', function (event, arg) {
  logger.info('arg', arg, page.url())
  async function main () {
    if (arg === 'tm') {
      await sleep(500)
      let status = await page.evaluate(value => {
        console.log('data-spm-anchor-id', document.querySelector('#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-key > div > div > div.tb-action.tm-clear').style.display === '')
        if (document.querySelector('#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-key > div > div > div.tb-action.tm-clear').style.display === '') {
          return true
        } else {
          return false
        }
      })
      logger.info('提交订单！', status)
      if (status) {
        await page.click('#J_LinkBuy')
        logger.info('等等确认按钮加载！')
        await page.waitForSelector('#submitOrder_1 > div > a')
        logger.info('确认订单！')
        await page.click('#submitOrder_1 > div > a')
        await page.waitForNavigation({
          waitUntil: 'load'
        })
        event.sender.send('buy-order-success', '')
      }
    } else {
      let status = await page.evaluate(value => {
        if (document.querySelector('#J_LinkBuy')) {
          return true
        } else {
          return false
        }
      })
      if (status) {
        await page.click('#J_juValid > div.tb-btn-buy > a')
        await page.waitForSelector('#submitOrder_1 > div > a')
        await page.click('#submitOrder_1 > div.wrapper > a')
        await page.waitForNavigation({
          waitUntil: 'load'
        })
        event.sender.send('buy-order-success', arg.buyStatus)
      }
    }
  }
  // event.sender.send('goods-total-ok', 5)
  main()
})

// 定时刷新
ipc.on('refresh-info', function (event, arg) {
  logger.info('arg', arg, page.url())
  async function main () {
    logger.info('定时刷新', page.url())
    await page.goto(page.url())
    let buyStatus = await page.evaluate(value => {
      let startTime = null
      let startTimeNode = document.querySelector('#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-key > div > div > div.tm-countdown > div.tm-countdown-notice > div')
      if (startTimeNode) {
        startTime = startTimeNode.innerText
        console.log('startTime===', startTime)
        if (startTime.indexOf('天') === -1 && startTime.indexOf('小时') === -1 && startTime.indexOf('分') === -1 && startTime.indexOf('秒') > -1) {
          return 1
        } else {
          return 0
        }
      } else {
        return 2
      }
    })
    logger.info('buyStatus', buyStatus)
    if (buyStatus) {
      logger.info('开始抢购', new Date())
      order.buyStatus = buyStatus
      event.sender.send('buy-order-start', buyStatus)
    }
  }
  main()
})

// 代付
ipc.on('partially-repay', function (event, arg) {
  logger.info('partially-repay')
  if (!arg) {
    arg = order.payAccount
  }
  async function main () {
    logger.info('开始代付')
    await sleep(1000)
    // const devices = require('puppeteer/DeviceDescriptors')
    // const iPhone6 = devices['iPhone 6']
    // // 模拟移动端设备
    // await page.emulate(iPhone6)
    await page.goto('https://main.m.taobao.com/olist/index.html')
    let status = await page.evaluate(value => {
      if (document.querySelector('#ptr > div.list-card > div:nth-child(2) > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(3) > div')) {
        return true
      } else {
        return false
      }
    })
    logger.info('代付状态', status)
    try {
      await sleep(1000)
      logger.info('点击代付按钮A')
      if (status) {
        await page.tap('#ptr > div.list-card > div:nth-child(2) > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(3) > div')
      } else {
        await page.tap('#ptr > div.list-card > div:nth-child(2) > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(3) > div')
      }
      await sleep(1000)
      await page.waitForSelector('[name=\'peerPayerEmail\']')
      logger.info('代付', arg)
      await sleep(1000)
      await page.type('body > article > form > div > input[type="text"]', arg, { delay: 1000 })
      await sleep(1000)
      await page.tap('body > article > form > input.btn.btn-ok')
    } catch (e) {
      logger.info('点击代付按钮B')
    }
  }
  main()
})
