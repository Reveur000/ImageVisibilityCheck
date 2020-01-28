/**
 * 这里是根据不同的浏览器版本提供不同的可见性检查器。
 * 检查器目前有三种实现方法:
 * 1.IntersectionObserver API
 * 2.getBoundClientRect()
 * 3.手动计算模拟getBoundClientRect
 * 实现优先级以及性能依次降低。
 * 但是所有的检查器必定应该对外提供两种方法:
 * 1.register  注册检查器
 * 2.logout    销毁检查器
 *
 * 在注册了检查器之后，该元素的可见性交由本组件内部维护。 外部无需做任何处理。
 * 在触发可见时,会自动调用可见成功回调，同时注销自身。
 */
import debounce from './debounce'
import throttle from './throttle'

import scrollParent from './scrollParent'
import reactIntersection from './reactIntersection'
import { addEventListener, removeEventListener } from './event'

let GenerateChecker

const IE = !!window.ActiveXObject || 'ActiveXObject' in window

let supportPassiveEvent = false

/**
 * passive event 侦测
 */
try {
    let opt = {}
    Object.defineProperty(opt, 'passive', {
        get: function() {
            supportPassiveEvent = true
        }
    })
    addEventListener(window, 'test', null, opt)
} catch (e) {}

let eventOptions =
    supportPassiveEvent === true ? { passive: true, capture: false } : false

/**
 * Intersection Observer API  实现
 */
