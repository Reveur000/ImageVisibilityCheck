export default function scrollParent(node) {
    //非html元素直接返回html元素作为滚动父级对象
    if (!(node instanceof HTMLElement)) {
        return document.documentElement
    }

    //是否排除static定位的父元素
    let excludeStaticParent = node.style.position === 'absolute'
    let overflowReg = /(auto|scroll)/

    let parent = node

    while (parent) {
        if (!parent.parentNode) {
            return node.ownerDocument || document
        }

        let style = getComputedStyle(parent)
        let { position, overflow, overflowX, overflowY } = style

        if (position === 'static' && excludeStaticParent) {
            parent = parent.parentNode
            continue
        }
        /**
         * 这里需要注意的是 overflow属性设置时浏览器的自动属性设置。
         * 详情可以参看https://github.com/twobin/react-lazyload/issues/71。
         * 这里依旧使用这种可能导致错误的方式的原因是:
         * 我们这里认定只要元素存在出现滚动条的可能，那就把他作为滚动父元素的备选，对此我们额外的添加了滚动条存在的判断代码
         */
        if (overflowReg.test(overflow + overflowX + overflowY)) {
            //备选判断
            if (
                parent.offsetHeight === parent.scrollHeight &&
                parent.offsetWidth === parent.scrollWidth
            ) {
                //该元素不存在滚动条
                parent = parent.parentNode
            } else {
                return parent
            }
        } else {
            parent = parent.parentNode
        }
    }
    return node.ownerDocument || document
}
