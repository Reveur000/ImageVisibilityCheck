/**
 * 根据视口的大小，以及getBoundingClientRect返回的top left 等值，
 * 结合允许的rootMargin，判断元素是否与视口相交。
 * @param {*}
 */
export default function reactIntersection({
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
}) {
    let isBeyond =
        -bottom > marginTop ||
        -right > marginLeft ||
        left > viewPortWidth + marginRight ||
        top > marginBottom + viewPortHeight
    return !isBeyond
}
