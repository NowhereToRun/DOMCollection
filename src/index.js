/**
 * @fileoverview Feed+DOM回收组件
 * @Author: zihao5@staff.sina.com.cn 
 * @Date: 2018-02-28 15:06:06 
 * @Last Modified by: zihao5@staff.sina.com.cn
 * @Last Modified time: 2018-03-07 15:47:55
 */

class InfiniteScroller {
  constructor(scroller, source, config) {
    if (!scroller || !source) {
      throw new Error('缺乏必要参数');
    }
    config = config || {};
    this.listMarginTop = config.listMarginTop || scroller.offsetTop;
    this.runwayItems = config.runwayItems || 10;
    this.runwayItemsOpposite = config.runwayItemsOpposite || 10;
    this.collectBottomDOMFlag = config.collectBottomDOMFlag || true;
    this.reusingSelector = config.reusingSelector || '';
    this._scroller = scroller;
    this._source = source;
    this._init();
  }
  _init() {
    this.anchorItem = {
      index: 0,
      offset: 0
    };
    this.firstAttachedItemIndex = 0; // 可视区顶部应补充的Item编码，最小为0。会根据 this.runwayItems 与 this.runwayItemsOpposite 的值动态计算。例如向页面底部滚动 取值为 当前可视区第一个元素index-this.runwayItemsOpposite；向页面顶部滚动 取值为 当前可视区第一个元素index-this.runwayItems
    this.lastAttachedItemIndex = 0; // 可视区底部应补充的Item编码
    this.firstScreenItemIndex = 0;
    this.lastScreenItemIndex = 0;
    this.anchorScrollTop = 0;
    this._tombstoneSize = 40; // TODO: 处理默认占位高度
    this._items = []; // 所有数据列表
    this._loadedItems = 0;
    this._requestInProgress = false;
    this._scrollRunwayEnd = 0;
    window.addEventListener('scroll', this._onScroll.bind(this));
    this._onResize();
  }

  _onResize() {
    // TODO: If we already have tombstones attached to the document, it would
    // probably be more efficient to use one of them rather than create a new
    // one to measure.
    // var tombstone = this._source.createTombstone();
    // tombstone.style.position = 'absolute';
    // this._scroller.appendChild(tombstone);
    // tombstone.classList.remove('invisible');
    // this._tombstoneSize = tombstone.offsetHeight;
    // this._scroller.removeChild(tombstone);
    // Reset the cached size of items in the scroller as they may no longer be
    // correct after the item content undergoes layout.
    for (var i = 0; i < this._items.length; i++) {
      this._items[i].height = this._items[i].width = 0;
    }
    this._onScroll();
  }

  /**
   * Called when the scroller scrolls. This determines the newly anchored item
   * and offset and then updates the visible elements, requesting more items
   * from the source if we've scrolled past the end of the currently available
   * content.
   */
  _onScroll() {
    var moduleScrollTop = window.scrollY - this.listMarginTop;
    var visualArea = window.screen.height;
    if (moduleScrollTop < 0) {
      visualArea = visualArea + moduleScrollTop;
      moduleScrollTop = 0;
    }
    var delta = moduleScrollTop - this.anchorScrollTop;
    // Special case, if we get to very top, always scroll to top.
    if (moduleScrollTop == 0) {
      this.anchorItem = {
        index: 0,
        offset: 0
      };
    } else {
      this.anchorItem = this._calculateAnchoredItem(this.anchorItem, delta);
    }
    this.anchorScrollTop = moduleScrollTop;
    var lastScreenItem = this._calculateAnchoredItem(this.anchorItem, visualArea);
    this.firstScreenItemIndex = this.anchorItem.index;
    this.lastScreenItemIndex = lastScreenItem.index;
    if (delta < 0) {
      // 向上滚动 ⬆︎  runway代表滚动方向 当前可视区第一个元素为第20个 则需从序号 20-this.runwayItems 处开始补充
      this.collectBottomDOMFlag = true;
      this._fill(this.anchorItem.index - this.runwayItems, lastScreenItem.index + this.runwayItemsOpposite);
    } else {
      // 初始化 或者向下滚动(向底部) ⬇︎
      this._fill(this.anchorItem.index - this.runwayItemsOpposite, lastScreenItem.index + this.runwayItems);
    }
  }

  /**
   * Calculates the item that should be anchored after scrolling by delta from
   * the initial anchored item.
   * @param {{index: number, offset: number}} initialAnchor The initial position
   *     to scroll from before calculating the new anchor position.
   * @param {number} delta The offset from the initial item to scroll by.
   * @return {{index: number, offset: number}} Returns the new item and offset
   *     scroll should be anchored to.
   */
  _calculateAnchoredItem(initialAnchor, delta) {
    if (delta == 0)
      return initialAnchor;
    delta += initialAnchor.offset;
    var i = initialAnchor.index;
    var tombstones = 0;
    if (delta < 0) {
      while (delta < 0 && i > 0 && this._items[i - 1].height) {
        delta += this._items[i - 1].height;
        i--;
      }
      tombstones = Math.max(-i, Math.ceil(Math.min(delta, 0) / this._tombstoneSize));
    } else {
      while (delta > 0 && i < this._items.length && this._items[i].height && this._items[i].height < delta) {
        delta -= this._items[i].height;
        i++;
      }
      if (i >= this._items.length || !this._items[i].height) {
        tombstones = Math.floor(Math.max(delta, 0) / this._tombstoneSize);
        // console.log('use _tombstoneSize', i, this._items.length, delta, tombstones);
      }
    }
    i += tombstones;
    delta -= tombstones * this._tombstoneSize;
    return {
      index: i,
      offset: delta,
    };
  }

