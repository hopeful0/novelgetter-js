var express = require('express');
var router = express.Router();
var http = require('http');
var htmlparser = require('htmlparser');
var iconv = require('iconv-lite');

var uid;
var verify;

/* GET home page. */
router.get('/', function(req, res, next) {
	var style = req.query.style;
	var origin = req.cookies.origin;
	uid = req.cookies.uid;
	verify = req.cookies.verify;
	switch (style) {
		case 'page':  //页面
			var url = req.query.url;
			page(origin, url, res);
			break;
		case 'contents':  //目录
			var url = req.query.url;
			contents(origin, url, res);
			break;
		case 'search':  //搜索
			var bname = req.query.bname;
			search(origin, bname, res);
			break;
		default:  //未知
			res.status(400).send('错误的请求类型！');
	}
});

function page(origin, url, res) {
	switch (origin) {
		case 'biquge':
			get(url, htmlBuild_page_biquge, res);
			break;
		default:
			res.status(400).send('未知小说源！');
	}
}

function htmlBuild_page_biquge(buffer, url) {
	var html = '';
	var h = iconv.decode(buffer, 'gbk');
	var dom = getdom(h);
	var box_con = findByClassName(dom, 'box_con');
	var bookname = findByClassName(box_con, 'bookname');
	var bottom = findByClassName(bookname, 'bottem1')[0].children;
	bookname = findByTagName(bookname, 'h1')[0].children[0].data;
	html += '<h2 align="center">' + bookname + '</h2>';
	var bot = '<p align="center" style="font-size:18pt;">';
	var bname = '';
	var bookurl = '';
	for (var i = 0; i < bottom.length; i ++) {
		if(bottom[i].children) {
			var b = bottom[i].children[0];
			var link;
			if (b.data == '上一章' || b.data == '下一章') {
				link = bottom[i].attribs.href;
				if(link[0] == '/') {
					link = '/get?style=contents&url=http://www.qu.la' + link;
				} else {
					link = '/get?style=page&url=' + url.substring(0, url.lastIndexOf('/')+1) + link;
				}
				bot += '<a href="' + link + '">' + b.data + '</a>';
			} else if (b.data == '章节列表') {
				bookurl = 'http://www.qu.la' + bottom[i].attribs.href;
				link = '/get?style=contents&url='+bookurl;
				bot += '&nbsp;&nbsp;<a href="' + link + '">' + b.data + '</a>&nbsp;&nbsp;';
			} else if (b.data == '小说错误举报') {
				bname = bottom[i].attribs.href;
				bname = bname.substring(bname.indexOf('小说《') + 3, bname.indexOf('》章节名'));
			}
			/*
			switch (b.data) {
				case '上一章':
					link = bottom[i].attribs.href;
					if(link[0] == '/') {
						link = '/get?style=contents&url=http://www.qu.la' + link;
					} else {
						link = '/get?style=page&url=' + url.substring(0, url.lastIndexOf('/')+1) + link;
					}
					break;
				case '章节列表':
					link = '/get?style=contents&url=http://www.qu.la' + bottom[i].attribs.href;
					break;
				case '下一章':
					if(link[0] == '/') {
						link = '/get?style=contents&url=http://www.qu.la' + link;
					} else {
						link = '/get?style=page&url=' + url.substring(0, url.lastIndexOf('/')+1) + link;
					}
					break;
			}
			*/
		}
	}
	bot += '</p>';
	html += bot;
	//var content = findById(box_con, 'content');
	//var h = iconv.decode(buffer, 'gbk');
	h = h.substring(h.indexOf('<div id="content">'));
	h = h.substring(h.indexOf('</script>')+9, h.indexOf('</div>'));
	html += '<div style="font-size:18pt;">' + h + '</div>';
	html += bot;
	//record the history
	var record = {
		uid: uid,
		verify: verify,
		bname: bname,
		burl: bookurl,
		cname: bookname,
		curl: url
	};
	require('./users').recordHistory(record);
	return html;
}

function contents(origin, url, res) {
	switch (origin) {
		case 'biquge':
			get(url, htmlBuild_contents_biquge, res);
			break;
		default:
			res.status(400).send('未知小说源！');
	}
}

function htmlBuild_contents_biquge(buffer, url) {
	var html = '<h3>目录</h3>';
	var dom = getdom(iconv.decode(buffer, 'gbk'));
	var list = findById(dom, 'list').children[0].children;
	for (var i = 0; i < list.length; i ++) {
		if (list[i].type = 'tag') {
			if (list[i].name == 'dt') {
				html += '<h5>' + list[i].children[0].data + '</h5>';
			} else if (list[i].name == 'dd') {
				var page = list[i].children[0];
				if(page.type == 'tag') {
					html += '<a href="/get?style=page&url=' + url + page.attribs.href + '">' + page.children[0].data + '</a>' + 
							'<br />';
				}
			}
		}
	}
	html += '</p>';
	return html;
}

