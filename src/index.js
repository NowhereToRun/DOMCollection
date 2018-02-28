let moduleOffsetTop = 0; // 模块距离顶部距离
let clientHeight = window.screen.height;
// scroll direction为window系统操作鼠标滑轮的滚动方向 或者拖动滚动条的方向
// 而不是mac触摸板 或者手机屏幕手指滑动的方向
// Number of items to instantiate beyond current view in the scroll direction.
let RUNWAY_ITEMS = 5; // 不能为0

// Number of items to instantiate beyond current view in the opposite direction.
let RUNWAY_ITEMS_OPPOSITE = 10;

// The number of pixels of additional length to allow scrolling to.
let SCROLL_RUNWAY = 2000;

// The animation interval (in ms) for fading in content from tombstones.
// let ANIMATION_DURATION_MS = 200;
let ANIMATION_DURATION_MS = 0;

let tombstoneClassName = 'j_tombstone';

let collectBottomDOMFlag = true; // 向下滚动时是否需要回收DOM标记 默认情况下回收 当刚加载完数据 且滑动方向仍然向下时 不回收

let InfiniteScrollerSource = function() {}

InfiniteScrollerSource.prototype = {
  /**
   * Fetch more items from the data source. This should try to fetch at least
   * count items but may fetch more as desired. Subsequent calls to fetch should
   * fetch items following the last successful fetch.
   * @param {number} count The minimum number of items to fetch for display.
   * @return {Promise(Array<Object>)} Returns a promise which will be resolved
   *     with an array of items.
   */
  fetch: function(count) {},

  /**
   * Create a tombstone element. All tombstone elements should be identical
   * @return {Element} A tombstone element to be displayed when item data is not
   *     yet available for the scrolled position.
   */
  createTombstone: function() {},

  /**
   * Render an item, re-using the provided item div if passed in.
   * @param {Object} item The item description from the array returned by fetch.
   * @param {?Element} element If provided, this is a previously displayed
   *     element which should be recycled for the new item to display.
   * @return {Element} The constructed element to be displayed in the scroller.
   */
  render: function(item, div) {},
};


/**
 * Construct an infinite scroller.
 * @param {Element} scroller The scrollable element to use as the infinite
 *     scroll region.
 * @param {InfiniteScrollerSource} source A provider of the content to be
 *     displayed in the infinite scroll region.
 */
let InfiniteScroller = function(scroller, source, config) {
  if (config) {
    config.runwayItems != null && (RUNWAY_ITEMS = config.runwayItems);
    config.runwayItemsOpposite != null && (RUNWAY_ITEMS_OPPOSITE = config.runwayItemsOpposite);
    config.tombstoneClassName != null && (tombstoneClassName = config.tombstoneClassName);
    config.moduleOffsetTop != null && (moduleOffsetTop = config.moduleOffsetTop);
    config.scrollRunway != null && (SCROLL_RUNWAY = config.scrollRunway);
  }
  this.anchorItem = {
    index: 0,
    offset: 0
  };
  this.firstAttachedItem_ = 0; // 可视区顶部应补充的Item编码，最小为0。会根据 RUNWAY_ITEMS 与 RUNWAY_ITEMS_OPPOSITE 的值动态计算。例如向页面底部滚动 取值为 当前可视区第一个元素index-RUNWAY_ITEMS_OPPOSITE；向页面顶部滚动 取值为 当前可视区第一个元素index-RUNWAY_ITEMS
  this.lastAttachedItem_ = 0; // 可视区底部应补充的Item编码
  this.firstScreenItemIndex = 0;
  this.lastScreenItemIndex = 0;
  this.anchorScrollTop = 0;
  this.tombstoneSize_ = 0;
  this.tombstoneWidth_ = 0;
  this.tombstones_ = [];
  this.scroller_ = scroller;
  this.source_ = source;
  this.items_ = []; // 所有数据列表
  this.loadedItems_ = 0;
  this.requestInProgress_ = false;
  // this.scroller_.addEventListener('scroll', this.onScroll_.bind(this));
  window.addEventListener('scroll', this.onScroll_.bind(this));
  // window.addEventListener('resize', this.onResize_.bind(this));
  this.scrollRunwayEnd_ = 0;
  this.onResize_();
}