  /**
   * Sets the range of items which should be attached and attaches those items.
   * @param {number} start The first item which should be attached.
   * @param {number} end One past the last item which should be attached.
   */
  _fill(start, end) {
    this.firstAttachedItemIndex = Math.max(0, start);
    this.lastAttachedItemIndex = end;
    this._attachContent();
  }

  /**
   * Create DOM nodes 内部方法
   */
  _chreatDOM(unusedNodesObj, i) {
    // 需渲染的节点 已有DOM节点 则不处理
    if (this._items[i].node) {
      return
    }

    // 需渲染的节点没有对应的DOM 执行渲染逻辑
    var dom = null;
    if (this.reusingSelector) {
      // 需要重用节点 则从unusedNodesObj中寻找可复用的节点
      var templateType = this._items[i].data && this._items[i].data[this.reusingSelector];
      if (unusedNodesObj[templateType] && unusedNodesObj[templateType].length) {
        // console.log('可复用');
        dom = unusedNodesObj[templateType].pop();
      }
    }
    var node = this._source.render(this._items[i].data, dom);
    // Maybe don't do this if it's already attached?
    node.style.position = 'absolute';
    this._items[i].top = -1;
    this._scroller.appendChild(node);
    this._items[i].node = node;
  }

  /**
   * Attaches content to the scroller and updates the scroll position if
   * necessary.
   * @param {string} from 触发attachContent方法的来源 如果是fetch回来的数据 则一次把dom高度全部计算出来
   */
  _attachContent(from) {
    // Collect nodes which will no longer be rendered for reuse.
    // TODO: Limit this based on the change in visible items rather than looping
    // over all items.
    var i;
    var unusedNodesObj = {
      __defaultDOMResuingNodeType: []
    };
    // 找出需要回收的节点
    for (i = 0; i < this._items.length; i++) {
      // Skip the items which should be visible.
      if (i == this.firstAttachedItemIndex) {
        i = this.lastAttachedItemIndex - 1;
        if (!this.collectBottomDOMFlag) {
          // 如果刚加载完数据 且滚动方向向下 不回收底部的DOM
          i = this._items.length;
        }
        continue;
      }

      if (this._items[i].node) {
        // 根据模板类型回收
        if (this.reusingSelector && this._items[i].data[this.reusingSelector]) {
          // 如果需要重用
          var moduleType = this._items[i].data[this.reusingSelector];
          if (Object.prototype.toString.call(unusedNodesObj[moduleType]) === '[object Array]') {
            unusedNodesObj[moduleType].push(this._items[i].node);
          } else {
            unusedNodesObj[moduleType] = [this._items[i].node];
          }
        } else {
          // 不需要重用
          unusedNodesObj.__defaultDOMResuingNodeType.push(this._items[i].node);
        }
      }
      // 清理缓存数据里的node节点 只有可视区内 和上下预保留的 有node节点数据
      this._items[i].node = null;
    }

    // Create DOM nodes.
    // 加载更多来的数据 一次添加完毕
    var endPoint = from === 'fetch' ? this._loadedItems : this.lastAttachedItemIndex;
    for (i = this.firstAttachedItemIndex; i < endPoint; i++) {
      // this._items中总数据量不超过已加载的数据量 
      if (i >= this._loadedItems) {
        // 需要显示的节点index 大于 已有数据 提前终止循环
        i = endPoint;
        break;
      }
      this._chreatDOM(unusedNodesObj, i);
    }

    // Remove all unused nodes
    for (var i in unusedNodesObj) {
      while (unusedNodesObj[i].length) {
        this._scroller.removeChild(unusedNodesObj[i].pop());
      }
    }
    unusedNodesObj = null;
    // Get the height of all nodes which haven't been measured yet.
    for (i = this.firstAttachedItemIndex; i < endPoint; i++) {
      if (i >= this._loadedItems) {
        break;
      }
      // Only cache the height if we have the real contents, not a placeholder.
      if (this._items[i].data && !this._items[i].height) {
        this._items[i].height = this._items[i].node.offsetHeight;
        this._items[i].width = this._items[i].node.offsetWidth;
      }
    }

    // Fix scroll position in case we have realized the heights of elements
    // that we didn't used to know.
    // TODO: We should only need to do this when a height of an item becomes
    // known above.
    this.anchorScrollTop = 0;
    for (i = 0; i < this.anchorItem.index; i++) {
      // if (i >= this._loadedItems) {
      //   break;
      // }
      this.anchorScrollTop += this._items[i].height || this._tombstoneSize;
    }
    this.anchorScrollTop += this.anchorItem.offset;
    // Position all nodes.
    // curPos 顶部补充元素+所有可视区元素+底部补充元素 的偏移    从第一个顶部补充元素的偏移开始
    // 例如 拖动滚动条方向向下（触摸手势方向向上）
    // 当前可视区第一个元素的index为10，则 curPos 为第 10-this.runwayItemsOpposite 元素的 translateY
    var curPos = this.anchorScrollTop - this.anchorItem.offset; // 目前取的是 可视区内首个元素 距离可滑动列表顶部的距离  其实就是他的translateY
    i = this.anchorItem.index;
    while (i > this.firstAttachedItemIndex) {
      curPos -= this._items[i - 1].height || this._tombstoneSize;
      i--;
    }
    while (i < this.firstAttachedItemIndex) {
      curPos += this._items[i].height || this._tombstoneSize;
      i++;
    }
    // Set up initial positions for animations.
    for (i = this.firstAttachedItemIndex; i < endPoint; i++) {
      if (i >= this._loadedItems) {
        i = endPoint;
        break;
      }
      if (curPos != this._items[i].top) {
        this._items[i].node.style.transform = 'translateY(' + curPos + 'px)';
      }
      this._items[i].top = curPos;
      curPos += this._items[i].height || this._tombstoneSize;
    }
    this._scrollRunwayEnd = Math.max(this._scrollRunwayEnd, curPos);
    // this._scroller.scrollTop = this.anchorScrollTop;
    this._scroller.style.height = this._scrollRunwayEnd + 'px';

    this._maybeRequestContent();
  }

