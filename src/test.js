var ass = '1小时27分'
let day = null
let hours = null
let min = null
let sec = null
let arr = self.startTime.split('天')
if (arr.length > 1) { // 大于一天
  day = parseInt(arr[0])
  arr = arr[1].split('小时')
  if (arr.length > 1) {
    hours = parseInt(arr[0])
    min = 59
    sec = 55
  }
} else {
  arr = self.startTime.split('小时')
  if (arr.length > 1) { // 大于一小时
    hours = parseInt(arr[0])
    arr = arr[1].split('分')
    if (arr.length > 1) {
      min = parseInt(arr[0]) - 1
      sec = 55
    }
  } else {
    arr = self.startTime.split('分')
    if (arr.length > 1) { // 大于一分钟
      min = parseInt(arr[0]) - 1
      arr = arr[1].split('秒')
      if (arr.length > 1) {
        sec = parseInt(arr[0]) - 5
      }
    } else {
      arr = self.startTime.split('秒')
      if (arr.length > 1) {
        sec = parseInt(arr[0]) - 5
      }
    }
  }
}

console.log(day, hours, min, sec)
