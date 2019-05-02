const cron = require('node-cron')
cron.schedule('20 42,19,29,39,49,59 */1 * * *', () => {
  console.log(111)
})
