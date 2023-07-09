// ==UserScript==
// @name         豆瓣小组功能增强-v2
// @version      0.1.3.1
// @license      MIT
// @namespace    https://evalcony.github.io/
// @description  豆瓣小组功能增强：指定用户回帖屏蔽；指定用户发帖屏蔽；在帖子内对指定用户高亮；高亮包含指定关键字的帖子；隐藏包含指定关键字的帖子；去除标题省略号，展示全部文本；新标签页打开帖子;展示是否是楼主的标识;展示楼层号；淡化已读帖子标题；增加帖子内内容跳转主的标识;展示楼层号；淡化已读帖子标题；增加帖子内内容跳转。PS：在原作者 tcatche 版本基础上，添加新功能，特此声明。
// 原作者@author       tcatche
// @author		 evalcony
// @match        https://www.douban.com/group/*
// @homepageURL  https://github.com/evalcony/douban-group-enhance
// @supportURL   https://github.com/evalcony/douban-group-enhance/issues
// @downloadURL  https://github.com/evalcony/douban-group-enhance/blob/master/index.js
// @updateURL    https://github.com/evalcony/douban-group-enhance/blob/master/index.js
// @grant        none
// ==/UserScript==
(function() {
  const utils = {
    // save user config
    saveConfig: config => {
      const configString = JSON.stringify(config);
      localStorage.setItem('douban_group_enhance_config', configString);
    },
    // load user config
    getConfig: () => {
      const configString = localStorage.getItem('douban_group_enhance_config');
      const oldConfigString = localStorage.getItem('douban_group_filter_config');
      try {
        const config = JSON.parse(configString || oldConfigString);
        return config;
      } catch (e) {
        return {};
      }
    },
    bindedEles: [],
    bindClick: function(selector, callback) {
      this.bindedEles.push(selector);
      $(selector).click(callback);
    },
    unbindClick: (selector) => {
      $(selector).unbind();
    },
    unbindAllClick: function() {
      this.bindedEles.forEach(selector => {
        $(selector).click(callback);
      })
    }
  }
  const createEnhancer = () => {

    // run user filters
    const runFilter = (config, self) => {
      const title = self.attr('title') || '';
      const isInInclude = title => (config.include || []).find(keyword => title.indexOf(keyword) >= 0);
      const isInDeclude = title => (config.declude || []).find(keyword => title.indexOf(keyword) >= 0);
      const isTitleInInclude = isInInclude(title);
      const isTitleInDeclude = isInDeclude(title);
      if (isTitleInInclude && !isTitleInDeclude) {
        self.addClass('douban_group_enhance_highlight');
      }
      if (isInDeclude(title)) {
        self.parents('tr').hide();
      }
    }

    // open in new tab
    const runOpenInNewTab = (config, self) => {
      if (config.openInNewTab) {
        self.attr('target', '_blank');
      }
    }

    // show full title without cliped!
    const runShowFullTitle = (config, self) => {
      if (config.showFullTitle) {
        const title = self.attr('title') || self.text();
        self.text(title);
      }
    }

    // run fade visited topic
    const runFadeVisitedTitle = config => {
      if (config.fadeVisited) {
        if ($('#fadeVisitedStyle').length === 0) {
          $('body').append(`
            <style id="fadeVisitedStyle" class="douban_group_added">
              .topics .td-subject a:visited,
              .title a:visited {
                color: #ddd
              }
              .douban_group_enhance_highlight:visited{
                color: #ddd;
                background: #ccc;
              }
            </style>
          `);
        }
      } else {
        $('#fadeVisitedStyle').remove();
      }
    }

    // show reply number
    const runShowReplyNumber = (options, self, index) => {
      if (options.config.showReplyNumber) {
        const replyHead = self.find('h4')[0];
        const isInserted = $(replyHead).find('.douban_group_enhance_replay_number').length > 0;
        if (!isInserted) {
          const start = +(options.params.start || 0);
          const replayNumber = start + 1 + index;
          $(replyHead).append(`<span class="douban_group_enhance_replay_tag douban_group_enhance_replay_number douban_group_added">${replayNumber}楼</span>`);
        }
      } else {
        $('.douban_group_enhance_replay_number').remove();
      }
    }

    // show if is topic owner
    const runShowOwnerTag = (options, self) => {
      if (options.config.showOwnerTag) {
        const replyHead = self.find('h4')[0];
        const isInserted = $(replyHead).find('.douban_group_enhance_owner_tag').length > 0;
        if (!isInserted) {
          const replyName = self.find('h4 a').text().trim();
          if (replyName === options.topicUser) {
            $(replyHead).append('<span class="douban_group_enhance_replay_tag douban_group_enhance_owner_tag douban_group_added">楼主</span>');
          }
        }
      } else {
        $('.douban_group_enhance_owner_tag').remove();
      }
    }

    // filt user
    const runFiltUser = (config) => {
      $('.olt tr td:nth-child(2) a').each(function() {
          const $this = $(this)
          var user = $this.text() || $this.innerText
          const isBlackUser = name => (config.blackUserList || []).find(keyword => name.indexOf(keyword) >= 0);
          if (isBlackUser(user)) {
            console.log("屏蔽首页发帖:" + user);
            $this.parents('tr').hide();
          }
        })
    }

    // filt user in black list
    const runFilterBlackUser = (config, self) => {
      const userName = self.find('h4 a')[0].innerText;
      const isBlackUser = name => (config.blackUserList || []).find(keyword => name.indexOf(keyword) >= 0);
      if (isBlackUser(userName)) {
        console.log("屏蔽发帖人: " + userName);
        self.hide();
        return;
      }


      var replyQuote = self.find('.reply-quote');
      if (replyQuote != null) {
        var pubdate = replyQuote.find('.reply-quote-content .pubdate a')
        const replyedUserName = pubdate.innerText || pubdate.text();
        if (isBlackUser(replyedUserName)) {
          console.log("屏蔽回复: " + replyedUserName);
          self.hide();
          return;
        }
      }
    }

    // hightlight user 将帖子内的指定用户名高亮
    const runHightlightUser = (config, self) => {
      const userName = self.find('h4 a')[0].innerText;
      const isHightlightUser = name => (config.highlightUserList || []).find(keyword => name.indexOf(keyword) >= 0);
      if (isHightlightUser(userName)) {
        console.log("高亮发帖人: " + userName);
        self.find('h4 a').addClass('douban_group_enhance_highlight');
        return;
      }


      const replyQuote = self.find('.reply-quote');
      if (replyQuote != null) {
        var pubdate = replyQuote.find('.reply-quote-content .pubdate a')
        const replyedUserName = pubdate.innerText || pubdate.text();
        if (isHightlightUser(replyedUserName)) {
          console.log("高亮回复: " + replyedUserName);
          pubdate.addClass('douban_group_enhance_highlight');
          return;
        }
      }
    }

    // add jump to top, comments and pager button
    const runAddJumptoButton = options => {
      if (options.config.jumpTo) {
        const isAdded = $('#douban_group_enhance_jump').length > 0;
        if (!isAdded) {
          $(document.body).append(`
            <div id="douban_group_enhance_jump" class="douban_group_enhance_jump douban_group_added">
              跳转到:
              <span class="douban_group_enhance_jump_target douban_group_enhance_jump_target_title">标题</span>/
              <span class="douban_group_enhance_jump_target douban_group_enhance_jump_target_comments">评论</span>/
              <span class="douban_group_enhance_jump_target douban_group_enhance_jump_target_end">页尾</span>
            </div>
          `);
          setTimeout(() => {
            utils.bindClick('.douban_group_enhance_jump_target_title', e => {
              $('h1')[0].scrollIntoView({behavior: 'smooth'});
            });
            utils.bindClick('.douban_group_enhance_jump_target_comments', e => {
              $('.topic-reply ')[0].scrollIntoView({behavior: 'smooth'});
            });
            utils.bindClick('.douban_group_enhance_jump_target_end', e => {
              $('#footer')[0].scrollIntoView({behavior: 'smooth'});
            });
          }, 0)
        }
      } else {
        $('.douban_group_enhance_jump').remove();
      }
    }

    // run remove google ads
    const runRemoveAd = options => {
      if (options.config.removeAd) {
        setTimeout(function() {
          $('[ad-status]').remove()
        })
      }
    }

    const runEnhancer = config => {
      const isTopicDetailPage = location.pathname.indexOf('/group/topic/') >= 0;
      const search = location.search  ? location.search.substr(1) : '';
      const params = {};
      search.split('&').filter(v => !!v).map(item => {
        const items = item.split('=');
        if (items.length >= 1) {
          params[items[0]] = items[1];
        }
      });
      const global = {
        config: config,
        params: params,
      };

      runRemoveAd(global);

      if (isTopicDetailPage) {
        // 帖子内容
        $('#comments li').each(function(index) {
          global.topicUser = $('.topic-doc .from > a').text().trim();
          const $this = $(this);
          runShowReplyNumber(global, $this, index);
          runShowOwnerTag(global, $this);
          runFilterBlackUser(config, $this); // 帖子内屏蔽用户
          runHightlightUser(config, $this); // 帖子内高亮用户
        });
        runAddJumptoButton(global);
      }
      else {
        // 帖子列表
        $('.olt .title a').each(function() {
          const $this = $(this);
          runFilter(config, $this);
          runOpenInNewTab(config, $this);
          runShowFullTitle(config, $this);
        });
        // 帖子列表-作者
        runFiltUser(config); // 帖子列表屏蔽用户

        runFadeVisitedTitle(config);
      }
    }
    // init form elements
    const initDom = () => {
      // init config dom
      let configDivHtml = `
        <div id="douban_group_enhance_container" class="douban_group_enhance douban_group_added">
          <div class="douban_group_enhance_mask"></div>
          <div class="douban_group_enhance_inner">
            <div class="douban_group_enhance_inner_content">
              <h1>小组优化设置</h1>
              <h2>通用设置</h2>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="removeAd" value="1">
                勾选则去广告
              </div>
              <h2>帖子列表页优化</h2>
              <div class="douban_group_enhance_config_block">请填入要高亮的关键字，多个关键字用空格隔开：</div>
              <textarea placeholder="请填入要高亮的关键字，多个关键字用空格隔开"></textarea>
              <br />
              <div class="douban_group_enhance_config_block">请填入要排除的关键字，多个关键字用空格隔开：</div>
              <textarea placeholder="请填入要排除的关键字，多个关键字用空格隔开 "></textarea>
              <div class="douban_group_enhance_config_block">请填入要屏蔽的用户名，多个用户名用空格隔开：</div>
              <textarea placeholder="请填入要屏蔽的用户名，多个用户名用空格隔开"></textarea>
              <div class="douban_group_enhance_config_block">请填入要高亮的用户名，多个用户名用空格隔开：</div>
              <textarea placeholder="请填入要高亮的用户名，多个用户名用空格隔开"></textarea>
              
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="openInNewTab" value="1">
                勾选则使用新标签打开帖子
              </div>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="showFullTitle" value="1">
                勾选则去除标题省略号，显示完整标题
              </div>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="fadeVisited" value="1">
                勾选则淡化已经访问过的帖子标题（无痕/隐私模式下不生效）
              </div>

              <h2>帖子主题页优化</h2>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="showReplyNumber" value="1">
                勾选则显示帖子里回复的楼层号
              </div>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="showOwnerTag" value="1">
                勾选则为楼主添加“楼主”的标签
              </div>
              <div class="douban_group_enhance_config_block">
                <input type="checkbox" id="jumpTo" value="1">
                勾选则添加跳转到标题、评论、页码位置的按钮(在屏幕左下角)
              </div>
              <p class="douban_group_enhance_buttons">
                <button id="douban_group_enhance_sure" class="douban_group_enhance_button">确定</button>
                <button id="douban_group_enhance_cancel" class="douban_group_enhance_button" >取消</button>
              </p>
            </div>
          </div>
        </textarea>
      `;
      let styleHtml = `
        <style id="douban_group_enhance_style" class="douban_group_added">
          .douban_group_enhance_config {
            color: #ca6445;
            padding: 5px 20px;
            font-size: 13px;
            background: #fae9da;
            font-weight: normal;
            cursor: pointer;
          }
          .douban_group_enhance {
            width: 100vw;
            height: 100vh;
            position: absolute;
            top: 0;
            left: 0;
            display:none;
          }
          .douban_group_enhance_mask {
            position: absolute;
            background: rgba(0,0,0,.6);
            width: 100%;
            height: 100%;
            z-index: 99;
          }
          .douban_group_enhance_inner {
            width: 500px;
            text-align: center;
            margin: auto;
            top: 100px;
            position: relative;
            background: #fff;
            padding: 30px;
            height: 300px;
            overflow: auto;
            z-index: 100;
          }
          .douban_group_enhance_config_block {
            margin-top: 5px;
          }
          .douban_group_enhance_inner_content {
            text-align: left;
          }
          .douban_group_enhance_inner_content h1 {
            padding: 0;
          }
          .douban_group_enhance_inner_content h2 {
            color: #037b82;
            margin-top: 20px;
          }
          .douban_group_enhance_inner textarea {
            width: 100%;
            height: 60px;
            resize: auto;
            resize: vertical;
            min-height: 50px;
            padding: 10px;
          }
          .douban_group_enhance_inner textarea:focus {
            border: 1px solid #072;
            box-shadow: 0px 0px 1px 0px #072;
          }
          .douban_group_enhance_buttons {
            float: right;
          }
          a.douban_group_enhance_highlight {
            background: #037b82;
            color: #fff;
          }
          .douban_group_enhance_replay_tag {
            float: right;
            color: #666;
            padding: 0 5px;
          }
          .douban_group_enhance_button {
            padding: 5px 20px;
            font-size: 13px;
            border: 1px solid #037b82;
            color: #037b82;
            background-color: #f0f6f3;
            font-weight: normal;
            cursor: pointer;
          }
          .douban_group_enhance_button:hover {
            background-color: #037b82;
            color: #fff;
          }
          .douban_group_enhance_jump {
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: #f0f6f3;
            border-radius: 2px;
            padding: 6px;
          }
          .douban_group_enhance_jump_target {
            cursor: pointer;
            color: #037b82;
            padding-right: 5px;
          }
          .douban_group_enhance_jump_target:hover {
            font-weight: bold;
          }
        </style>
      `;
      $(document.body).append(configDivHtml);
      $(document.body).append(styleHtml);

      // init config btn
      const insertPos = $('#db-global-nav .top-nav-doubanapp');
      if (insertPos && insertPos[0]) {
        $(insertPos[0]).after('<div id="douban_group_enhance_config" class="top-nav-doubanapp douban_group_added"><span class="douban_group_enhance_button">小组增强插件设置</span></div>');
      }
    }
    // init dom events
    const initDomEvents = () => {
      const $contain = $('#douban_group_enhance_container');
      const $body = $(document.body);
      // bind events
      utils.bindClick('#douban_group_enhance_config', e => {
        $contain.show();
        $body.css('overflow', 'hidden');
      });
      utils.bindClick('#douban_group_enhance_cancel', e => {
        $contain.hide();
        $body.css('overflow', 'initial');
      });
      utils.bindClick('.douban_group_enhance_mask', e => {
        $contain.hide();
        $body.css('overflow', 'initial');
      });
      utils.bindClick('#douban_group_enhance_sure', e => {
        const config = {
          include: $('#douban_group_enhance_container textarea')[0].value.split(' ').filter(v => !!v),
          declude: $('#douban_group_enhance_container textarea')[1].value.split(' ').filter(v => !!v),
          blackUserList: $('#douban_group_enhance_container textarea')[2].value.split(' ').filter(v => !!v),
          highlightUserList: $('#douban_group_enhance_container textarea')[3].value.split(' ').filter(v => !!v),
          openInNewTab: $('#openInNewTab')[0].checked,
          showFullTitle: $('#showFullTitle')[0].checked,
          showReplyNumber: $('#showReplyNumber')[0].checked,
          showOwnerTag: $('#showOwnerTag')[0].checked,
          fadeVisited: $('#fadeVisited')[0].checked,
          jumpTo: $('#jumpTo')[0].checked,
          removeAd: $('#removeAd')[0].checked,
        }
        utils.saveConfig(config);
        runEnhancer(config);
        $contain.hide();
        $body.css('overflow', 'initial');
      });
    }
    // init form values
    const initDomValue = config => {
      $('#douban_group_enhance_container textarea')[0].value = (config.include || []).join(' ');
      $('#douban_group_enhance_container textarea')[1].value = (config.declude || []).join(' ');
      $('#douban_group_enhance_container textarea')[2].value = (config.blackUserList || []).join(' ');
      $('#douban_group_enhance_container textarea')[3].value = (config.highlightUserList || []).join(' ');
      $('#openInNewTab')[0].checked = config.openInNewTab;
      $('#showFullTitle')[0].checked = config.showFullTitle;
      $('#showReplyNumber')[0].checked = config.showReplyNumber;
      $('#showOwnerTag')[0].checked = config.showOwnerTag;
      $('#fadeVisited')[0].checked = config.fadeVisited;
      $('#jumpTo')[0].checked = config.jumpTo;
      $('#removeAd')[0].checked = config.removeAd;
    }
    const init = () => {
      const config = utils.getConfig() || {};
      initDom();
      initDomValue(config);
      initDomEvents();
      runEnhancer(config);
    }
    const destory = () => {
      // remove dom events
      utils.unbindAllClick();
      // remove all added elements
      $('#.douban_group_added').remove();
    }
    return {
      init,
      destory,
      // 版本控制
      _version: '0.1.3.1'
    }
  }

  // init
  if (window.doubanEnhancer) {
    const enhancer = createEnhancer();
    if (!doubanEnhancer._version) {
      doubanEnhancer._version = '0'
    }
    if (window.doubanEnhancer._version < enhancer._version) {
      if (doubanEnhancer.destory) {
        doubanEnhancer.destory();
      }
      window.doubanEnhancer = enhancer;
      doubanEnhancer.init();
    }
  } else {
    window.doubanEnhancer = createEnhancer();
    doubanEnhancer.init();
  }
})();