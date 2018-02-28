/**
 * @fileoverview Feed+DOM回收组件
 * @Author: zihao5@staff.sina.com.cn 
 * @Date: 2018-02-28 15:06:06 
 * @Last Modified by: zihao5@staff.sina.com.cn
 * @Last Modified time: 2018-02-28 15:06:38
 */
class InfiniteScrollerTemp {
  constructor(scroller, source, config) {
    if (!scroller || !source) {
      throw new Error('缺乏必要参数');
    }
    config = config || {};
    this.listMarginTop = config.listMarginTop || 0;
    this.runwayItems = config.runwayItems || 10;
    this.runwayItemsOpposite = config.runwayItemsOpposite || 10;
    this.scrollRunway = 0; // TODO: 提前可滑动的距离 目前这种场景下可考虑删除 暂时保留
    this.animationDurationMs = 0; // TODO: 不采用墓碑元素占位的话 就可以不再考虑替换时候的动画 目前这种场景下可考虑删除 暂时保留
    this.collectBottomDOMFlag = config.collectBottomDOMFlag || true;
    this.tombstoneClassName = config.tombstoneClassName;
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
    this._tombstoneSize = 0;
    this._tombstoneWidth = 0;
    this._tombstones = [];
    this._items = []; // 所有数据列表
    this._loadedItems = 0;
    this.requestInProgress_ = false;
    this.scrollRunwayEnd_ = 0;
    window.addEventListener('scroll', this._onScroll.bind(this));
    this._onResize();
  }

