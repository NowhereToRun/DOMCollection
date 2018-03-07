import InfiniteScroller from '../../index';
import fakeData from './message';
import '../../css/index.css';
import Stats from './stats.js'
var totalNum = 0;
var page = 0;
var stats = new Stats();

function ContentSource() {
  // Collect template nodes to be cloned when needed.
  this.tombstone_ = document.querySelector(".j_tombstone");
  this.messageTemplate_ = document.querySelector(".j_msg");
  this.messageTemplate2_ = document.querySelector(".j_msg_2");
}

ContentSource.prototype = {
  fetch: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      let localFakeData = JSON.parse(JSON.stringify(fakeData))
      localFakeData.forEach((item, index) => {
        if (page == 0 && index == 1) {

        } else {
          item.id = item.id + (new Date() - 0);
        }
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
      })
      page = page + 1;

      setTimeout(function() {
        if (page <= 50) {
          totalNum = totalNum + localFakeData.length;
          resolve(localFakeData);
        } else {
          resolve([]);
        }
      }, 500);
    }.bind(this));
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

function domMonitor() {
  var domPanel = new Stats.Panel('DOM Nodes', '#0ff', '#002');
  stats.addPanel(domPanel);
  stats.showPanel(3);
  domPanel.dom.style.display = 'block'; // ios手机上不显示、临时处理
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
}

function totalAndFirstMonitor() {
  var numberPanel = new Stats.Panel('TotalNum', '#0ff', '#002');
  stats.addPanel(numberPanel);
  numberPanel.dom.style.display = 'block';

  var firstPanel = new Stats.Panel('FirstNum', '#0ff', '#002');
  stats.addPanel(firstPanel);
  firstPanel.dom.style.display = 'block';

  window.addEventListener('scroll', function() {
    numberPanel.update(totalNum, 600);
    firstPanel.update(feedScroller.firstScreenItemIndex, 600);
    // console.log(feedScroller.firstAttachedItemIndex, feedScroller.lastAttachedItemIndex);
  })
}

document.addEventListener('DOMContentLoaded', function() {
  const feedList = document.querySelector('#container');
  let feedScrollerConfig = {
    reusingSelector: 'randomModule'
  };
  window.feedScroller = new InfiniteScroller(feedList, new ContentSource(), feedScrollerConfig);

  domMonitor();
  totalAndFirstMonitor();
});

function changeSecHeight() {
  console.log('改变第二条高度为200px');
  const secA = document.querySelector('[data-id="fyreyvz8220508"]');
  secA.style.height = '200px';
  feedScroller.resizeContent({
    itemIndex: 1,
    newHeight: 200
  });
}

function changeLishTop() {
  console.log('改变List距离顶部高度');
  const topDOM = document.querySelector('#top');
  topDOM.style.height = '400px';
  feedScroller.resizeList();
}
window.changeSecHeight = changeSecHeight;
window.changeLishTop = changeLishTop;