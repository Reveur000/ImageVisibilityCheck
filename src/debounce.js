/**
 * 防抖
 * @param fn
 * @param time
 * @returns {function(...[*]=)}
 */
export default function debounce(fn, time) {
    var id
    return function() {
        window.clearTimeout(id)
        var args = [...arguments]
        var that = this
        id = setTimeout(() => {
            fn.apply(that, args)
        }, time)
    }
}
