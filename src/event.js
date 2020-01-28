let addEventListener, removeEventListener

if (window.addEventListener) {
    addEventListener = (ele, type, listener, options) => {
        ele.addEventListener(type, listener, options)
    }
    removeEventListener = (ele, type, listener, options) => {
        ele.removeEventListener(type, listener, options)
    }
} else if (window.attachEvent) {
    addEventListener = (ele, type, listener) => {
        ele.attachEvent(`on${type}`, e => {
            listener.call(ele, e || window.event)
        })
    }
    removeEventListener = (ele, type, listener) => {
        ele.detachEvent(`on${type}`, listener)
    }
} else {
    throw new Error('不支持的浏览器')
}

export { addEventListener, removeEventListener }