InfiniteScroller.prototype = {
  init: function(initNum) {
    for (var i = 0; i < initNum; i++) {
      this.addItem_();
    }
    this.lastAttachedItem_ = initNum;
    this.maybeRequestContent();
  },

  /**
   * Called when the browser window resizes to adapt to new scroller bounds and
   * layout sizes of items within the scroller.
   */
  onResize_: function() {
    // TODO: If we already have tombstones attached to the document, it would
    // probably be more efficient to use one of them rather than create a new
    // one to measure.
    var tombstone = this.source_.createTombstone();
    tombstone.style.position = 'absolute';
    this.scroller_.appendChild(tombstone);
    tombstone.classList.remove('invisible');
    this.tombstoneSize_ = tombstone.offsetHeight;
    this.tombstoneWidth_ = tombstone.offsetWidth;
    this.scroller_.removeChild(tombstone);
    // Reset the cached size of items in the scroller as they may no longer be
    // correct after the item content undergoes layout.
    for (var i = 0; i < this.items_.length; i++) {
      this.items_[i].height = this.items_[i].width = 0;
    }
    this.onScroll_();
  },

  /**
   * Called when the scroller scrolls. This determines the newly anchored item
   * and offset and then updates the visible elements, requesting more items
   * from the source if we've scrolled past the end of the currently available
   * content.
   */
  onScroll_: function() {
    var moduleScrollTop = window.scrollY - moduleOffsetTop;
    var visualArea = clientHeight;
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
    // this.anchorScrollTop = this.scroller_.scrollTop;
    var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, visualArea);
    // var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, this.scroller_.offsetHeight);
    // this.showCB(this.anchorItem.index, lastScreenItem.index);
    this.firstScreenItemIndex = this.anchorItem.index;
    this.lastScreenItemIndex = lastScreenItem.index;
    if (delta < 0) {
      // 向上滚动 ⬆︎  runway代表滚动方向 当前可视区元素第20个 则需从序号 20-RUNWAY_ITEMS 处开始补充
      //  RUNWAY_ITEMS 底部不可视区补充元素 RUNWAY_ITEMS_OPPOSITE 顶部不可视区补充元素
      this.collectBottomDOMFlag = true;
      this.fill(this.anchorItem.index - RUNWAY_ITEMS, lastScreenItem.index + RUNWAY_ITEMS_OPPOSITE);
    } else {
      // 初始化 或者向下滚动(向底部) ⬇︎
      // RUNWAY_ITEMS_OPPOSITE 取值为10 则 0~10个元素 顶部都不需要补充元素
      this.fill(this.anchorItem.index - RUNWAY_ITEMS_OPPOSITE, lastScreenItem.index + RUNWAY_ITEMS);
    }
  },

  /**
   * Calculates the item that should be anchored after scrolling by delta from
   * the initial anchored item.
   * @param {{index: number, offset: number}} initialAnchor The initial position
   *     to scroll from before calculating the new anchor position.
   * @param {number} delta The offset from the initial item to scroll by.
   * @return {{index: number, offset: number}} Returns the new item and offset
   *     scroll should be anchored to.
   */
  calculateAnchoredItem: function(initialAnchor, delta) {
    if (delta == 0)
      return initialAnchor;
    delta += initialAnchor.offset;
    var i = initialAnchor.index;
    var tombstones = 0;
    if (delta < 0) {
      while (delta < 0 && i > 0 && this.items_[i - 1].height) {
        delta += this.items_[i - 1].height;
        i--;
      }
      tombstones = Math.max(-i, Math.ceil(Math.min(delta, 0) / this.tombstoneSize_));
    } else {
      while (delta > 0 && i < this.items_.length && this.items_[i].height && this.items_[i].height < delta) {
        delta -= this.items_[i].height;
        i++;
      }
      if (i >= this.items_.length || !this.items_[i].height)
        tombstones = Math.floor(Math.max(delta, 0) / this.tombstoneSize_);
    }
    i += tombstones;
    delta -= tombstones * this.tombstoneSize_;
    return {
      index: i,
      offset: delta,
    };
  },

  /**
   * Sets the range of items which should be attached and attaches those items.
   * @param {number} start The first item which should be attached.
   * @param {number} end One past the last item which should be attached.
   */
  fill: function(start, end) {
    this.firstAttachedItem_ = Math.max(0, start);
    this.lastAttachedItem_ = end;
    this.attachContent();
  },

  /**
   * 可视后回调
   */
  showCB: function(start, end) {
    for (var i = start; i < end; i++) {
      if (this.items_[i] && this.items_[i].data) {
        if (typeof this.items_[i].data.fn === 'function' && !this.items_[i].data.isFnTriggered) {
          this.items_[i].data.fn();
          this.items_[i].data.isFnTriggered = 1;
        }
      }
    }
  },

  /**
   * Creates or returns an existing tombstone ready to be reused.
   * @return {Element} A tombstone element ready to be used.
   */
  getTombstone: function() {
    var tombstone = this.tombstones_.pop();
    if (tombstone) {
      tombstone.classList.remove('invisible');
      tombstone.style.opacity = 1;
      tombstone.style.transform = '';
      tombstone.style.transition = '';
      return tombstone;
    }
    return this.source_.createTombstone();
  },

  /**
   * Create DOM nodes
   */
  chreatDOM: function(unusedNodesObj, i) {
    if (this.items_[i].node) {
      // if it's a tombstone but we have data, replace it.
      if (this.items_[i].node.classList.contains(tombstoneClassName) &&
        this.items_[i].data) {
        // TODO: Probably best to move items on top of tombstones and fade them in instead.
        // 隐藏占位墓碑元素 移动墓碑元素到可复用墓碑元素列表里
        if (ANIMATION_DURATION_MS) {
          this.items_[i].node.style.zIndex = 1;
          tombstoneAnimations[i] = [this.items_[i].node, this.items_[i].top - this.anchorScrollTop];
        } else {
          this.items_[i].node.classList.add('invisible');
          this.tombstones_.push(this.items_[i].node);
        }
        this.items_[i].node = null;
      } else {
        return
      }
    }

    // 当前可视区内节点为 墓碑元素 或者 this.items_[i].node 为空（没有渲染过） 执行下面的逻辑
    // 已经渲染过的话 已从上面的判断中跳过
    // TODO: randomModule key值命名规范  
    var dom = null;
    var templateType = this.items_[i].data && this.items_[i].data.randomModule;
    if (unusedNodesObj[templateType] && unusedNodesObj[templateType].length) {
      // console.log('可复用');
      dom = unusedNodesObj[templateType].pop();
    }
    // var node = this.items_[i].data ? this.source_.render(this.items_[i].data, dom) : this.getTombstone();
    var node = this.source_.render(this.items_[i].data, dom);
    // Maybe don't do this if it's already attached?
    node.style.position = 'absolute';
    this.items_[i].top = -1;
    this.scroller_.appendChild(node);
    this.items_[i].node = node;
  },

  /**
   * Attaches content to the scroller and updates the scroll position if
   * necessary.
   * @param {string} from 触发attachContent方法的来源 如果是fetch回来的数据 则一次把dom高度全部计算出来
   */
  attachContent: function(from) {
    // Collect nodes which will no longer be rendered for reuse.
    // TODO: Limit this based on the change in visible items rather than looping
    // over all items.
    // console.log(from,this.lastAttachedItem_,this.items_.length  );
    var i;
    var unusedNodesObj = {};
    // console.log('firstScreenItemIndex', this.firstScreenItemIndex, 'lastScreenItemIndex', this.lastScreenItemIndex, 'firstAttachedItem_', this.firstAttachedItem_, 'lastAttachedItem_', this.lastAttachedItem_);
    // 找出需要回收的节点
    for (i = 0; i < this.items_.length; i++) {
      // Skip the items which should be visible.
      if (i == this.firstAttachedItem_) {
        i = this.lastAttachedItem_ - 1;
        if (!this.collectBottomDOMFlag) {
          // 如果刚加载完数据 且滚动方向向下 不回收底部的DOM
          i = this.items_.length;
        }
        continue;
      }

      if (this.items_[i].node) {
        if (this.items_[i].node.classList.contains(tombstoneClassName)) {
          this.tombstones_.push(this.items_[i].node);
          this.tombstones_[this.tombstones_.length - 1].classList.add('invisible');
        } else {
          // add 根据模板类型回收
          var moduleType = this.items_[i].data.randomModule;
          if (Object.prototype.toString.call(unusedNodesObj[moduleType]) === '[object Array]') {
            unusedNodesObj[moduleType].push(this.items_[i].node);
          } else {
            unusedNodesObj[moduleType] = [this.items_[i].node];
          }

        }
      }
      // 清理缓存数据里的node节点 只有可视区内 和上下预保留的 有node节点数据
      // 此处的this.items_[]的数量可能比需展示一屏的数量少 在下面的循环里会补充
      this.items_[i].node = null;
    }

    var tombstoneAnimations = {};
    // Create DOM nodes.
    // 加载更多来的数据 一次添加完毕
    var endPoint = from === 'fetch' ? this.loadedItems_ : this.lastAttachedItem_;
    for (i = this.firstAttachedItem_; i < endPoint; i++) {
      // this.items_中总数据量不超过已加载的数据量
      if (i >= this.loadedItems_) {
        break;
      }
      this.chreatDOM(unusedNodesObj, i);
    }

    // Remove all unused nodes
    for (var i in unusedNodesObj) {
      while (unusedNodesObj[i].length) {
        this.scroller_.removeChild(unusedNodesObj[i].pop());
      }
    }
    unusedNodesObj = null;
    // Get the height of all nodes which haven't been measured yet.
    for (i = this.firstAttachedItem_; i < endPoint; i++) {
      if (i >= this.loadedItems_) {
        break;
      }
      // Only cache the height if we have the real contents, not a placeholder.
      if (this.items_[i].data && !this.items_[i].height) {
        this.items_[i].height = this.items_[i].node.offsetHeight;
        this.items_[i].width = this.items_[i].node.offsetWidth;
      }
    }

    // Fix scroll position in case we have realized the heights of elements
    // that we didn't used to know.
    // TODO: We should only need to do this when a height of an item becomes
    // known above.
    this.anchorScrollTop = 0;
    for (i = 0; i < this.anchorItem.index; i++) {
      // if (i >= this.loadedItems_) {
      //   break;
      // }
      this.anchorScrollTop += this.items_[i].height || this.tombstoneSize_;
    }
    this.anchorScrollTop += this.anchorItem.offset;
    // Position all nodes.
    // curPos 顶部补充元素+所有可视区元素+底部补充元素 的偏移    从第一个顶部补充元素的偏移开始
    // 例如 拖动滚动条方向向下（触摸手势方向向上）
    // 当前可视区第一个元素的index为10，则 curPos 为第 10-RUNWAY_ITEMS_OPPOSITE 元素的 translateY
    var curPos = this.anchorScrollTop - this.anchorItem.offset; // 目前取的是 可视区内首个元素 距离可滑动列表顶部的距离  其实就是他的translateY
    i = this.anchorItem.index;
    while (i > this.firstAttachedItem_) {
      curPos -= this.items_[i - 1].height || this.tombstoneSize_;
      i--;
    }
    while (i < this.firstAttachedItem_) {
      curPos += this.items_[i].height || this.tombstoneSize_;
      i++;
    }
    // Set up initial positions for animations.
    for (var i in tombstoneAnimations) {
      var anim = tombstoneAnimations[i];
      this.items_[i].node.style.transform = 'translateY(' + (this.anchorScrollTop + anim[1]) + 'px) scale(' + (this.tombstoneWidth_ / this.items_[i].width) + ', ' + (this.tombstoneSize_ / this.items_[i].height) + ')';
      // Call offsetTop on the nodes to be animated to force them to apply current transforms.
      this.items_[i].node.offsetTop;
      anim[0].offsetTop;
      this.items_[i].node.style.transition = 'transform ' + ANIMATION_DURATION_MS + 'ms';
    }
    for (i = this.firstAttachedItem_; i < endPoint; i++) {
      // if (this.lastScreenItemIndex > this.loadedItems_ - RUNWAY_ITEMS) {
      //   console.log('break');
      //   break;
      // }
      if (i >= this.loadedItems_) {
        break;
      }
      var anim = tombstoneAnimations[i];
      if (anim) {
        anim[0].style.transition = 'transform ' + ANIMATION_DURATION_MS + 'ms, opacity ' + ANIMATION_DURATION_MS + 'ms';
        anim[0].style.transform = 'translateY(' + curPos + 'px) scale(' + (this.items_[i].width / this.tombstoneWidth_) + ', ' + (this.items_[i].height / this.tombstoneSize_) + ')';
        anim[0].style.opacity = 0;
      }
      if (curPos != this.items_[i].top) {
        if (!anim)
          this.items_[i].node.style.transition = '';
        this.items_[i].node.style.transform = 'translateY(' + curPos + 'px)';
      }
      this.items_[i].top = curPos;
      curPos += this.items_[i].height || this.tombstoneSize_;
    }
    this.scrollRunwayEnd_ = Math.max(this.scrollRunwayEnd_, curPos + SCROLL_RUNWAY);
    // this.scrollRunway_.style.transform = 'translate(0, ' + this.scrollRunwayEnd_ + 'px)';
    // this.scroller_.scrollTop = this.anchorScrollTop;
    this.scroller_.style.height = this.scrollRunwayEnd_ + 'px';

    if (ANIMATION_DURATION_MS) {
      // TODO: Should probably use transition end, but there are a lot of animations we could be listening to.
      setTimeout(function() {
        for (var i in tombstoneAnimations) {
          var anim = tombstoneAnimations[i];
          anim[0].classList.add('invisible');
          this.tombstones_.push(anim[0]);
          // Tombstone can be recycled now.
        }
      }.bind(this), ANIMATION_DURATION_MS)
    }

    this.maybeRequestContent();

  },

  /**
   * Requests additional content if we don't have enough currently.
   */
  maybeRequestContent: function() {
    // Don't issue another request if one is already in progress as we don't
    // know where to start the next request yet.
    if (this.requestInProgress_)
      return;
    var itemsNeeded = this.lastAttachedItem_ - this.loadedItems_;
    if (itemsNeeded <= 0)
      return;
    this.requestInProgress_ = true;
    this.source_.fetch(itemsNeeded).then((item) => {
      if (item.length) {
        this.addContent(item);
      }
    });
  },

  /**
   * Adds an item to the items list.
   */
  addItem_: function() {
    this.items_.push({
      'data': null,
      'node': null,
      'height': 0,
      'width': 0,
      'top': 0,
    })
  },

  /**
   * Adds the given array of items to the items list and then calls
   * attachContent to update the displayed content.
   * @param {Array<Object>} items The array of items to be added to the infinite
   *     scroller list.
   */
  addContent: function(items) {
    this.requestInProgress_ = false;
    this.collectBottomDOMFlag = false;
    for (var i = 0; i < items.length; i++) {
      if (this.items_.length <= this.loadedItems_)
        this.addItem_();
      this.items_[this.loadedItems_++].data = items[i];
    }
    this.attachContent('fetch');
  }
}

export default InfiniteScroller