import ImageVisibilityCheck from "../src";
import img from "./example.jpg"

var ele = document.createElement("div");
var imgEle = document.createElement("img");
imgEle.src = img;
ele.appendChild(imgEle);
document.body.appendChild(ele);

var btn = document.createElement("input");
btn.type = "button";
btn.addEventListener("click", () => {
    var checker = new ImageVisibilityCheck({
        containerNode: ele,
        visibleCallback: () => {
            alert("图片已经可见");
        }
    })

    checker.begin();
})
btn.value = "为图片创建检测器";
document.body.appendChild(btn)