//todo 在为Interseciton Observer 添加 debounce throttle支持后，发现有时快速滚动，图片加载是存在问题的。
//todo 该问题的原因在于获取交集信息的时机并不是优化后的回调真正执行的时机。因此IntersectionObserver 是否 添加debounce throttle优化是有待商榷的
if ('IntersectionObserver' in window) {
    /**
     * 根据不同的rootMargin划分不同的observer。
     * ObserverWrappers是这些不同的observer的数组集合。
     * @type {*[]}
     */
    let ObserverWrappers = []
    /**
     * 根据rootMargin以及优化方式获取observer。
     * 如果没有则创建。
     * @param rootMargin
     * @param visibleCallback
     * @param containerNode
     * @param optimizeType
     * @returns {*}
     */
    function getObserver({
        rootMargin,
        visibleCallback,
        containerNode,
        optimizeType
    }) {
        let ObserverWrapper = ObserverWrappers.find(ObserverWrapper => {
            return (
                ObserverWrapper &&
                ObserverWrapper.rootMargin === rootMargin &&
                ObserverWrapper.optimizeType.name === optimizeType.name &&
                ObserverWrapper.optimizeType.value === optimizeType.value
            )
        })

        if (!ObserverWrapper) {
            ObserverWrapper = {}

            let options = {
                root: undefined,
                rootMargin: rootMargin,
                thresholds: [0, 1]
            }
            ObserverWrapper.rootMargin = rootMargin
            ObserverWrapper.optimizeType = {}
            ObserverWrapper.optimizeType.name = optimizeType.name
            ObserverWrapper.optimizeType.value = optimizeType.value

            /**
             * 一个观察者对象下的所有元素及其可见回调的实体对象的数组集合。
             * @type {{target: *, cb: *}[]}
             */
            ObserverWrapper.entitiesCbMap = [
                {
                    target: containerNode,
                    cb: visibleCallback
                }
            ]

            //观察目标的计数。
            ObserverWrapper.targetExist = 1

            let cb = (entities, observer) => {
                let enter = false
                entities.forEach(entity => {
                    /**
                     * 元素可见时的回调处理
                     */
                    if (entity.intersectionRatio > 0) {
                        enter = true
                        let index = ObserverWrapper.entitiesCbMap.findIndex(
                            e => {
                                return e && e.target === entity.target
                            }
                        )
                        if (index !== -1) {
                            let cb = ObserverWrapper.entitiesCbMap[index].cb
                            cb && cb()
                            observer.unobserve(
                                ObserverWrapper.entitiesCbMap[index].target
                            )
                            ObserverWrapper.entitiesCbMap[index] = null
                            ObserverWrapper.targetExist--
                        }
                    }
                })

                /**
                 * 如果观察的目标元素全都可见了，那么就移除观察者
                 */
                if (enter === true) {
                    if (ObserverWrapper.targetExist === 0) {
                        ObserverWrapper.observer.disconnect()
                    }
                }
            }

            if (ObserverWrapper.optimizeType.name === 'debounce') {
                cb = debounce(cb, ObserverWrapper.optimizeType.value)
            } else if (ObserverWrapper.optimizeType.name === 'throttle') {
                cb = throttle(cb, ObserverWrapper.optimizeType.value)
            } else {
                //没有优化
            }

            ObserverWrapper.observer = new IntersectionObserver(cb, options)

            ObserverWrappers.push(ObserverWrapper)
        } else {
            ObserverWrapper.entitiesCbMap.push({
                target: containerNode,
                cb: visibleCallback
            })
            ObserverWrapper.targetExist++
        }

        return ObserverWrapper
    }

    GenerateChecker = function({
        containerNode,
        visibleCallback,
        optimizeType,
        rootMargin
    }) {
        let observerWrapper = getObserver({
            rootMargin,
            visibleCallback,
            containerNode,
            optimizeType
        })
        return {
            register: () => {
                observerWrapper.observer.observe(containerNode)
            },
            logout: () => {
                observerWrapper.observer.unobserve(containerNode)
            }
        }
    }
} else if (Element.prototype.getBoundingClientRect) {
    const scrollListenerWrappers = []
    const resizeListenerWrappers = []

    function getListener({
        containerNode,
        visibleCallback,
        optimizeType,
        rootMargin
    }) {
        let scrollListenerNode = scrollParent(containerNode)
        let scrollListenerWrapper = scrollListenerWrappers.find(
            scrollListenerWrapper => {
                return (
                    scrollListenerWrapper &&
                    scrollListenerWrapper.rootMargin === rootMargin &&
                    scrollListenerWrapper.scrollListenerNode ===
                        scrollListenerNode &&
                    scrollListenerWrapper.optimizeType.name ===
                        optimizeType.name &&
                    scrollListenerWrapper.optimizeType.value ===
                        optimizeType.value
                )
            }
        )

        if (!scrollListenerWrapper) {
            scrollListenerWrapper = {}
            scrollListenerWrapper.rootMargin = rootMargin
            scrollListenerWrapper.optimizeType = {}
            scrollListenerWrapper.optimizeType.name = optimizeType.name
            scrollListenerWrapper.optimizeType.value = optimizeType.value
            scrollListenerWrapper.scrollListenerNode = scrollListenerNode
            /**
             * 降级getBoundingClientRect的情况下 rootMargin只支持传值 "a b c d"形式
             */
            let margin = rootMargin.split(/\s+/)
            let marginTop, marginBottom, marginLeft, marginRight
            scrollListenerWrapper.marginTop = marginTop = parseFloat(margin[0])
            scrollListenerWrapper.marginRight = marginRight = parseFloat(
                margin[1]
            )
            scrollListenerWrapper.marginBottom = marginBottom = parseFloat(
                margin[2]
            )
            scrollListenerWrapper.marginLeft = marginLeft = parseFloat(
                margin[3]
            )
            scrollListenerWrapper.targetCbMap = []
            let scrollHandler = () => {
                let viewPortWidth = window.innerWidth
                let viewPortHeight = window.innerHeight
                let enter = false
                scrollListenerWrapper.targetCbMap.forEach(
                    (item, index, array) => {
                        if (!item) {
                            return
                        }

                        let {
                            top,
                            bottom,
                            left,
                            right
                        } = item.target.getBoundingClientRect()
                        let isIntersect = reactIntersection({
                            top,
                            left,
                            bottom,
                            right,
                            marginLeft,
                            marginTop,
                            marginRight,
                            marginBottom,
                            viewPortHeight,
                            viewPortWidth
                        })
                        if (isIntersect) {
                            enter = true
                            let cb = item.cb
                            cb && cb()
                            array[index] = null
                            scrollListenerWrapper.targetExist--
                            if (resizeListenerWrapper.targetCbMap) {
                                let index = resizeListenerWrapper.targetCbMap.findIndex(
                                    otherItem => {
                                        return (
                                            otherItem &&
                                            otherItem.target === item.target &&
                                            otherItem.cb === item.cb
                                        )
                                    }
                                )
                                if (index !== -1) {
                                    resizeListenerWrapper.targetCbMap[
                                        index
                                    ] = null
                                    resizeListenerWrapper.targetExist--
                                }
                            }
                        }
                    }
                )

                if (enter === true) {
                    if (scrollListenerWrapper.targetExist === 0) {
                        removeEventListener(
                            scrollListenerNode,
                            'scroll',
                            scrollListenerWrapper.scrollHandler,
                            eventOptions
                        )
                        removeEventListener(
                            resizeListenerNode,
                            'resize',
                            resizeListenerWrapper.resizeHandler,
                            eventOptions
                        )
                    }
                }
            }

            if (scrollListenerWrapper.optimizeType.name === 'debounce') {
                scrollHandler = debounce(
                    scrollHandler,
                    scrollListenerWrapper.optimizeType.value
                )
            } else if (scrollListenerWrapper.optimizeType.name === 'throttle') {
                scrollHandler = throttle(
                    scrollHandler,
                    scrollListenerWrapper.optimizeType.value
                )
            } else {
                //没有优化
            }

            addEventListener(
                scrollListenerNode,
                'scroll',
                scrollHandler,
                eventOptions
            )
            scrollListenerWrappers.push(scrollListenerWrapper)
            scrollListenerWrapper.scrollHandler = scrollHandler
        } else {
        }

        /**
         * resize事件 只有window能监听。
         */
        let resizeListenerNode = window
        let resizeListenerWrapper = resizeListenerWrappers.find(
            resizeListenerWrapper => {
                return (
                    resizeListenerWrapper &&
                    resizeListenerWrapper.rootMargin === rootMargin &&
                    resizeListenerWrapper.optimizeType.name ===
                        optimizeType.name &&
                    resizeListenerWrapper.optimizeType.value ===
                        optimizeType.value
                )
            }
        )

        if (!resizeListenerWrapper) {
            resizeListenerWrapper = {}

            resizeListenerWrapper.optimizeType = {}
            resizeListenerWrapper.optimizeType.name = optimizeType.name
            resizeListenerWrapper.optimizeType.value = optimizeType.value
            resizeListenerWrapper.resizeListenerNode = resizeListenerNode
            resizeListenerWrapper.rootMargin = rootMargin
            /**
             * 降级getBoundingClientRect的情况下 rootMargin只支持传值 "a b c d"形式
             */
            let margin = rootMargin.split(/\s+/)
            let marginTop, marginBottom, marginLeft, marginRight
            resizeListenerWrapper.marginTop = marginTop = parseFloat(margin[0])
            resizeListenerWrapper.marginRight = marginRight = parseFloat(
                margin[1]
            )
            resizeListenerWrapper.marginBottom = marginBottom = parseFloat(
                margin[2]
            )
            resizeListenerWrapper.marginLeft = marginLeft = parseFloat(
                margin[3]
            )
            resizeListenerWrapper.targetCbMap = []
            let resizeHandler = () => {
                let viewPortWidth = window.innerWidth
                let viewPortHeight = window.innerHeight
                let enter = false
                resizeListenerWrapper.targetCbMap.forEach(
                    (item, index, array) => {
                        if (!item) {
                            return
                        }

                        let {
                            top,
                            bottom,
                            left,
                            right
                        } = item.target.getBoundingClientRect()
                        let isIntersect = reactIntersection({
                            top,
                            left,
                            bottom,
                            right,
                            marginLeft,
                            marginTop,
                            marginRight,
                            marginBottom,
                            viewPortHeight,
                            viewPortWidth
                        })
                        if (isIntersect) {
                            enter = true
                            let cb = item.cb
                            cb && cb()
                            array[index] = null
                            resizeListenerWrapper.targetExist--
                            if (scrollListenerWrapper.targetCbMap) {
                                let index = scrollListenerWrapper.targetCbMap.findIndex(
                                    otherItem => {
                                        return (
                                            otherItem &&
                                            otherItem.target === item.target &&
                                            otherItem.cb === item.cb
                                        )
                                    }
                                )
                                if (index !== -1) {
                                    scrollListenerWrapper.targetCbMap[
                                        index
                                    ] = null
                                    scrollListenerWrapper.targetExist--
                                }
                            }
                        }
                    }
                )

                if (enter === true) {
                    if (resizeListenerWrapper.targetExist === 0) {
                        removeEventListener(
                            scrollListenerNode,
                            'scroll',
                            scrollListenerWrapper.scrollHandler,
                            eventOptions
                        )
                        removeEventListener(
                            resizeListenerNode,
                            'resize',
                            resizeListenerWrapper.resizeHandler,
                            eventOptions
                        )
                    }
                }
            }

            if (resizeListenerWrapper.optimizeType.name === 'debounce') {
                resizeHandler = debounce(
                    resizeHandler,
                    resizeListenerWrapper.optimizeType.value
                )
            } else if (resizeListenerWrapper.optimizeType.name === 'throttle') {
                resizeHandler = throttle(
                    resizeHandler,
                    resizeListenerWrapper.optimizeType.value
                )
            } else {
                //没有优化
            }
            addEventListener(
                resizeListenerNode,
                'resize',
                resizeHandler,
                eventOptions
            )
            resizeListenerWrappers.push(resizeListenerWrapper)
            resizeListenerWrappers.resizeHandler = resizeHandler
        } else {
        }

        return {
            scrollListenerWrapper,
            resizeListenerWrapper
        }
    }

    GenerateChecker = function({
        containerNode,
        visibleCallback,
        optimizeType,
        rootMargin
    }) {
        const { scrollListenerWrapper, resizeListenerWrapper } = getListener({
            containerNode,
            visibleCallback,
            optimizeType,
            rootMargin
        })

        return {
            register: () => {
                scrollListenerWrapper.targetCbMap.push({
                    target: containerNode,
                    cb: visibleCallback
                })
                resizeListenerWrapper.targetCbMap.push({
                    target: containerNode,
                    cb: visibleCallback
                })

                resizeListenerWrapper.targetExist === undefined
                    ? (resizeListenerWrapper.targetExist = 1)
                    : resizeListenerWrapper.targetExist++
                scrollListenerWrapper.targetExist === undefined
                    ? (scrollListenerWrapper.targetExist = 1)
                    : scrollListenerWrapper.targetExist++

                /**
                 * 注册时手动检测一次。
                 * 这里IE存在问题，需要延时执行才能检测。
                 */
                if (IE) {
                    setTimeout(() => {
                        scrollListenerWrapper.scrollHandler()
                    }, 100)
                } else {
                    /**
                     * 就算不在IE下也不能直接执行，因为事件回调是异步的，必须完全模拟
                     */
                    setTimeout(() => {
                        scrollListenerWrapper.scrollHandler()
                    })
                }
            },
            logout: () => {
                let index = scrollListenerWrapper.targetCbMap.findIndex(
                    item => {
                        return (
                            item &&
                            item.target === containerNode &&
                            item.cb === visibleCallback
                        )
                    }
                )
                if (index !== -1) {
                    scrollListenerWrapper.targetCbMap[index] = null
                    scrollListenerWrapper.targetExist--
                }
                index = resizeListenerWrapper.targetCbMap.findIndex(item => {
                    return (
                        item &&
                        item.target === containerNode &&
                        item.cb === visibleCallback
                    )
                })
                if (index !== -1) {
                    resizeListenerWrapper.targetCbMap[index] = null
                    resizeListenerWrapper.targetExist--
                }
            }
        }
    }
} else {
}

export default GenerateChecker
