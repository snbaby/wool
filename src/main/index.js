'use strict'

import { app, BrowserWindow } from 'electron'

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
    width: 400
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

ipc.on('create-page', function (event, arg) {
  async function main () {
    const browser = await puppeteer.launch({headless: true})
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