function search(origin, bname, res) {
	switch (origin) {
		case 'biquge':
			get('http://zhannei.baidu.com/cse/search?s=920895234054625192&q='+encodeGBKURI(bname), htmlBuild_search_biquge, res);
			break;
		default:
			res.status(400).send('未知小说源！');
	}
}

function htmlBuild_search_biquge(buffer) {
	var html = '<h3>搜索结果：</h3>';
	var dom = getdom(buffer.toString());
	var result_list = findByClassName(dom, 'result-list');
	var result_item = findByClassName(result_list, 'result-game-item-detail');
	for (var i = 0; i < result_item.length; i ++) {
		var tdom = [result_item[i]];
		var title = findByClassName(tdom, 'result-game-item-title-link')[0].attribs;
		var infos = findByClassName(tdom, 'result-game-item-info-tag');
		var author;
		var newest;
		for (var j = 0; j < infos.length; j ++) {
			var info = infos[j];
			if(info.children[0].children[0].data == '作者：') {
				author = info.children[1].children[0].data;
			}
			if(info.children[0].children[0].data == '最新章节：') {
				newest = info.children[1];
			}
		}
		html += '<p>' + 
					'<a href="/get?style=contents&url=' + title.href + '">' + title.title + '</a>' +
					'<br />' +
					'作者：' + author + '<br />' +
					'最新章节：' + 
					'<a href="/get?style=page&url=' + newest.attribs.href + '">' + newest.children[0].data + '</a>' +
		   		'</p>';
	}
	return html;
}

function get(url, parser, res) {
	http.get(url, function(result) {
		var buffers = [], size = 0;
		result.on('data', function(buffer) {
			buffers.push(buffer);
			size += buffer.length;
		});
		result.on('end', function() {
			var buffer = new Buffer(size), pos = 0;
			for (var i = 0, l = buffers.length; i < l; i ++) {
				buffers[i].copy(buffer,pos);
				pos += buffers[i].length;
			}
			res.send(parser(buffer, url));
		});
	}).on('error', function(err) {
		console.log('url:'+url+';'+err);
		res.status(404).send(err);	
	});
}

/*function gbktoutf8(buffer) {
	var gbk_to_utf8_iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');
	var utf8_buffer = gbk_to_utf8_iconv.convert(buffer);
	return utf8_buffer;
}*/

function getdom(html) {
	var handler = new htmlparser.DefaultHandler(function (error, dom) {
		if (error) {
			console.log('getdom_error:'+error);
		}
	}, { verbose: false, ignoreWhitespace: true });
	var parser = new htmlparser.Parser(handler);
	parser.parseComplete(html);
	return handler.dom;
}

function findByTagName(dom, tagname) {
	var elements = [];
	for (var i = 0; i < dom.length; i ++) {
		if (dom[i].type == 'tag' && dom[i].name == tagname) {
			elements.push(dom[i]);
		}
		if (dom[i].children) {
			var celements = findByTagName(dom[i].children, tagname);
			for (var j = 0; j < celements.length; j ++) {
				elements.push(celements[j]);
			}
		}
	}
	return elements;
}

function findByClassName(dom, classname) {
	var elements = [];
	for (var i = 0; i < dom.length; i ++) {
		if (dom[i].type == 'tag' && dom[i].attribs && dom[i].attribs.class && dom[i].attribs.class == classname) {
			elements.push(dom[i]);
		}
		if (dom[i].children) {
			var celements = findByClassName(dom[i].children, classname);
			for (var j = 0; j < celements.length; j ++) {
				elements.push(celements[j]);
			}
		}
	}
	return elements;	
}

function findById(dom, id) {
	for (var i = 0; i < dom.length; i ++) {
		if (dom[i].type == 'tag' && dom[i].attribs && dom[i].attribs.id && dom[i].attribs.id == id) {
			return dom[i];
		}
		if (dom[i].children) {
			var element = findById(dom[i].children, id);
			if (element != null) {
				return element;
			}
		}
	}
	return null;
}

function encodeGBKURI(uri) {
	var res = '';
	for (var i = 0; i < uri.length; i ++) {
		if(escape(uri[i]).indexOf('%u') < 0) {
			res += uri[i];
		} else {
			var buffer = iconv.encode(uri[i], 'gbk');
			res += ('%' + parseInt(buffer[0]).toString(16) + '%' + parseInt(buffer[1]).toString(16)).toUpperCase();
		}
	}
	return res;
}

module.exports = router;