  _onResize() {
    // TODO: If we already have tombstones attached to the document, it would
    // probably be more efficient to use one of them rather than create a new
    // one to measure.
    var tombstone = this._source.createTombstone();
    tombstone.style.position = 'absolute';
    this._scroller.appendChild(tombstone);
    tombstone.classList.remove('invisible');
    this._tombstoneSize = tombstone.offsetHeight;
    this._tombstoneWidth = tombstone.offsetWidth;
    this._scroller.removeChild(tombstone);
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
      this.anchorItem = this.calculateAnchoredItem(this.anchorItem, delta);
    }
    this.anchorScrollTop = moduleScrollTop;
    // this.anchorScrollTop = this._scroller.scrollTop;
    var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, visualArea);
    // var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, this._scroller.offsetHeight);
    // this.showCB(this.anchorItem.index, lastScreenItem.index);
    this.firstScreenItemIndex = this.anchorItem.index;
    this.lastScreenItemIndex = lastScreenItem.index;
    if (delta < 0) {
      // 向上滚动 ⬆︎  runway代表滚动方向 当前可视区元素第20个 则需从序号 20-this.runwayItems 处开始补充
      //  this.runwayItems 底部不可视区补充元素 this.runwayItemsOpposite 顶部不可视区补充元素
      this.collectBottomDOMFlag = true;
      this.fill(this.anchorItem.index - this.runwayItems, lastScreenItem.index + this.runwayItemsOpposite);
    } else {
      // 初始化 或者向下滚动(向底部) ⬇︎
      // this.runwayItemsOpposite 取值为10 则 0~10个元素 顶部都不需要补充元素
      this.fill(this.anchorItem.index - this.runwayItemsOpposite, lastScreenItem.index + this.runwayItems);
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
  calculateAnchoredItem(initialAnchor, delta) {
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
      if (i >= this._items.length || !this._items[i].height)
        tombstones = Math.floor(Math.max(delta, 0) / this._tombstoneSize);
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
  fill(start, end) {
    this.firstAttachedItemIndex = Math.max(0, start);
    this.lastAttachedItemIndex = end;
    this.attachContent();
  }

  /**
   * Creates or returns an existing tombstone ready to be reused.
   * @return {Element} A tombstone element ready to be used.
   */
  getTombstone() {
    var tombstone = this._tombstones.pop();
    if (tombstone) {
      tombstone.classList.remove('invisible');
      tombstone.style.opacity = 1;
      tombstone.style.transform = '';
      tombstone.style.transition = '';
      return tombstone;
    }
    return this._source.createTombstone();
  }

  /**
   * Create DOM nodes 内部方法
   */
  _chreatDOM(unusedNodesObj, i) {
    if (this._items[i].node) {
      // if it's a tombstone but we have data, replace it.
      if (this._items[i].node.classList.contains(this.tombstoneClassName) &&
        this._items[i].data) {
        // TODO: Probably best to move items on top of tombstones and fade them in instead.
        // 隐藏占位墓碑元素 移动墓碑元素到可复用墓碑元素列表里
        if (this.animationDurationMs) {
          this._items[i].node.style.zIndex = 1;
          tombstoneAnimations[i] = [this._items[i].node, this._items[i].top - this.anchorScrollTop];
        } else {
          this._items[i].node.classList.add('invisible');
          this._tombstones.push(this._items[i].node);
        }
        this._items[i].node = null;
      } else {
        return
      }
    }

    // 当前可视区内节点为 墓碑元素 或者 this._items[i].node 为空（没有渲染过） 执行下面的逻辑
    // 已经渲染过的话 已从上面的判断中跳过
    // TODO: randomModule key值命名规范  
    var dom = null;
    var templateType = this._items[i].data && this._items[i].data.randomModule;
    if (unusedNodesObj[templateType] && unusedNodesObj[templateType].length) {
      // console.log('可复用');
      dom = unusedNodesObj[templateType].pop();
    }
    // var node = this._items[i].data ? this._source.render(this._items[i].data, dom) : this.getTombstone();
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
  attachContent(from) {
    // Collect nodes which will no longer be rendered for reuse.
    // TODO: Limit this based on the change in visible items rather than looping
    // over all items.
    var i;
    var unusedNodesObj = {};
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
        if (this._items[i].node.classList.contains(this.tombstoneClassName)) {
          this._tombstones.push(this._items[i].node);
          this._tombstones[this._tombstones.length - 1].classList.add('invisible');
        } else {
          // add 根据模板类型回收
          var moduleType = this._items[i].data.randomModule;
          if (Object.prototype.toString.call(unusedNodesObj[moduleType]) === '[object Array]') {
            unusedNodesObj[moduleType].push(this._items[i].node);
          } else {
            unusedNodesObj[moduleType] = [this._items[i].node];
          }

        }
      }
      // 清理缓存数据里的node节点 只有可视区内 和上下预保留的 有node节点数据
      // 此处的this._items[]的数量可能比需展示一屏的数量少 在下面的循环里会补充
      this._items[i].node = null;
    }

    var tombstoneAnimations = {};
    // Create DOM nodes.
    // 加载更多来的数据 一次添加完毕
    var endPoint = from === 'fetch' ? this._loadedItems : this.lastAttachedItemIndex;
    for (i = this.firstAttachedItemIndex; i < endPoint; i++) {
      // this._items中总数据量不超过已加载的数据量
      if (i >= this._loadedItems) {
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
    for (var i in tombstoneAnimations) {
      var anim = tombstoneAnimations[i];
      this._items[i].node.style.transform = 'translateY(' + (this.anchorScrollTop + anim[1]) + 'px) scale(' + (this._tombstoneWidth / this._items[i].width) + ', ' + (this._tombstoneSize / this._items[i].height) + ')';
      // Call offsetTop on the nodes to be animated to force them to apply current transforms.
      this._items[i].node.offsetTop;
      anim[0].offsetTop;
      this._items[i].node.style.transition = 'transform ' + this.animationDurationMs + 'ms';
    }
    for (i = this.firstAttachedItemIndex; i < endPoint; i++) {
      // if (this.lastScreenItemIndex > this._loadedItems - this.runwayItems) {
      //   console.log('break');
      //   break;
      // }
      if (i >= this._loadedItems) {
        i = endPoint;
        break;
      }
      var anim = tombstoneAnimations[i];
      if (anim) {
        anim[0].style.transition = 'transform ' + this.animationDurationMs + 'ms, opacity ' + this.animationDurationMs + 'ms';
        anim[0].style.transform = 'translateY(' + curPos + 'px) scale(' + (this._items[i].width / this._tombstoneWidth) + ', ' + (this._items[i].height / this._tombstoneSize) + ')';
        anim[0].style.opacity = 0;
      }
      if (curPos != this._items[i].top) {
        if (!anim)
          this._items[i].node.style.transition = '';
        this._items[i].node.style.transform = 'translateY(' + curPos + 'px)';
      }
      this._items[i].top = curPos;
      curPos += this._items[i].height || this._tombstoneSize;
    }
    this.scrollRunwayEnd_ = Math.max(this.scrollRunwayEnd_, curPos + this.scrollRunway);
    // this.scrollRunway_.style.transform = 'translate(0, ' + this.scrollRunwayEnd_ + 'px)';
    // this._scroller.scrollTop = this.anchorScrollTop;
    this._scroller.style.height = this.scrollRunwayEnd_ + 'px';

    if (this.animationDurationMs) {
      // TODO: Should probably use transition end, but there are a lot of animations we could be listening to.
      setTimeout(function() {
        for (var i in tombstoneAnimations) {
          var anim = tombstoneAnimations[i];
          anim[0].classList.add('invisible');
          this._tombstones.push(anim[0]);
          // Tombstone can be recycled now.
        }
      }.bind(this), this.animationDurationMs)
    }

    this.maybeRequestContent();

  }

  /**
   * Requests additional content if we don't have enough currently.
   */
  maybeRequestContent() {
    // Don't issue another request if one is already in progress as we don't
    // know where to start the next request yet.
    if (this.requestInProgress_)
      return;
    var itemsNeeded = this.lastAttachedItemIndex - this._loadedItems;
    if (itemsNeeded <= 0)
      return;
    this.requestInProgress_ = true;
    this._source.fetch(itemsNeeded).then((item) => {
      if (item.length) {
        this.addContent(item);
      }
    });
  }

  /**
   * Adds an item to the items list.
   */
  addItem_() {
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
   * attachContent to update the displayed content.
   * @param {Array<Object>} items The array of items to be added to the infinite
   *     scroller list.
   */
  addContent(items) {
    this.requestInProgress_ = false;
    this.collectBottomDOMFlag = false;
    for (var i = 0; i < items.length; i++) {
      if (this._items.length <= this._loadedItems)
        this.addItem_();
      this._items[this._loadedItems++].data = items[i];
    }
    this.attachContent('fetch');
  }
}

export default InfiniteScrollerTemp