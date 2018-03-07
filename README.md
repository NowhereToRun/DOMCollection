# DOM回收组件  

## 使用方法  
### 安装组件  
```
yarn // or npm install
npm run dev demo //   查看demo
```
### 使用组件  
```
import InfiniteScroller from 'dom-collection'

const feedList = document.querySelector('feed选择器');
let ContentSource = function(){};
ContentSource.prototype.fetch = function(){}; // 获取数据的方法
ContentSource.prototype.render = function(item, divObj){};  // 渲染模板的方法，组件会回传当前需要渲染的节点数据和可能存在的可以重用的DOM节点
let feedListConfig = {
  listMarginTop: 0,   //列表距离body顶部的距离，不传则组件自己计算
  runwayItems: 10,    // 当前滚动方向需 保留/提前加载 的节点数，默认为10，此数据必须 >=0
  runwayItemsOpposite: 10,  // 当前滚动反方向需保留的节点数，默认为10
  reusingSelector: 'selector'   // 如果需要DOM重用，则必须提供此选择器，且在获取到的数据节点里第一层必须有对应的字段，用以识别当前回收的DOM类型，以便重用。
}
let feedList = new InfiniteScroller(feedList, new ContentSource(), )
```

## 说明  
滚动方向： 即windows系统滚动鼠标滑轮的方向，或者拖动滚动条的方向，而非手指触摸屏幕滑动的方向。代码中使用`runway`表示滚动方向。  
RUNWAY_ITEMS：除可视区元素外，滚动方向上提前加载元素的数量。  
RUNWAY_ITEMS_OPPOSITE：除可视区元素外，滚动反方向上保留元素的数量。  



