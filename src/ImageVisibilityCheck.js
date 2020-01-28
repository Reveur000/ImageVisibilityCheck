import GenerateChecker from './GenerateChecker'

/**
 * 生成 某个图片的可见性检查器.
 * 这是对外提供的整体接口。
 */
function ImageVisibilityCheck({
    containerNode,
    visibleCallback,
    throttle,
    debounce,
    rootMargin
}) {
    this.containerNode = containerNode
    this.visibleCallback = visibleCallback
    this.rootMargin = rootMargin
    this.optimizeType = {}

    /**
     * 将 debounce throttle优化选项的判断条件以及参数整合加在外层接口处。
     */
    if (throttle) {
        this.optimizeType = {
            name: 'throttle',
            value: throttle
        }
    }
    if (debounce) {
        this.optimizeType = {
            name: 'debounce',
            value: debounce
        }
    }
    this.checker = GenerateChecker(this)
    this.started = false
}

/**
 * 开始监听可见性变化
 */
ImageVisibilityCheck.prototype.begin = function() {
    if (!this.started) {
        this.checker.register()
        this.started = true
    } else {
        throw new Error('不要多次对同一个元素挂起监听')
    }
}

/**
 * 主动停止监听可见性变化
 */
ImageVisibilityCheck.prototype.destroy = function() {
    if (this.started) {
        this.started = false
        this.checker.logout()
    }
}

export default ImageVisibilityCheck
