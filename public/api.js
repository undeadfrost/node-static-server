/*
 * APICloud JavaScript Library
 * Copyright (c) 2014 apicloud.com
 */
(function (window) {
	var u = {};
	
	// var baseUrl = 'https://www.sjlr365.com/'
	var baseUrl = 'https://www.sjlr365.com/'
	// var baseUrl = '168.192.2.191:8001/'                //啸天本地
	
	u.isWx = function () {
		var host = document.location.host;
		if (host == '192.168.2.184:8080' || host == '127.0.0.1:8080') {
			return false
		}
		var ua = window.navigator.userAgent.toLowerCase();
		if (ua.match(/MicroMessenger/i) == 'micromessenger') {
			return true;
		} else {
			return false;
		}
	};
	/*
			 * @module ajax
			 * @function commonAjax();
			 * @params  {url,data,method,dataType,headers,callback}
			 *           url:接口地址
			 *           data:传递数据    JSON
			 *           method:请求类型   {POST or GET}
			 *           dttaType: 返回数据类型  {JSON,TEXT} json 写死
			 *           headers:请求头信息  写死
			 *           callback:回调 {function}
			 */
	u.commonAjax = function (url, data, method, callback) {
		var _this = this;
		if (this.isWx()) {
			if (!localStorage.openid || localStorage.openid == 'undefined') {
				if (url != 'wechat/get-user') {
					var referees_id;
					if (this.parseUrl(window.location.search).referees_id) {
						referees_id = this.parseUrl(window.location.search).referees_id;
						localStorage.refereesId = referees_id;
					} else {
						referees_id = ''
					}
					localStorage.clears = 1;
					//if (referees_id) {
					
					localStorage.zurl = window.location.href;
					window.location.href = baseUrl + 'wechat/index?referees_id=' + referees_id + '&url=' + baseUrl + '/html/loginTemp/transfer.html?v=' + new Date().getTime();
					return
					//}
				}
			}
		}
		
		if (localStorage.user) {
			if (JSON.parse(localStorage.user).id) {
				data.xyz = JSON.parse(localStorage.user).tk;
				// data.xyz = 18916;
			} else {
				data.xyz = '';
			}
		}
		if (localStorage.openid) {
			data.openid = localStorage.openid;
		} else {
			data.openid = '';
		}
		data.sourcesType = 'wx';
		if (url != 'store/get-qrs' && method != 'get') {
			_this.loading(true);
		}
		if (method == 'get') {
			$.ajax({
				url: baseUrl + url,
				type: method,
				data: {},
				dataType: 'json',
				timeout: 60000,
				headers: {
					Accept: "application/json; charset=utf-8",
				},
				success: function (ret) {
					//请求成功时处理
					if (ret) {
						if (url != 'pay/get-code') {
							_this.loading(false);
						}
						if (ret.code == '-40000') {
							_this.modalMsg(ret.message, 'error', 1500);
							localStorage.removeItem('user');
							localStorage.removeItem('userData');
							window.location.href = '../html/loginTemp/indexWin.html'/*tpa=https://www.sjlr365.com/html/loginTemp/indexWin.html*/;
						} else {
							if (ret.status == 0) {
								callback(ret);
							} else {
								if (url == 'login/login') {
									_this.modalMsg('登录成功', 'error', 1000)
								}
								callback(ret);
							}
						}
					}
				},
				error: function (err) {
					//请求出错处理
					_this.loading(false);
					if (err.statusText == 'timeout') {
						_this.modalMsg('网络错误', 'error', 2000)
					}
					if (err.code == 0) {
						_this.loading(false);
						_this.modalMsg('网络错误', 'error', 2000)
						//api.refreshHeaderLoadDone();//终止刷新状态
						//连接不成功
						//coding....
					} else if (err.code == 1) {
						_this.loading(false);
						//api.refreshHeaderLoadDone();//终止刷新状态
						//连接超时
						_this.modalMsg('网络错误', 'error', 2000)
						//coding....
					} else if (err.code == 3) {
						_this.loading(false);
						//api.refreshHeaderLoadDone();//终止刷新状态
						//数据类型错误
						//coding....
					}
				}
			})
		} else {
			$.ajax({
				url: baseUrl + url,
				type: method,
				data: {
					data: data,
				},
				async: true,               //true异步操作  false同步操作
				dataType: 'json',
				timeout: 60000,
				headers: {
					Accept: "application/json; charset=utf-8",
				},
				success: function (ret) {
					//请求成功时处理
					if (ret) {
						if (url != 'pay/get-code') {
							_this.loading(false);
						}
						if (ret.code == '-40000') {
							_this.modalMsg(ret.message, 'error', 1500);
							localStorage.removeItem('user');
							localStorage.removeItem('userData');
							window.location.href = '../html/loginTemp/indexWin.html'/*tpa=https://www.sjlr365.com/html/loginTemp/indexWin.html*/;
						} else {
							if (ret.status == 0) {
								localStorage.removeItem('user');
								localStorage.removeItem('userData');
								callback(ret);
							} else {
								if (url == 'login/login') {
									_this.modalMsg('登录成功', 'error', 1000)
								}
								callback(ret);
							}
						}
					}
				},
				error: function (err) {
					_this.loading(false);
					//请求出错处理
					if (status == "timeout") {
						_this.modalMsg('请求超时,请检查网络是否正常连接，并稍后再试!', 'error', 2000);
						return;
						//coding....
					} else if (status == "error") {
						_this.modalMsg('服务器开小差啦！请稍后再试!', 'error', 2000);
						return;
						//coding....
					} else if (status == "notmodified" || status == "parsererror") {
						_this.modalMsg('请检查网络是否正常连接，并稍后再试!', 'error', 2000);
						return;
						//coding....
					}
				}
			})
		}
	};
	/*
	 * @module 上传文件用的ajax
	 * @function upLoadingAjax();
	 * @params  {url,data,method,dataType,headers,callback}
	 *           url:接口地址
	 *           data:传递数据    JSON
	 *           method:请求类型   {POST or GET}
	 *           dttaType: 返回数据类型  {JSON,TEXT} json 写死
	 *           headers:请求头信息  写死
	 *           callback:回调 {function}
	 */
	u.upLoadingAjax = function (url, data, method, callback) {
		var _this = this;
		_this.loading(true);
		api.ajax({
			url: baseUrl + url,
			method: method,
			data: {
				files: {
					data: data
				}
			},
			dataType: 'json',
			timeout: 15000,
			headers: {
				Accept: "application/json; charset=utf-8"
			}
		}, function (ret, err) {
			_this.loading(false);
			if (ret) {
				callback(ret);
			} else {
				//console.log(JSON.stringify(err))
				if (err.code == 0) {
					_this.modalMsg('网络错误', 'error', 2000)
					//连接不成功
					//coding....
				} else if (err.code == 1) {
					//连接超时
					//coding....
				} else if (err.code == 3) {
					//数据类型错误
					//coding....
				}
			}
		});
	};
	/*
	 * @module loading
	 * @function loading();
	 * @params  {type|Boolean}  ture=>显示loading，flase=>隐藏loading
	 */
	u.loading = function (type, text) {
		if (type) {
			if (!text) {
				var text = '正在加载中···'
			}
			if (document.getElementById('lodings')) {
				document.getElementById('lod_text').innerHTML = text
				document.getElementById('lodings').style.display = 'block';
			} else {
				var oDiv = document.createElement("div");
				oDiv.style.cssText = "position: fixed;top:0px;left:0px;background:rgba(242,242,242,.4) ;width:100%;height:100%;z-index:10000000000000000";
				oDiv.setAttribute('id', 'lodings');
				oDiv.innerHTML = '  <div style="position:fixed;left:0;right:0;top:0;bottom:0;width:30%;height:80px;background: rgba(0,0,0,.8) ;overflow: hidden;line-height: 60px;margin: auto;border-radius: 15px;"><img class="spiner" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgxMDB2MTAwSDB6Ii8+PHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iMjAiIHg9IjQ2LjUiIHk9IjQwIiBmaWxsPSIjRTlFOUU5IiByeD0iNSIgcnk9IjUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgLTMwKSIvPjxyZWN0IHdpZHRoPSI3IiBoZWlnaHQ9IjIwIiB4PSI0Ni41IiB5PSI0MCIgZmlsbD0iIzk4OTY5NyIgcng9IjUiIHJ5PSI1IiB0cmFuc2Zvcm09InJvdGF0ZSgzMCAxMDUuOTggNjUpIi8+PHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iMjAiIHg9IjQ2LjUiIHk9IjQwIiBmaWxsPSIjOUI5OTlBIiByeD0iNSIgcnk9IjUiIHRyYW5zZm9ybT0icm90YXRlKDYwIDc1Ljk4IDY1KSIvPjxyZWN0IHdpZHRoPSI3IiBoZWlnaHQ9IjIwIiB4PSI0Ni41IiB5PSI0MCIgZmlsbD0iI0EzQTFBMiIgcng9IjUiIHJ5PSI1IiB0cmFuc2Zvcm09InJvdGF0ZSg5MCA2NSA2NSkiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIyMCIgeD0iNDYuNSIgeT0iNDAiIGZpbGw9IiNBQkE5QUEiIHJ4PSI1IiByeT0iNSIgdHJhbnNmb3JtPSJyb3RhdGUoMTIwIDU4LjY2IDY1KSIvPjxyZWN0IHdpZHRoPSI3IiBoZWlnaHQ9IjIwIiB4PSI0Ni41IiB5PSI0MCIgZmlsbD0iI0IyQjJCMiIgcng9IjUiIHJ5PSI1IiB0cmFuc2Zvcm09InJvdGF0ZSgxNTAgNTQuMDIgNjUpIi8+PHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iMjAiIHg9IjQ2LjUiIHk9IjQwIiBmaWxsPSIjQkFCOEI5IiByeD0iNSIgcnk9IjUiIHRyYW5zZm9ybT0icm90YXRlKDE4MCA1MCA2NSkiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIyMCIgeD0iNDYuNSIgeT0iNDAiIGZpbGw9IiNDMkMwQzEiIHJ4PSI1IiByeT0iNSIgdHJhbnNmb3JtPSJyb3RhdGUoLTE1MCA0NS45OCA2NSkiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIyMCIgeD0iNDYuNSIgeT0iNDAiIGZpbGw9IiNDQkNCQ0IiIHJ4PSI1IiByeT0iNSIgdHJhbnNmb3JtPSJyb3RhdGUoLTEyMCA0MS4zNCA2NSkiLz48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSIyMCIgeD0iNDYuNSIgeT0iNDAiIGZpbGw9IiNEMkQyRDIiIHJ4PSI1IiByeT0iNSIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwIDM1IDY1KSIvPjxyZWN0IHdpZHRoPSI3IiBoZWlnaHQ9IjIwIiB4PSI0Ni41IiB5PSI0MCIgZmlsbD0iI0RBREFEQSIgcng9IjUiIHJ5PSI1IiB0cmFuc2Zvcm09InJvdGF0ZSgtNjAgMjQuMDIgNjUpIi8+PHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iMjAiIHg9IjQ2LjUiIHk9IjQwIiBmaWxsPSIjRTJFMkUyIiByeD0iNSIgcnk9IjUiIHRyYW5zZm9ybT0icm90YXRlKC0zMCAtNS45OCA2NSkiLz48L3N2Zz4=" style="width: 40px;height:40px;margin: auto;margin-top:5px"/><p style="font-size: 12px;color:#fff;text-align:center;margin-top:0px;padding:0;height:35px;line-height:35px;" id="lod_text">' + text + '</p></div>';
				document.body.appendChild(oDiv);
			}
		} else {
			try {
				document.getElementById('lodings').style.display = 'none';
			} catch (e) {
			
			}
			
		}
	};
	/*
	 * @module modalMsg
	 * @function modalMsg();
	 * @params  {msg,type,millisec}  msg=>错误信息，millisec=>时间（毫秒）,type=>信息类型{ error ， success}
	 */
	u.modalMsg = function (msg, type, millisec) {
		var oDiv = document.createElement("div");
		oDiv.setAttribute('id', 'msg');
		if (type == 'error') {
			oDiv.innerHTML = '<div style="z-index:10000000;width:40%;background:rgba(49, 49, 49,.8) ; text-align:center;position:fixed;bottom:100px;left:0;right:0;margin:auto;border-radius: 10px;padding:8px 5px; line-height:180%;color: white;font-size: 12px;">' + msg + '</div>';
		} else {
			oDiv.innerHTML = '<div style="z-index:10000000;width:40%;background:rgba(49, 49, 49,.8) ; text-align:center;position:fixed;bottom:100px;left:0;right:0;margin:auto;border-radius: 10px;padding:8px 5px; line-height:180%;color: white;font-size: 12px;">' + msg + '</div>';
		}
		document.body.appendChild(oDiv);
		setTimeout(function () {
			oDiv.parentNode.removeChild(oDiv);
		}, millisec)
	};
	
	u.parseUrl = function (url) {
		var Request = new Object();
		if (decodeURI(url).indexOf("?") != -1) {
			var str = decodeURI(url).substr(1) //去掉?号
			var strs = str.split("&");
			for (var i = 0; i < strs.length; i++) {
				Request[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
			}
		}
		return Request;
	}
	/*end*/
	window.$api = u;
	
})(window);

// var href = document.location.href;
// var host = document.location.host;
// if(host == 'https://www.sjlr365.com/script/192.168.2.184' || host == '127.0.0.1:8080'){
//     console.log('demo_wang')
// }else{
//     href = href.replace("http://", "https://");
//     if (document.location.protocol == "http:") {
//         window.location.href = href;
//     }
// }
//
var href = document.location.href;
href = href.replace("http://", "https://");
if (document.location.protocol == "http:") {
	window.location.href = href;
}
