(function() {
    'use strict';

    angular.module('ng-waterfall', []).directive('waterFall', ['$compile', '$http', function($compile, $http) {
        return {
            restrict: 'EA',
            scope: {
                boxClass: '@',
                boxSpace: '@',
                fixedRatio: '@',
                boxWidth: '@',
                boxColumn: '@',
                initStep: '@',
                loadStep: '@',
                tagName: '=?',
                customTips: '@',
                showTips: '=?',
                jsonData: '=?',
                jsonUrl: '@'
            },
            link: function(scope, element) {
                var $window = $(window);
                var $body = $(document.body);

                scope.init = function() {
                    scope.container = 1; //瀑布流适应模式。1：适应自身容器宽度，0：适应浏览器宽度
                    scope.autoLoad = 0; //加载模式。1：滚动自动加载，0：手动点击加载
                    scope.fluid = scope.boxColumn ? scope.boxColumn - 0 : 4; //格子适应模式。n：固定n列，宽度自适应，0：固定宽度(css设定)，列数自适应
                    scope.class = scope.boxClass || 'box'; //格子样式名称
                    scope.space = scope.boxSpace ? scope.boxSpace - 0 : 10; //格子间距
                    scope.ratio = scope.fixedRatio ? scope.fixedRatio - 0 : 0; // 格子比例是否固定
                    scope.step = scope.loadStep ? scope.loadStep - 0 : 30; //每次动态加载的格子数
                    scope.initLen = scope.initStep ? scope.initStep - 0 : scope.step; // 初始化加载的格子数
                    scope.customTip = scope.customTips ? scope.customTips : 0; //是否使用页面内自定义的提示内容
                    scope.jsonData = scope.jsonData || []; // 原始数据
                    scope.jsonUrl = scope.jsonUrl || ''; // 动态数据加载地址
                    scope.cursor = ''; // 当前翻页指针，通过服务器透传获取，初始为空
                    scope.toggleShow = false; // 是否使用lazyload来切换图片
                    scope.detectPartial = 0; // lazyload时判断图片是否位于可视范围内。1：部分，0：整体

                    scope.baseWrap = element;
                    scope.baseBoxList = []; //已排列的格子列表
                    scope.boxNow = 0; //记录当前总共有多少个格子
                    scope.heightList = []; //记录每列的高度
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
                //加载更多格子
                scope.getMore = function(obj, json, init) {
                    obj.removeClass('active');
                    var currentLen = Math.min(json.length, scope.boxNow + (init || scope.step));
                    for (var i = scope.boxNow; i < currentLen; i++) {
                        if (json[i]) {
                            scope.addBox(json[i], currentLen, i, scope.baseBoxList);
                        }
                    }
                    scope.boxNow = currentLen;
                    console.log('current boxs =', scope.boxNow);
                };
                //生成格子
                scope.addBox = function(item, length, i, boxList) {
                    if (!$('#box_' + i).length) {
                        var div;

                        div = $('<div></div>', {
                            'class': scope.class,
                            'id': 'box_' + i,
                            'style': {
                                'opacity': 0
                            }
                        });
                        var tagStr = '',
                            nameStr = '';
                        var ranNums = [1, 2, 3, 4, 5, 6, 7];
                        if (item.tags) {
                            if (typeof item.tags === 'string') {
                                item.tags = item.tags.split(',');
                            }
                            tagStr += '<div class="tag-cloud">';
                            for (var l = 0; l < item.tags.length; l++) {
                                tagStr += '<a href="#/tag/' + item.tags[l] + '" class="tag-c' + ranNums[l] + '">#' + item.tags[l] + '</a>';
                            }
                            tagStr += '</div>';
                        } else {
                            item.tags = [];
                        }
                        if (item.name) {
                            nameStr = '<span class="name">#' + item.name + '</span>';
                        }

                        var ratio = item.width / item.height;
                        var objStr = 'id:\'' + item.mediaId + '\', url:\'' + item.media + '\', ratio:\'' + ratio + '\', tags:\'' + item.tags + '\', source:\'' + item.sourceUrl + '\'';

                        var template;
                        if (item.name) {
                            template = '<p class="pic"><a href="#/tag/' + item.name + '"><img src="' + item.image + '"></a></p>' + nameStr;
                        } else {
                            template = '<p class="pic"><a href onclick="return global.viewDetail({' + objStr + '})"><img src="' + item.image + '" image="' + item.image + '" media="' + item.media + '" width="' + item.width + '" height="' + item.height + '" ratio="' + ratio + '"></a></p>' + tagStr;
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
                //现有格子重排函数
                scope.sortAll = function(elem, childTagName) {
                    scope.heightList = []; //每次重排都要重置列高度记录数组
                    scope.boxNow = 0;
                    var oldBox = elem.find(childTagName).filter(':visible');
                    scope.postPosition(elem, oldBox, 'resort'); //执行定位函数
                };
                //定位函数
                scope.postPosition = function(parent, boxList, action) {
                    var first = $(boxList[scope.boxNow]);
                    scope.firstWidth = scope.firstWidth || first.outerWidth() + scope.space;
                    var n, minH, boxW = scope.firstWidth;
                    parent.css({
                        'width': 'auto',
                        'visibility': 'visible'
                    });
                    scope.initWidth = scope.boxWidth ? scope.boxWidth - 0 : boxW;
                    scope.baseWidth = scope.container ? parent.width() : $window.width();

                    if (scope.fluid) {
                        n = scope.fluid;
                        // var halfWidth = Math.ceil(n / 2) * scope.initWidth;
                        // if (scope.baseWidth <= halfWidth) {
                        //     n = Math.ceil(n / 2);
                        // }
                        boxW = (scope.baseWidth + scope.space) / n;
                    } else {
                        n = scope.baseWidth / boxW | 0; //计算页面能排下多少列，已取整
                        if (scope.baseWidth >= boxW * (n + 1) - scope.space) {
                            n++;
                        }
                        parent.css({
                            'width': n * boxW - scope.space
                        });
                    }
                    var imgW = boxW - scope.space;
                    for (var i = scope.boxNow; i < boxList.length; i++) { //排序算法
                        var box = $(boxList[i]);
                        var image = box.find('img');
                        if (image.length) {
                            //图片按原始比例调整为适应格子宽度的新尺寸
                            if (scope.ratio) {
                                var pic = box.find('p.pic');
                                if (image.attr('ratio') > scope.ratio) {
                                    image.width('auto').height(imgW / scope.ratio);
                                } else {
                                    image.width(imgW).height('auto');
                                }
                                pic.width(imgW).height(imgW / scope.ratio);
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
                            scope.heightList[minKey] += boxH + scope.space; //加上新高度后更新高度值
                            box.css({
                                'top': minH + scope.space,
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
                scope.loadIt = function() {
                    if (scope.boxNow < scope.jsonData.length) {
                        scope.getMore(scope.baseWrap, scope.jsonData);
                    } else if (scope.scrollTime) {
                        scope.scrollTime = false;
                        scope.requestData();
                    }
                };
                scope.requestData = function(initLen) {
                    if (!scope.autoLoad) {
                        scope.loading();
                    }
                    scope.loading('loading', 'loading');

                    $http.get(scope.jsonUrl, {
                        tag: scope.tagName || '',
                        count: initLen || scope.step,
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
                                    tags: item.tags || [],
                                    name: item.index,
                                    width: item.width,
                                    height: item.height,
                                    image: item.image,
                                    media: item.media
                                });
                            });
                            scope.jsonData = scope.jsonData.concat(arr);
                            scope.getMore(scope.baseWrap, scope.jsonData, initLen);
                            scope.scrollTime = true;
                            if (scope.cursor && !scope.autoLoad) {
                                scope.loading('Load more', 'load');
                            }
                        } else {
                            scope.showTips = true;
                            scope.baseWrap.css({
                                'width': 'auto',
                                'visibility': 'visible'
                            });
                            if (scope.jsonData.length === 0) {
                                if (!scope.customTip) {
                                    scope.loading('Sorry,no result found.', 'noresult');
                                }
                            } else {
                                scope.loading();
                            }
                        }
                    });
                };
                scope.doLoad = function() {
                    if (!scope.jsonData.length) {
                        scroll(0, 0);
                        scope.requestData(scope.initLen);
                    } else {
                        scope.getMore(scope.baseWrap, scope.jsonData);
                    }
                };
                scope.doScroll = function() {
                    scope.scrollTime = true;
                    $window.off('scroll.waterfall');
                    $window.on('scroll.waterfall', function() {
                        var bh = $body.height(),
                            wh = $window.height(),
                            wt = $window.scrollTop();
                        if (wt + wh + 10 >= bh && scope.autoLoad) {
                            scope.loadIt();
                        }
                        if (scope.toggleShow) {
                            var imglist = scope.baseWrap.find('p.pic img');
                            var tThreshold = 65,
                                bThreshold = 120;
                            for (var i = 0; i < imglist.length; i++) {
                                var obj = $(imglist[i]),
                                    wb = wt + wh,
                                    et = obj.offset().top,
                                    eb = et + obj.height();
                                // if gif in visible area(defined), play it
                                var condition = scope.detectPartial ? (et >= wt + tThreshold && eb <= wb) || (et <= wt && eb >= wt + tThreshold) || (et <= wb - bThreshold && eb >= wb) : (et >= wt + tThreshold && eb <= wb);
                                // todo: firefox performance optimization
                                if (condition) {
                                    obj.attr('src', obj.attr('media'));
                                    // obj.addClass('active');
                                } else {
                                    obj.attr('src', obj.attr('image'));
                                    // obj.removeClass('active');
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
                            scope.sortAll(scope.baseWrap, '.' + scope.class);
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
