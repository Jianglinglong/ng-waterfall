(function() {
    'use strict';

    angular.module('ng-waterfall', []).directive('waterFall', ['$compile', '$http', function($compile, $http) {
        return {
            restrict: 'EA',
            scope: {
                autoLoad: '@',
                boxColumn: '@',
                boxClass: '@',
                boxSpace: '@',
                boxWidth: '@',
                fixedRatio: '@',
                loadStep: '@',
                initStep: '@',
                customTips: '@',
                tagName: '=?',
                showTips: '=?',
                toggleShow: '@',
                detectPartial: '@',
                jsonData: '=?',
                jsonUrl: '@'
            },
            link: function(scope, element) {
                var $window = $(window);
                var $body = $(document.body);

                scope.init = function() {
                    scope.config = {
                        container: 1, //瀑布流适应模式。1：适应自身容器宽度，0：适应浏览器宽度
                        load: scope.autoLoad ? scope.autoLoad - 0 : 0, //加载模式。1：滚动自动加载；0：手动点击加载。可选，默认值：0
                        fluid: scope.boxColumn ? scope.boxColumn - 0 : 4, //格子布局模式。n：固定n列，宽度自适应；0：固定宽度(css设定)，列数自适应。可选，默认值：4
                        class: scope.boxClass || 'box', //格子样式名称。字符串，可选，默认值：'box'
                        space: scope.boxSpace ? scope.boxSpace - 0 : 10, //格子间距。数值，可选，默认值：10
                        ratio: scope.fixedRatio ? scope.fixedRatio - 0 : 0, //格子长宽比。数值，可选，默认值：0（自适应原始比例）
                        step: scope.loadStep ? scope.loadStep - 0 : 30, //每次动态加载的格子数。数值，可选，默认值：30
                        init: scope.initStep ? scope.initStep - 0 : (scope.loadStep ? scope.loadStep - 0 : 30), //初始化加载的格子数。数值，可选，默认值：同上（loadStep）
                        customTip: scope.customTips ? scope.customTips - 0 : 0, //是否使用自定义的提示内容。1/0，可选，默认值：0
                        toggle: scope.toggleShow ? scope.toggleShow - 0 : 0, //是否支持可视范围内动态切换图片。1/0，可选，默认值：0
                        detect: scope.detectPartial ? scope.detectPartial - 0 : 0, //可视判断方式。1：部分进入为可视，0：整体进入为可视。上项（toggleShow）为ture时有效，可选，默认值：0
                        jsonUrl: scope.jsonUrl || '' //动态数据加载地址。字符串（url地址）。以上两项最少提供一个
                    };

                    scope.baseWrap = element;
                    scope.baseBoxList = []; //已排列的格子列表
                    scope.boxNow = 0; //记录当前总共有多少个格子
                    scope.heightList = []; //记录每列的高度
                    scope.cursor = ''; //当前翻页指针，通过服务器透传获取，初始为空
                    scope.showTips = false; //自定义提示内容判断参数。对象（提供后，在自定义提示代码上用ng-if做判断）
                    scope.jsonData = scope.jsonData || []; //原始数据。对象（json格式）
                    scope.doLoad();
                    scope.doResize();
                    scope.doScroll();
                };
                scope.min = function(array) {
                    return Math.min.apply(Math, array);
                };
                scope.max = function(array) {
                    return Math.max.apply(Math, array);
                };
                // 返回数组中某一值的对应项索引值
                scope.getArrayKey = function(arr, val) {
                    for (var key in arr) {
                        if (arr[key] === val) {
                            return key;
                        }
                    }
                };
                // 请求远程数据
                scope.requestData = function(initLen) {
                    if (!scope.config.load) {
                        scope.loading();
                    }
                    scope.loading('loading', 'loading');

                    $http.get(scope.config.jsonUrl, {
                        tag: scope.tagName || '',
                        count: initLen || scope.config.step,
                        cursor: scope.cursor
                    }).then(function(response) {
                        scope.loading();
                        var result = response.data;
                        if (result && result.total > 0) {
                            scope.cursor = result.next_cursor || '';
                            var arr = [];
                            angular.forEach(result.result, function(item) {
                                arr.push({
                                    mediaId: item.index,
                                    name: item.index,
                                    width: item.width,
                                    height: item.height,
                                    image: item.image,
                                    media: item.media
                                });
                            });
                            scope.jsonData = scope.jsonData.concat(arr);
                            scope.addMoreBox(scope.baseWrap, scope.jsonData, initLen);
                            scope.scrollTime = true;
                            if (scope.cursor && !scope.config.load) {
                                scope.loading('Load more', 'load');
                            }
                        } else {
                            if (scope.config.customTip) {
                                scope.showTips = true;
                            }
                            scope.baseWrap.css({
                                'visibility': 'visible',
                                'width': 'auto'
                            });
                            if (scope.jsonData.length === 0) {
                                if (!scope.config.customTip) {
                                    scope.loading('Sorry,no result found.', 'noresult');
                                }
                            } else {
                                scope.loading();
                            }
                        }
                    }, function() {
                        scope.loading();
                        if (scope.config.customTip) {
                            scope.showTips = true;
                        } else {
                            scope.loading('Sorry,no result found.', 'noresult');
                        }
                        scope.baseWrap.css({
                            'width': 'auto',
                            'visibility': 'visible'
                        });
                    });
                };
                // 生成批量格子
                scope.addMoreBox = function(obj, json, init) {
                    obj.removeClass('active');
                    var currentLen = Math.min(json.length, scope.boxNow + (init || scope.config.step));
                    for (var i = scope.boxNow; i < currentLen; i++) {
                        if (json[i]) {
                            scope.addBox(json[i], currentLen, i, scope.baseBoxList);
                        }
                    }
                    scope.boxNow = currentLen;
                    // console.log('current boxs =', scope.boxNow);
                    if (scope.boxNow < scope.jsonData.length) {
                        scope.loading('Load more', 'load');
                    }
                };
                // 生成单个格子
                scope.addBox = function(item, length, i, boxList) {
                    if (!$('#box_' + i).length) {
                        var div;

                        div = $('<div></div>', {
                            'class': scope.config.class,
                            'id': 'box_' + i,
                            'style': {
                                'opacity': 0
                            }
                        });
                        var nameStr = '';
                        if (item.name) {
                            nameStr = '<span class="name">#' + item.name + '</span>';
                        }

                        var ratio = item.width / item.height;
                        var objStr = 'id:\'' + item.mediaId + '\', url:\'' + item.media + '\', ratio:\'' + ratio + '\'';

                        var template;
                        if (item.name) {
                            template = '<p class="pic"><a href="#/tag/' + item.name + '"><img src="' + item.image + '" ratio="' + ratio + '"></a></p>' + nameStr;
                        } else {
                            template = '<p class="pic"><a href onclick="return global.viewDetail({' + objStr + '})"><img src="' + item.image + '" image="' + item.image + '" media="' + item.media + '" width="' + item.width + '" height="' + item.height + '" ratio="' + ratio + '"></a></p>';
                        }
                        div.append(template);
                        scope.baseWrap.append(div);
                        boxList[i] = div;
                    }
                    //加载到最后一张时，进行排列处理
                    if (i >= length - 1) {
                        scope.postPosition(scope.baseWrap, boxList, 'add');
                    }
                };
                // 现有格子重排函数
                scope.sortAll = function(elem, childTagName) {
                    scope.heightList = []; //每次重排都要重置列高度记录数组
                    scope.boxNow = 0;
                    var oldBox = elem.find(childTagName).filter(':visible');
                    scope.postPosition(elem, oldBox, 'resort');
                };
                // 定位函数
                scope.postPosition = function(parent, boxList, action) {
                    var first = $(boxList[scope.boxNow]);
                    scope.firstWidth = scope.firstWidth || first.outerWidth() + scope.config.space;
                    var n, minH, boxW = scope.firstWidth;
                    parent.css({
                        'visibility': 'visible',
                        'width': 'auto'
                    });
                    scope.initWidth = scope.boxWidth ? scope.boxWidth - 0 : boxW;
                    scope.baseWidth = scope.config.container ? parent.width() : $window.width();

                    if (scope.config.fluid) {
                        n = scope.config.fluid;
                        boxW = (scope.baseWidth + scope.config.space) / n;
                    } else {
                        n = scope.baseWidth / boxW | 0; //计算页面能排下多少列，已取整
                        if (scope.baseWidth >= boxW * (n + 1) - scope.config.space) {
                            n++;
                        }
                        parent.css({
                            'width': n * boxW - scope.config.space
                        });
                    }
                    var imgW = boxW - scope.config.space;
                    for (var i = scope.boxNow; i < boxList.length; i++) { //排序算法
                        var box = $(boxList[i]);
                        var image = box.find('img');
                        if (image.length) {
                            // 图片按原始比例调整为适应格子宽度的新尺寸
                            if (scope.config.ratio) {
                                var pic = box.find('p.pic');
                                if (image.attr('ratio') > scope.config.ratio) {
                                    image.width('auto').height(imgW / scope.config.ratio);
                                } else {
                                    image.width(imgW).height('auto');
                                }
                                pic.width(imgW).height(imgW / scope.config.ratio);
                            } else {
                                image.height(imgW / image.attr('ratio'));
                            }
                        } else {
                            box.outerHeight(imgW);
                        }

                        box.outerWidth(imgW);

                        var boxH = box.outerHeight(); //获取每个列的高度
                        if (i < n && (action === 'resort' || (action === 'add' && scope.heightList.length < n))) { //第一行特殊处理
                            scope.heightList[i] = boxH;
                            box.css({
                                'top': 0,
                                'left': i * boxW
                            });
                        } else {
                            minH = scope.min(scope.heightList); //取得累计高度最低的一列
                            var minKey = scope.getArrayKey(scope.heightList, minH);
                            scope.heightList[minKey] += boxH + scope.config.space; //加上新高度后更新高度值
                            box.css({
                                'top': minH + scope.config.space,
                                'left': minKey * boxW
                            });
                        }
                        box.css({
                            'visibility': 'visible',
                            'opacity': 1
                        });
                    }
                    var maxH = scope.max(scope.heightList);
                    var maxKey = scope.getArrayKey(scope.heightList, maxH);
                    parent.css('height', scope.heightList[maxKey]);
                    if (action === 'resort') {
                        scope.boxNow = boxList.length;
                    }
                };
                // 加载动画和按钮
                scope.loading = function(text, addon) {
                    if (text) {
                        var elem;
                        if (addon) {
                            if (addon === 'load') {
                                elem = $compile('<div class="tips-box tips-' + addon + '" ng-click="loadIt()">' + text + '</div>')(scope);
                            } else {
                                elem = '<div class="tips-box tips-' + addon + '">' + text + '</div>';
                            }
                        } else {
                            elem = '<div class="tips-box">' + text + '</div>';
                        }
                        scope.baseWrap.append(elem);
                    } else {
                        $('.tips-box').remove();
                    }
                };
                // 加载更多
                scope.loadIt = function() {
                    if (scope.boxNow < scope.jsonData.length) {
                        scope.addMoreBox(scope.baseWrap, scope.jsonData);
                    } else if (scope.scrollTime) {
                        scope.scrollTime = false;
                        scope.requestData();
                    }
                };
                // 初始化加载
                scope.doLoad = function() {
                    if (!scope.jsonData.length) {
                        scroll(0, 0);
                        scope.requestData(scope.config.init);
                    } else {
                        scope.addMoreBox(scope.baseWrap, scope.jsonData);
                    }
                };
                scope.doScroll = function() {
                    scope.scrollTime = true;
                    $window.off('scroll.waterfall');
                    $window.on('scroll.waterfall', function() {
                        var bh = $body.height(),
                            wh = $window.height(),
                            wt = $window.scrollTop();
                        if (wt + wh + 10 >= bh && scope.config.load) {
                            scope.loadIt();
                        }
                        if (scope.config.toggle) {
                            var imglist = scope.baseWrap.find('p.pic img');
                            var tThreshold = 65,
                                bThreshold = 120;
                            for (var i = 0; i < imglist.length; i++) {
                                var obj = $(imglist[i]),
                                    wb = wt + wh,
                                    et = obj.offset().top,
                                    eb = et + obj.height();
                                // if gif in visible area(defined), play it
                                var condition = scope.config.detect ? (et >= wt + tThreshold && eb <= wb) || (et <= wt && eb >= wt + tThreshold) || (et <= wb - bThreshold && eb >= wb) : (et >= wt + tThreshold && eb <= wb);
                                // todo: firefox performance optimization
                                if (condition) {
                                    obj.attr('src', obj.attr('media'));
                                } else {
                                    obj.attr('src', obj.attr('image'));
                                }
                            }
                        }

                    });
                };
                scope.doResize = function() {
                    var resizeTime;
                    $window.off('resize.waterfall');
                    $window.on('resize.waterfall', function() {
                        if (resizeTime) {
                            clearTimeout(resizeTime);
                        }
                        resizeTime = setTimeout(function() {
                            $(scope.baseWrap).addClass('active');
                            scope.sortAll(scope.baseWrap, '.' + scope.config.class);
                        }, 500);
                    });
                    $window.on('orientationchange.waterfall', function() {
                        scope.orientaion = true;
                    });
                };
                scope.init();
            }
        };
    }]);
})();
