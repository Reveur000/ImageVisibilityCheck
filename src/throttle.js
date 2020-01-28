/**
 * 节流
 * @param fn
 * @param time
 * @returns {function(...[*]=)}
 */
export default function throttle(fn, time) {
    var id
    var prevTime = null
    var curTime = null
    var interTime = null
    return function() {
        window.clearTimeout(id)
        var args = [...arguments]
        var that = this
        curTime = Date.now()
        interTime = curTime - prevTime
        if (interTime >= time || prevTime === null) {
            prevTime = curTime
            return fn.apply(that, args)
        } else {
            id = setTimeout(() => {
                prevTime = Date.now()
                fn.apply(that, args)
            }, time - interTime)
        }
    }
}
