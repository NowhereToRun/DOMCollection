import InfiniteScroller from '../../index';
import fakeData from './message';
import '../../css/index.css';
import Stats from './stats.js'

import {
  $
} from '@mfelibs/base-utils'
import tools from './tools'
var statusPanel = new tools();
var totalNum = 0;

var INIT_TIME = new Date().getTime();
var page = 0;

function ContentSource() {
  // Collect template nodes to be cloned when needed.
  this.tombstone_ = document.querySelector(".j_tombstone");
  this.messageTemplate_ = document.querySelector(".j_msg");
  this.messageTemplate2_ = document.querySelector(".j_msg_2");
  this.nextItem_ = 0;
  this.noData = 0; // 测试使用  避免多次请求空接口
}

ContentSource.prototype = {
  fetch: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      let localFakeData = JSON.parse(JSON.stringify(fakeData))
      localFakeData.forEach((item, index) => {
        item.id = item.id + (new Date() - 0);
        item.title = page * 20 + index + ', ' + item.title;
        // item.fn = function() {
        //   console.log(item.id);
        // }
        // 构造虚假模板选择
        var randomNum = Math.random();
        if (randomNum < 0.3) {
          item.randomModule = 'type1'
        } else if (randomNum < 0.7) {
          item.randomModule = 'type2'
        } else {
          item.randomModule = 'type3'
        }
        item.randomModule = 'type2'
      })
      page = page + 1;

      setTimeout(function() {
        if (page <= 10) {
          totalNum = totalNum + localFakeData.length;
          statusPanel.addItem('Total_data_number', totalNum);
          resolve(localFakeData);
        } else {
          resolve([]);
        }
      }, 1500);
      // }

    }.bind(this));
  },

  createTombstone: function() {
    return this.tombstone_.cloneNode(true);
  },

  render: function(item, divObj) {
    var templateType = item.randomModule;
    if (!divObj) {
      if (templateType == "type1") {
        divObj = this.messageTemplate_.cloneNode(true);
      } else {
        divObj = this.messageTemplate2_.cloneNode(true);
      }
    }

    switch (templateType) {
      case 'type1':
        divObj = renderType1(item, divObj);
        break;
      case 'type2':
        divObj = renderType2(item, divObj);
        break;
      case 'type3':
      default:
        divObj = renderType2(item, divObj);
    }
    return divObj;
  },
};

function renderType1(item, div) {
  div.dataset.id = item.id;
  item.pic && (div.querySelector('.m_video_img_bg_img').src = item.pic)
  div.querySelector('.m_video_tit').textContent = item.title;
  return div
}

function renderType2(item, div) {
  div.dataset.id = item.id;
  item.pic && (div.querySelector('.m_f_div > img').src = item.pic)
  div.querySelector('h2').textContent = item.title;
  div.querySelector('.m_f_con_add').textContent = item.source;
  div.querySelector('.m_f_con_com_n').textContent = Math.floor(100 * Math.random());
  return div
}

function numDomNodes(node) {
  if (!node.children || node.children.length == 0)
    return 0;
  var childrenCount = Array.from(node.children).map(numDomNodes);
  return node.children.length + childrenCount.reduce(function(p, c) {
    return p + c;
  }, 0);
}

document.addEventListener('DOMContentLoaded', function() {
  window.scroller =
    new InfiniteScroller(
      document.querySelector('#container'),
      new ContentSource(), {
        tombstoneClassName: 'j_tombstone',
        scrollRunway: 0,
        moduleOffsetTop: 200
      }
    );

  var stats = new Stats();
  var domPanel = new Stats.Panel('DOM Nodes', '#0ff', '#002');
  stats.addPanel(domPanel);
  stats.showPanel(3);
  $(domPanel.dom).show(); // ios手机上不显示、临时处理
  document.body.appendChild(stats.dom);
  var TIMEOUT = 100;
  setTimeout(function timeoutFunc() {
    // Only update DOM node graph when we have time to spare to call
    // numDomNodes(), which is a fairly expensive function.
    window.requestIdleCallback ?
      requestIdleCallback(function() {
        domPanel.update(numDomNodes(document.body), 1500);
        setTimeout(timeoutFunc, TIMEOUT);
      }) :
      setInterval(function() {
        domPanel.update(numDomNodes(document.body), 1500)
      }, 500)
  }, TIMEOUT);


});