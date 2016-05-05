# ng-waterfall
一个基于Angular js的瀑布流组件，使用directive方式完成。

## 示例

```html
<water-fall id="waterfall" class="water-fall" box-column="6" box-class="grid" box-space="8" load-step="20" custom-tips="1" show-tips="replace" json-data="waterfallJson" json-url="http://wlog.cn/demo/waterfall/data/data1.json">
    <div ng-if="replace">You didn’t have any PICs yet.</div>
</water-fall>
```
完整示例请参考index.html。

## 参数说明

0. manual-load // 加载模式。1：手动点击加载；0：滚动自动加载。可选，默认值：0
0. box-column // 格子布局模式。n：固定n列，宽度自适应；0：固定宽度(css设定)，列数自适应。可选，默认值：4
0. box-class  // 格子样式名称。字符串，可选，默认值：'box'
0. box-space  // 格子间距。数值，可选，默认值：10
0. fixed-ratio // 格子长宽比。数值，可选，默认值：0（自适应原始比例）
0. load-step // 每次动态加载的格子数。数值，可选，默认值：30
0. init-step // 初始化加载的格子数。数值，可选，默认值：同上（loadStep）
0. custom-tips // 是否使用自定义的提示内容。1/0，可选，默认值：0
0. show-tips // 自定义提示内容判断参数。对象（提供后，在自定义提示代码上用ng-if做判断）
0. json-data // 原始数据。对象（json格式）
0. json-url // 动态数据加载地址。字符串（url地址）。以上两项最少提供一个
0. toggle-show // 是否支持可视范围内动态切换图片。1/0，可选，默认值：0
0. detect-partial // 可视判断方式。1：部分进入为可视，0：整体进入为可视。上项（toggleShow）为ture时有效，可选，默认值：0
