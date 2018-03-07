/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "./";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(1);
module.exports = __webpack_require__(4);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


if (typeof Promise === 'undefined') {
  window.Promise = __webpack_require__(2)
}

// Object.assign() is commonly used with React.
// It will use the native implementation if it's present and isn't buggy.
Object.assign = __webpack_require__(3)

// In tests, polyfill requestAnimationFrame since jsdom doesn't provide it yet.
// We don't polyfill it in the browser--this is user's responsibility.
if (false) {
  require('raf').polyfill(global)
}


/***/ }),
/* 2 */
/***/ (function(module, exports) {

(function (root) {

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function noop() {}
  
  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }

  function Promise(fn) {
    if (!(this instanceof Promise)) throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    this._state = 0;
    this._handled = false;
    this._value = undefined;
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise._immediateFn(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise._immediateFn(function() {
        if (!self._handled) {
          Promise._unhandledRejectionFn(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function (onFulfilled, onRejected) {
    var prom = new (this.constructor)(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.all = function (arr) {
    return new Promise(function (resolve, reject) {
      if (!arr || typeof arr.length === 'undefined') throw new TypeError('Promise.all accepts an array');
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      for (var i = 0, len = values.length; i < len; i++) {
        values[i].then(resolve, reject);
      }
    });
  };

  // Use polyfill for setImmediate for performance gains
  Promise._immediateFn = (typeof setImmediate === 'function' && function (fn) { setImmediate(fn); }) ||
    function (fn) {
      setTimeoutFunc(fn, 0);
    };

  Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  /**
   * Set the immediate function to execute callbacks
   * @param fn {function} Function to execute
   * @deprecated
   */
  Promise._setImmediateFn = function _setImmediateFn(fn) {
    Promise._immediateFn = fn;
  };

  /**
   * Change the function to execute on unhandled rejection
   * @param {function} fn Function to execute on unhandled rejection
   * @deprecated
   */
  Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
    Promise._unhandledRejectionFn = fn;
  };
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Promise;
  } else if (!root.Promise) {
    root.Promise = Promise;
  }

})(this);


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/


/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });

// CONCATENATED MODULE: ./src/index.js
var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}/**
 * @fileoverview Feed+DOM回收组件
 * @Author: zihao5@staff.sina.com.cn 
 * @Date: 2018-02-28 15:06:06 
 * @Last Modified by: zihao5@staff.sina.com.cn
 * @Last Modified time: 2018-03-07 16:00:53
 */var InfiniteScroller=function(){function InfiniteScroller(scroller,source,config){_classCallCheck(this,InfiniteScroller);if(!scroller||!source){throw new Error('缺乏必要参数');}config=config||{};this.listMarginTop=config.listMarginTop||scroller.offsetTop;this.runwayItems=config.runwayItems||10;this.runwayItemsOpposite=config.runwayItemsOpposite||10;this.collectBottomDOMFlag=config.collectBottomDOMFlag||true;// TODO： 如果需要回收刚加载完成的数据 此处使用有问题，待修复
this.reusingSelector=config.reusingSelector||'';this._scroller=scroller;this._source=source;this._init();}_createClass(InfiniteScroller,[{key:'_init',value:function _init(){this.anchorItem={index:0,offset:0};this.firstAttachedItemIndex=0;// 可视区顶部应补充的Item编码，最小为0。会根据 this.runwayItems 与 this.runwayItemsOpposite 的值动态计算。例如向页面底部滚动 取值为 当前可视区第一个元素index-this.runwayItemsOpposite；向页面顶部滚动 取值为 当前可视区第一个元素index-this.runwayItems
this.lastAttachedItemIndex=0;// 可视区底部应补充的Item编码
this.firstScreenItemIndex=0;this.lastScreenItemIndex=0;this.anchorScrollTop=0;this._tombstoneSize=40;// TODO: 处理默认占位高度
this._items=[];// 所有数据列表
this._loadedItems=0;this._requestInProgress=false;this._scrollRunwayEnd=0;window.addEventListener('scroll',this._onScroll.bind(this));this._onResize();}},{key:'_onResize',value:function _onResize(){// TODO: If we already have tombstones attached to the document, it would
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
for(var i=0;i<this._items.length;i++){this._items[i].height=this._items[i].width=0;}this._onScroll();}/**
   * Called when the scroller scrolls. This determines the newly anchored item
   * and offset and then updates the visible elements, requesting more items
   * from the source if we've scrolled past the end of the currently available
   * content.
   */},{key:'_onScroll',value:function _onScroll(){var moduleScrollTop=window.scrollY-this.listMarginTop;var visualArea=window.screen.height;if(moduleScrollTop<0){visualArea=visualArea+moduleScrollTop;moduleScrollTop=0;}var delta=moduleScrollTop-this.anchorScrollTop;// Special case, if we get to very top, always scroll to top.
if(moduleScrollTop==0){this.anchorItem={index:0,offset:0};}else{this.anchorItem=this._calculateAnchoredItem(this.anchorItem,delta);}this.anchorScrollTop=moduleScrollTop;var lastScreenItem=this._calculateAnchoredItem(this.anchorItem,visualArea);this.firstScreenItemIndex=this.anchorItem.index;this.lastScreenItemIndex=lastScreenItem.index;if(delta<0){// 向上滚动 ⬆︎  runway代表滚动方向 当前可视区第一个元素为第20个 则需从序号 20-this.runwayItems 处开始补充
this.collectBottomDOMFlag=true;this._fill(this.anchorItem.index-this.runwayItems,lastScreenItem.index+this.runwayItemsOpposite);}else{// 初始化 或者向下滚动(向底部) ⬇︎
this._fill(this.anchorItem.index-this.runwayItemsOpposite,lastScreenItem.index+this.runwayItems);}}/**
   * Calculates the item that should be anchored after scrolling by delta from
   * the initial anchored item.
   * @param {{index: number, offset: number}} initialAnchor The initial position
   *     to scroll from before calculating the new anchor position.
   * @param {number} delta The offset from the initial item to scroll by.
   * @return {{index: number, offset: number}} Returns the new item and offset
   *     scroll should be anchored to.
   */},{key:'_calculateAnchoredItem',value:function _calculateAnchoredItem(initialAnchor,delta){if(delta==0)return initialAnchor;delta+=initialAnchor.offset;var i=initialAnchor.index;var tombstones=0;if(delta<0){while(delta<0&&i>0&&this._items[i-1].height){delta+=this._items[i-1].height;i--;}tombstones=Math.max(-i,Math.ceil(Math.min(delta,0)/this._tombstoneSize));}else{while(delta>0&&i<this._items.length&&this._items[i].height&&this._items[i].height<delta){delta-=this._items[i].height;i++;}if(i>=this._items.length||!this._items[i].height){tombstones=Math.floor(Math.max(delta,0)/this._tombstoneSize);// console.log('use _tombstoneSize', i, this._items.length, delta, tombstones);
}}i+=tombstones;delta-=tombstones*this._tombstoneSize;return{index:i,offset:delta};}/**
   * Sets the range of items which should be attached and attaches those items.
   * @param {number} start The first item which should be attached.
   * @param {number} end One past the last item which should be attached.
   */},{key:'_fill',value:function _fill(start,end){this.firstAttachedItemIndex=Math.max(0,start);this.lastAttachedItemIndex=end;this._attachContent();}/**
   * Create DOM nodes 内部方法
   */},{key:'_chreatDOM',value:function _chreatDOM(unusedNodesObj,i){// 需渲染的节点 已有DOM节点 则不处理
if(this._items[i].node){return;}// 需渲染的节点没有对应的DOM 执行渲染逻辑
var dom=null;if(this.reusingSelector){// 需要重用节点 则从unusedNodesObj中寻找可复用的节点
var templateType=this._items[i].data&&this._items[i].data[this.reusingSelector];if(unusedNodesObj[templateType]&&unusedNodesObj[templateType].length){// console.log('可复用');
dom=unusedNodesObj[templateType].pop();}}var node=this._source.render(this._items[i].data,dom);// Maybe don't do this if it's already attached?
node.style.position='absolute';this._items[i].top=-1;this._scroller.appendChild(node);this._items[i].node=node;}/**
   * Attaches content to the scroller and updates the scroll position if
   * necessary.
   * @param {string} from 触发attachContent方法的来源 如果是fetch回来的数据 则一次把dom高度全部计算出来
   */},{key:'_attachContent',value:function _attachContent(from){// Collect nodes which will no longer be rendered for reuse.
// TODO: Limit this based on the change in visible items rather than looping
// over all items.
var i;var unusedNodesObj={__defaultDOMResuingNodeType:[]};// 找出需要回收的节点
for(i=0;i<this._items.length;i++){// Skip the items which should be visible.
if(i==this.firstAttachedItemIndex){i=this.lastAttachedItemIndex-1;if(!this.collectBottomDOMFlag){// 如果刚加载完数据 且滚动方向向下 不回收底部的DOM
i=this._items.length;}continue;}if(this._items[i].node){// 根据模板类型回收
if(this.reusingSelector&&this._items[i].data[this.reusingSelector]){// 如果需要重用
var moduleType=this._items[i].data[this.reusingSelector];if(Object.prototype.toString.call(unusedNodesObj[moduleType])==='[object Array]'){unusedNodesObj[moduleType].push(this._items[i].node);}else{unusedNodesObj[moduleType]=[this._items[i].node];}}else{// 不需要重用
unusedNodesObj.__defaultDOMResuingNodeType.push(this._items[i].node);}}// 清理缓存数据里的node节点 只有可视区内 和上下预保留的 有node节点数据
this._items[i].node=null;}// Create DOM nodes.
// 加载更多来的数据 一次添加完毕
var endPoint=from==='fetch'?this._loadedItems:this.lastAttachedItemIndex;for(i=this.firstAttachedItemIndex;i<endPoint;i++){// this._items中总数据量不超过已加载的数据量 
if(i>=this._loadedItems){// 需要显示的节点index 大于 已有数据 提前终止循环
i=endPoint;break;}this._chreatDOM(unusedNodesObj,i);}// Remove all unused nodes
for(var i in unusedNodesObj){while(unusedNodesObj[i].length){this._scroller.removeChild(unusedNodesObj[i].pop());}}unusedNodesObj=null;// Get the height of all nodes which haven't been measured yet.
for(i=this.firstAttachedItemIndex;i<endPoint;i++){if(i>=this._loadedItems){break;}// Only cache the height if we have the real contents, not a placeholder.
if(this._items[i].data&&!this._items[i].height){this._items[i].height=this._items[i].node.offsetHeight;this._items[i].width=this._items[i].node.offsetWidth;}}// Fix scroll position in case we have realized the heights of elements
// that we didn't used to know.
// TODO: We should only need to do this when a height of an item becomes
// known above.
this.anchorScrollTop=0;for(i=0;i<this.anchorItem.index;i++){// if (i >= this._loadedItems) {
//   break;
// }
this.anchorScrollTop+=this._items[i].height||this._tombstoneSize;}this.anchorScrollTop+=this.anchorItem.offset;// Position all nodes.
// curPos 顶部补充元素+所有可视区元素+底部补充元素 的偏移    从第一个顶部补充元素的偏移开始
// 例如 拖动滚动条方向向下（触摸手势方向向上）
// 当前可视区第一个元素的index为10，则 curPos 为第 10-this.runwayItemsOpposite 元素的 translateY
var curPos=this.anchorScrollTop-this.anchorItem.offset;// 目前取的是 可视区内首个元素 距离可滑动列表顶部的距离  其实就是他的translateY
i=this.anchorItem.index;while(i>this.firstAttachedItemIndex){curPos-=this._items[i-1].height||this._tombstoneSize;i--;}while(i<this.firstAttachedItemIndex){curPos+=this._items[i].height||this._tombstoneSize;i++;}// Set up initial positions for animations.
for(i=this.firstAttachedItemIndex;i<endPoint;i++){if(i>=this._loadedItems){i=endPoint;break;}if(curPos!=this._items[i].top){this._items[i].node.style.transform='translateY('+curPos+'px)';}this._items[i].top=curPos;curPos+=this._items[i].height||this._tombstoneSize;}this._scrollRunwayEnd=Math.max(this._scrollRunwayEnd,curPos);// this._scroller.scrollTop = this.anchorScrollTop;
this._scroller.style.height=this._scrollRunwayEnd+'px';this._maybeRequestContent();}/**
   * Requests additional content if we don't have enough currently.
   */},{key:'_maybeRequestContent',value:function _maybeRequestContent(){var _this=this;// Don't issue another request if one is already in progress as we don't
// know where to start the next request yet.
if(this._requestInProgress)return;var itemsNeeded=this.lastAttachedItemIndex-this._loadedItems;if(itemsNeeded<=0)return;this._requestInProgress=true;this._source.fetch(itemsNeeded).then(function(item){if(item.length){_this._addContent(item);}});}/**
   * Adds an item to the items list.
   */},{key:'_addItem',value:function _addItem(){this._items.push({'data':null,'node':null,'height':0,'width':0,'top':0});}/**
   * Adds the given array of items to the items list and then calls
   * _attachContent to update the displayed content.
   * @param {Array<Object>} items The array of items to be added to the infinite
   *     scroller list.
   */},{key:'_addContent',value:function _addContent(items){this._requestInProgress=false;this.collectBottomDOMFlag=false;for(var i=0;i<items.length;i++){if(this._items.length<=this._loadedItems)this._addItem();this._items[this._loadedItems++].data=items[i];}this._attachContent('fetch');}},{key:'_updateContentPos',value:function _updateContentPos(begin,end,delta){for(var i=begin;i<end;i++){this._items[i].top=this._items[i].top+delta;if(this._items[i].node){this._items[i].node.style.transform='translateY('+this._items[i].top+'px)';}}}/**
   * 更新列表距离顶部的高度
   * @param {number} listMarginTop 非必须，更新后的列表距离顶端的高度，不传则直接计算
   */},{key:'resizeList',value:function resizeList(listMarginTop){listMarginTop=parseInt(listMarginTop,10);if(listMarginTop===listMarginTop){this.listMarginTop=listMarginTop;}else{this.listMarginTop=this._scroller.offsetTop;}}/**
   * 列表中某一项高度变化
   * @param {{itemIndex: number, info: {key: string, value: *}, newHeight: number}} changeInfo 
   * itemIndex 和 info必须有一项存在
   * itemIndex：变化元素在所有元素中的位置 如提供则优先使用itemIndex
   * info：找到变化项的必须信息，info.key表示数据源中的键名称，info.value表示数据源中的键值
   * height：非必须，如提供则使用此值来更新高度，否则找到对应DOM节点计算高度
   * TODO： 处理这条DOM已经被删除掉的情况
   */},{key:'resizeContent',value:function resizeContent(){var changeInfo=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var itemIndex=changeInfo.itemIndex,_changeInfo$info=changeInfo.info,info=_changeInfo$info===undefined?{}:_changeInfo$info,newHeight=changeInfo.newHeight;if(itemIndex==null&&(info.key==null||info.value==null)){console.warn('resizeContent缺乏必备更新信息');return;}if(itemIndex!=null){itemIndex=parseInt(itemIndex,10);}else{this._items.forEach(function(item,index){if(item.data[info.key]===info.value){itemIndex=index;return;}});}if(!this._items[itemIndex]){console.warn('resizeContent没有找到对应节点');return;}var totalItem=this._items.length;if(newHeight){var delta=newHeight-this._items[itemIndex].height;this._items[itemIndex].height=newHeight;this._updateContentPos(itemIndex+1,totalItem,delta);}}}]);return InfiniteScroller;}();/* harmony default export */ var src = (InfiniteScroller);
// CONCATENATED MODULE: ./src/view/demo/message.js
var defaultData=[{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyrcsrw5580875.d.html",id:"fyrcsrw5580875",title:"吴恩达：天下武功唯快不破，我的成功可以复制",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/pCXT-fyrcsrw5578386.jpg",intro:"去年夏天就被曝光的AI Fund，吴恩达愣是憋到如今才开口承认。",source:"量子位",authorID:"6105753431",cTime:1517472692,sourcepic:"https://tva3.sinaimg.cn/crop.0.0.200.200.50/006Fd7o3jw8fbw134ijknj305k05k3ye.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8220508.d.html",id:"fyreyvz8220508",title:"看不懂《恋与制作人》，是因为你没有少女心",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/RZu6-fyrcsrw5543327.jpg",intro:"少女心不是无知、幼稚、傻白甜，而是尝遍了世间冷暖，仍然愿意去相信一个美丽的梦境。",source:"触乐网",authorID:"3957040489",cTime:1517472260,sourcepic:"https://tva1.sinaimg.cn/crop.0.0.299.299.50/ebdba569jw1et5xb12eydj208c08c74n.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyrcsrw5504586.d.html",id:"fyrcsrw5504586",title:"砍单近半，iPhoneX为何开始不受欢迎了？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/kw78-fyrcsrw5503259.jpg",intro:"从今天的智能手机市场来看，过去一年智能手机首次呈现负增长，但这并不是最坏的时刻。",source:"王新喜",authorID:"1888089111",cTime:1517471716,sourcepic:"https://tva2.sinaimg.cn/crop.53.0.586.586.50/7089f417jw8fbmicm71pmj20hs0hswex.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8199090.d.html",id:"fyreyvz8199090",title:"百头大战背后的信息流江湖",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/wEyE-fyrcsrw5259061.jpg",intro:"一个标题+三幅图片+精准内容，足够将碎片化的时间偷走。",source:"刘兴亮",authorID:"1455643221",cTime:1517468755,sourcepic:"https://z4.sinaimg.cn/auto/resize?img=http://tvax1.sinaimg.cn/crop.0.0.996.996.50/56c35a55ly8ffc5ly69j5j20ro0rowg1.jpg&size=328_218"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyrcsrw5176159.d.html",id:"fyrcsrw5176159",title:"程浩:互联网下半场三大关键词",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/uSka-fyrcsrw5164585.jpg",intro:"我认为人口和流量红利消失，是中国互联网上半场跟下半场的分水岭。",source:"程浩",authorID:"5676714248",cTime:1517467837,sourcepic:"https://tva3.sinaimg.cn/crop.73.5.1888.1888.50/006caUHejw8evlryuun8kj31kw1ii7wh.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8190245.d.html",id:"fyreyvz8190245",title:"SNH48前成员亲述：站队、抑郁、撕逼 因陪酒饭局退团",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/57yN-fyrcsrw5106599.jpg",intro:"她面向窗台，背对着我，我轻轻按下拍摄键。只是不知道，此刻她看到的远方，是否还残存着曾经耀眼的梦想。",source:"娱乐资本论",authorID:"5159017394",cTime:1517467117,sourcepic:"https://www.sinaimg.cn/dy/zl/author/yulezibenlun/idx/2014/0611/U6161P1T935D150F24102DT20140611091132.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyrcsrw4135418.d.html",id:"fyrcsrw4135418",title:"我为什么不看好众筹民宿",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/c6fY-fyrcsrw4133271.jpg",intro:"单从投资角度看，普通投资者投资民宿众筹项目，最看重的因素是——较高的收益率。而民宿项目收益率吸引潜在投资者的原因一般有两个：真实、旅游行业景气度。",source:"苏宁金融研究院",authorID:"3819351799",cTime:1517454570,sourcepic:"https://tva4.sinaimg.cn/crop.0.0.180.180.50/e3a6aef7jw8e934bjx75lj20500500so.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8117622.d.html",id:"fyreyvz8117622",title:"#创事记年度作者#榜单公布",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/LvkS-fyrcsrw3861644.jpg",intro:"新闻事件如同水面上的浮冰，伴随着时间的流逝，轰然向前。但我们相信，记录与评论的意义不会随着事件的平息而消逝。",source:"创事记",authorID:"2907917243",cTime:1517451938,sourcepic:"https://z4.sinaimg.cn/auto/resize?img=http://tvax1.sinaimg.cn/crop.17.0.345.345.50/ad534bbbly1fhicpq3no8g20ak09lt9o.gif&size=328_218"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8108476.d.html",id:"fyreyvz8108476",title:"古天乐的“贪玩”直播，最后变成了300万人暗中观察",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/rkQY-fyrcsrw3749951.jpg",intro:"然而，这场直播却在观众的一片骂声中结束。",source:"ACGx",authorID:"5705024508",cTime:1517450344,sourcepic:"https://tva3.sinaimg.cn/crop.0.0.500.500.50/006e5Hukjw8eyde3ekpbvj30dw0dwmx7.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8090253.d.html",id:"fyreyvz8090253",title:"无人驾驶挺火，隔壁的机器蛇怎么样了？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/EQUS-fyrcsrw3479059.jpg",intro:"说不定某一天，我们会在街上随处可见机器蛇来完成各种工作。到那时候，不知道怕蛇的孩子们会有什么感想……",source:"脑极体",authorID:"6336727143",cTime:1517446082,sourcepic:"https://tva4.sinaimg.cn/crop.0.0.180.180.50/e3a6aef7jw8e934bjx75lj20500500so.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyrcsrw3454014.d.html",id:"fyrcsrw3454014",title:"有多少中产已经陷入“中等收入陷阱”？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180201/Zgxv-fyrcsrw3453228.jpg",intro:"之所以会有“中等收入陷阱”一说，最根本的原因在于人们的收入往往只能徘徊在中等水平却无法跨越，倘若能够突破收入瓶颈，成功跻身高收入行列，那一切压力也就不再是压力。",source:"苏宁金融研究院",authorID:"3819351799",cTime:1517445557,sourcepic:"https://tva4.sinaimg.cn/crop.0.0.180.180.50/e3a6aef7jw8e934bjx75lj20500500so.jpg"},{URL:"https://tech.sina.cn/csj/2018-02-01/doc-ifyreyvz8085491.d.html",id:"fyreyvz8085491",title:"新美大和滴滴，争的是一张千亿美元俱乐部门票",pic:"https://n.sinaimg.cn/tech/transform/w710h410/20180201/zxd4-fyrcsrw3411861.jpg",intro:"能否正确的认识扩张的意义及其边界，能否构建起自己的基本价值业务、并基于它获得主导性的用户入口地位，是拿到千亿美元市值俱乐部门票的关键。",source:"尹生",authorID:"1401101980",cTime:1517444621,sourcepic:"https://tva4.sinaimg.cn/crop.0.0.180.180.50/53831e9cjw1e8qgp5bmzyj2050050aa8.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyqyuhy7981810.d.html",id:"fyqyuhy7981810",title:"为什么是秋叶原成为了'秋叶原' 而不是其他区域？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/UnMx-fyrcsrw1649090.jpg",intro:"秋叶原，一个正经的电器街，慢慢成长为了“妖艳贱货”般的宅圈。这背后究竟是道德的沦丧还是人性的扭曲呢？",source:"三文娱",authorID:"5893582170",cTime:1517388416,sourcepic:"https://tva3.sinaimg.cn/crop.0.0.494.494.50/006qQRWWjw8f313a18xzqj30dq0dq3yt.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyqyuhy7966585.d.html",id:"fyqyuhy7966585",title:"艾诚专访盛希泰：如何从投行少帅到创投泰哥？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/22ff-fyrcsrw1433083.jpg",intro:"一个洪哥，一个泰哥，洪泰帮就此而生。",source:"艾诚",authorID:"1650493074",cTime:1517385221,sourcepic:"https://www.sinaimg.cn/cj/zl/management/idx/2014/0714/U10563P31T879D614F27039DT20140714104858.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyrcsrw1188298.d.html",id:"fyrcsrw1188298",title:"“BAT”之后，互联网创业现在也要站“TMD”的队了？",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/t_fw-fyrcsrw1187258.jpg",intro:"左右创业者命运的，除了BAT，现在TMD的影响似乎也正越来越重。",source:"歪道道",authorID:"2152848143",cTime:1517382486,sourcepic:"https://z0.sinaimg.cn/auto/resize?img=http://tvax4.sinaimg.cn/crop.0.25.1242.1242.50/8051db0fly8fne8gkcsjyj20yi0zxwl2.jpg&size=328_218"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyrcsrw1108827.d.html",id:"fyrcsrw1108827",title:"一文读懂印度互联网教育市场：存在4大结构性投资机会",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/oGEy-fyrcsrw1062837.jpg",intro:"从互联网教育背后的传统系统和非系统教育入手，探索中印教育行业各细分市场的发展现状与竞争格局，呈现印度互联网教育产业的整体发展图景，结合对比中印头部公司市值探讨印度互联网教育的投资价值与潜在投资标的。",source:"竺道",authorID:"6115605858",cTime:1517381716,sourcepic:"https://tva4.sinaimg.cn/crop.0.18.556.556.50/006FSssajw8fbw25j20o1j30go0gojrv.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyrcsrv9829123.d.html",id:"fyrcsrv9829123",title:"在CDN市场，腾讯、阿里与网宿终将“握手言和”",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/x7EU-fyrcsrv9826487.jpg",intro:"不逐利的资本不是好资本，不势利的券商不是好券商。",source:"波波夫",authorID:"1642254797",cTime:1517365795,sourcepic:"https://www.sinaimg.cn/zhuanlan/author/bobofu/idx/2016/1228/U12164P1493T24D2220F364DT20161228131250.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyrcsrv9623039.d.html",id:"fyrcsrv9623039",title:"迄今最全网络效应模型研究，一文看清顶级公司边界",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/vkEZ-fyrcsrv9620748.jpg",intro:"在互联网世界，连接是酶。因为连接产生聚集、产生规模、产生网络效应。",source:"红杉汇内参",authorID:"6013890910",cTime:1517363639,sourcepic:"https://z0.sinaimg.cn/auto/resize?img=http://tvax3.sinaimg.cn/default/images/default_avatar_female_50.gif&size=328_218"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyqyuhy7853977.d.html",id:"fyqyuhy7853977",title:"因为暴雪删了术士的生命虹吸，19岁少年创立了以太坊",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/jiYE-fyrcsrv9548751.jpg",intro:"今天是以太坊创始人维塔利克·布特林的24岁生日，转发此文章到朋友圈，你的微信钱包就会多出1枚价值7000多人民币的以太币。我已经试过了，是骗人的。",source:"游研社",authorID:"2634877355",cTime:1517362787,sourcepic:"https://tva4.sinaimg.cn/crop.112.0.266.266.50/9d0d09abjw8f48r8h0plhj20dw0dwgmg.jpg"},{URL:"https://tech.sina.cn/csj/2018-01-31/doc-ifyrcsrv9411757.d.html",id:"fyrcsrv9411757",title:"王健林的“好人缘”与腾讯的“收税权”",pic:"https://n.sinaimg.cn/tech/transform/w710h310/20180131/9SqW-fyrcsrv9410979.jpg",intro:"腾讯行的是收税之实，名义上却是个社交和游戏企业，所谓社交和游戏，是用来掩盖其收税的本质。",source:"悦涛",authorID:"1437874361",cTime:1517360134,sourcepic:"https://tva2.sinaimg.cn/crop.0.0.200.200.50/55b438b9jw8ezitkkacgvj205k05kmxh.jpg"}];/* harmony default export */ var message = (defaultData);
// EXTERNAL MODULE: ./src/css/index.css
var css = __webpack_require__(5);
var css_default = /*#__PURE__*/__webpack_require__.n(css);

// CONCATENATED MODULE: ./src/view/demo/stats.js
/**
 * @author mrdoob / http://mrdoob.com/
 */var Stats=function Stats(){var mode=0;var container=document.createElement('div');container.style.cssText='position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000';container.addEventListener('click',function(event){event.preventDefault();showPanel(++mode%container.children.length);},false);//
function addPanel(panel){container.appendChild(panel.dom);return panel;}function showPanel(id){for(var i=0;i<container.children.length;i++){container.children[i].style.display=i===id?'block':'none';}mode=id;}//
var beginTime=(performance||Date).now(),prevTime=beginTime,frames=0;var fpsPanel=addPanel(new Stats.Panel('FPS','#0ff','#002'));var msPanel=addPanel(new Stats.Panel('MS','#0f0','#020'));if(self.performance&&self.performance.memory){var memPanel=addPanel(new Stats.Panel('MB','#f08','#201'));}showPanel(0);return{REVISION:16,dom:container,addPanel:addPanel,showPanel:showPanel,begin:function begin(){beginTime=(performance||Date).now();},end:function end(){frames++;var time=(performance||Date).now();msPanel.update(time-beginTime,200);if(time>=prevTime+1000){fpsPanel.update(frames*1000/(time-prevTime),100);prevTime=time;frames=0;if(memPanel){var memory=performance.memory;memPanel.update(memory.usedJSHeapSize/1048576,memory.jsHeapSizeLimit/1048576);}}return time;},update:function update(){beginTime=this.end();},// Backwards Compatibility
domElement:container,setMode:showPanel};};Stats.Panel=function(name,fg,bg){var min=Infinity,max=0,round=Math.round;var PR=round(window.devicePixelRatio||1);var WIDTH=80*PR,HEIGHT=48*PR,TEXT_X=3*PR,TEXT_Y=2*PR,GRAPH_X=3*PR,GRAPH_Y=15*PR,GRAPH_WIDTH=74*PR,GRAPH_HEIGHT=30*PR;var canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;canvas.style.cssText='width:80px;height:48px';var context=canvas.getContext('2d');context.font='bold '+9*PR+'px Helvetica,Arial,sans-serif';context.textBaseline='top';context.fillStyle=bg;context.fillRect(0,0,WIDTH,HEIGHT);context.fillStyle=fg;context.fillText(name,TEXT_X,TEXT_Y);context.fillRect(GRAPH_X,GRAPH_Y,GRAPH_WIDTH,GRAPH_HEIGHT);context.fillStyle=bg;context.globalAlpha=0.9;context.fillRect(GRAPH_X,GRAPH_Y,GRAPH_WIDTH,GRAPH_HEIGHT);return{dom:canvas,update:function update(value,maxValue){min=Math.min(min,value);max=Math.max(max,value);context.fillStyle=bg;context.globalAlpha=1;context.fillRect(0,0,WIDTH,GRAPH_Y);context.fillStyle=fg;context.fillText(round(value)+' '+name+' ('+round(min)+'-'+round(max)+')',TEXT_X,TEXT_Y);context.drawImage(canvas,GRAPH_X+PR,GRAPH_Y,GRAPH_WIDTH-PR,GRAPH_HEIGHT,GRAPH_X,GRAPH_Y,GRAPH_WIDTH-PR,GRAPH_HEIGHT);context.fillRect(GRAPH_X+GRAPH_WIDTH-PR,GRAPH_Y,PR,GRAPH_HEIGHT);context.fillStyle=bg;context.globalAlpha=0.9;context.fillRect(GRAPH_X+GRAPH_WIDTH-PR,GRAPH_Y,PR,round((1-value/maxValue)*GRAPH_HEIGHT));}};};
// CONCATENATED MODULE: ./src/view/demo/index.js
var totalNum=0;var page=0;var stats=new Stats();function ContentSource(){// Collect template nodes to be cloned when needed.
this.tombstone_=document.querySelector(".j_tombstone");this.messageTemplate_=document.querySelector(".j_msg");this.messageTemplate2_=document.querySelector(".j_msg_2");}ContentSource.prototype={fetch:function fetch(){var self=this;return new Promise(function(resolve,reject){var localFakeData=JSON.parse(JSON.stringify(message));localFakeData.forEach(function(item,index){if(page==0&&index==1){}else{item.id=item.id+(new Date()-0);}item.title=page*20+index+', '+item.title;// item.fn = function() {
//   console.log(item.id);
// }
// 构造虚假模板选择
var randomNum=Math.random();if(randomNum<0.3){item.randomModule='type1';}else if(randomNum<0.7){item.randomModule='type2';}else{item.randomModule='type3';}});page=page+1;setTimeout(function(){if(page<=50){totalNum=totalNum+localFakeData.length;resolve(localFakeData);}else{resolve([]);}},500);}.bind(this));},render:function render(item,divObj){var templateType=item.randomModule;if(!divObj){if(templateType=="type1"){divObj=this.messageTemplate_.cloneNode(true);}else{divObj=this.messageTemplate2_.cloneNode(true);}}switch(templateType){case'type1':divObj=renderType1(item,divObj);break;case'type2':divObj=renderType2(item,divObj);break;case'type3':default:divObj=renderType2(item,divObj);}return divObj;}};function renderType1(item,div){div.dataset.id=item.id;item.pic&&(div.querySelector('.m_video_img_bg_img').src=item.pic);div.querySelector('.m_video_tit').textContent=item.title;return div;}function renderType2(item,div){div.dataset.id=item.id;item.pic&&(div.querySelector('.m_f_div > img').src=item.pic);div.querySelector('h2').textContent=item.title;div.querySelector('.m_f_con_add').textContent=item.source;div.querySelector('.m_f_con_com_n').textContent=Math.floor(100*Math.random());return div;}function numDomNodes(node){if(!node.children||node.children.length==0)return 0;var childrenCount=Array.from(node.children).map(numDomNodes);return node.children.length+childrenCount.reduce(function(p,c){return p+c;},0);}function domMonitor(){var domPanel=new Stats.Panel('DOM Nodes','#0ff','#002');stats.addPanel(domPanel);stats.showPanel(3);domPanel.dom.style.display='block';// ios手机上不显示、临时处理
document.body.appendChild(stats.dom);var TIMEOUT=100;setTimeout(function timeoutFunc(){// Only update DOM node graph when we have time to spare to call
// numDomNodes(), which is a fairly expensive function.
window.requestIdleCallback?requestIdleCallback(function(){domPanel.update(numDomNodes(document.body),1500);setTimeout(timeoutFunc,TIMEOUT);}):setInterval(function(){domPanel.update(numDomNodes(document.body),1500);},500);},TIMEOUT);}function totalAndFirstMonitor(){var numberPanel=new Stats.Panel('TotalNum','#0ff','#002');stats.addPanel(numberPanel);numberPanel.dom.style.display='block';var firstPanel=new Stats.Panel('FirstNum','#0ff','#002');stats.addPanel(firstPanel);firstPanel.dom.style.display='block';window.addEventListener('scroll',function(){numberPanel.update(totalNum,600);firstPanel.update(feedScroller.firstScreenItemIndex,600);// console.log(feedScroller.firstAttachedItemIndex, feedScroller.lastAttachedItemIndex);
});}document.addEventListener('DOMContentLoaded',function(){var feedList=document.querySelector('#container');var feedScrollerConfig={reusingSelector:'randomModule'};window.feedScroller=new src(feedList,new ContentSource(),feedScrollerConfig);domMonitor();totalAndFirstMonitor();});function changeSecHeight(){console.log('改变第二条高度为200px');var secA=document.querySelector('[data-id="fyreyvz8220508"]');secA.style.height='200px';feedScroller.resizeContent({itemIndex:1,newHeight:200});}function changeLishTop(){console.log('改变List距离顶部高度');var topDOM=document.querySelector('#top');topDOM.style.height='400px';feedScroller.resizeList();}window.changeSecHeight=changeSecHeight;window.changeLishTop=changeLishTop;

/***/ }),
/* 5 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })
/******/ ]);