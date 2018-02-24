import {
  $
} from '@mfelibs/base-utils'

class statusTools {
  constructor() {
    this.wrapper = null;
    this.allItems = {}
    this.init();
  }
  init() {
    let wrapper = $('#j_status_tools');
    if (!wrapper.length) {
      this.wrapper = $('<div id="j_status_tools" style="position:fixed; top:0; right:0; max-height:200px;min-height:50px; width:200px; background:rgba(45, 67, 72, 0.8);padding: 0 5px;z-index: 9999;"></div>');
      $(document.body).append(this.wrapper);
    } else {
      this.wrapper = wrapper;
    }
  }
  addItem(id, msg) {
    let selector = 'j_status_p___' + id;
    if (!$('#' + selector).length) {
      let item = $('<p id="j_status_p___' + id + '" style="color:#0cd8d4;font-size: 13px;">' + id + ': <span class="j_' + id + '"></span></p>');
      this.wrapper.append(item);
      this.allItems[id] = item;
      if (msg != null) {
        this.allItems[id].find('.j_' + id).text(msg);
      }
    } else {
      this.updateItem(id, msg);
    }
  }
  updateItem(id, msg) {
    if (this.allItems[id] && msg != null) {
      this.allItems[id].find('.j_' + id).text(msg);
    }
  }
}

export default statusTools