  /**
   * Requests additional content if we don't have enough currently.
   */
  _maybeRequestContent() {
    // Don't issue another request if one is already in progress as we don't
    // know where to start the next request yet.
    if (this._requestInProgress)
      return;
    var itemsNeeded = this.lastAttachedItemIndex - this._loadedItems;
    if (itemsNeeded <= 0)
      return;
    this._requestInProgress = true;
    this._source.fetch(itemsNeeded).then((item) => {
      if (item.length) {
        this._addContent(item);
      }
    });
  }

  /**
   * Adds an item to the items list.
   */
  _addItem() {
    this._items.push({
      'data': null,
      'node': null,
      'height': 0,
      'width': 0,
      'top': 0,
    })
  }

  /**
   * Adds the given array of items to the items list and then calls
   * _attachContent to update the displayed content.
   * @param {Array<Object>} items The array of items to be added to the infinite
   *     scroller list.
   */
  _addContent(items) {
    this._requestInProgress = false;
    this.collectBottomDOMFlag = false;
    for (var i = 0; i < items.length; i++) {
      if (this._items.length <= this._loadedItems)
        this._addItem();
      this._items[this._loadedItems++].data = items[i];
    }
    this._attachContent('fetch');
  }

  _updateContentPos(begin, end, delta) {
    for (let i = begin; i < end; i++) {
      this._items[i].top = this._items[i].top + delta;
      if (this._items[i].node) {
        this._items[i].node.style.transform = 'translateY(' + this._items[i].top + 'px)';
      }
    }
  }

  /**
   * 更新列表距离顶部的高度
   * @param {number} listMarginTop 非必须，更新后的列表距离顶端的高度，不传则直接计算
   */
  resizeList(listMarginTop) {
    listMarginTop = parseInt(listMarginTop, 10);
    if (listMarginTop === listMarginTop) {
      this.listMarginTop = listMarginTop;
    } else {
      this.listMarginTop = this._scroller.offsetTop;
    }
  }

  /**
   * 列表中某一项高度变化
   * @param {{itemIndex: number, info: {key: string, value: *}, newHeight: number}} changeInfo 
   * itemIndex 和 info必须有一项存在
   * itemIndex：变化元素在所有元素中的位置 如提供则优先使用itemIndex
   * info：找到变化项的必须信息，info.key表示数据源中的键名称，info.value表示数据源中的键值
   * height：非必须，如提供则使用此值来更新高度，否则找到对应DOM节点计算高度
   * TODO： 处理这条DOM已经被删除掉的情况
   */
  resizeContent(changeInfo = {}) {
    let {
      itemIndex,
      info = {},
      newHeight
    } = changeInfo;
    if (itemIndex == null && (info.key == null || info.value == null)) {
      console.warn('resizeContent缺乏必备更新信息');
      return;
    }

    if (itemIndex != null) {
      itemIndex = parseInt(itemIndex, 10);
    } else {
      this._items.forEach((item, index) => {
        if (item.data[info.key] === info.value) {
          itemIndex = index;
          return;
        }
      })
    }

    if (!this._items[itemIndex]) {
      console.warn('resizeContent没有找到对应节点');
      return
    }

    let totalItem = this._items.length;
    if (newHeight) {
      let delta = newHeight - this._items[itemIndex].height;
      this._items[itemIndex].height = newHeight;
      this._updateContentPos(itemIndex + 1, totalItem, delta);
    }
  }
}

export default InfiniteScroller