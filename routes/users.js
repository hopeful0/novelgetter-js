var express = require('express');
var router = express.Router();
var mysql = require('./mysqlconn');

/* GET users listing. */
router.get('/', function(req, res, next) {
	var para = req.query;
	var uid = req.cookies.uid;
	var verify = req.cookies.verify;
	if (!para.cmd) 
		para.cmd = 'index';
	switch(para.cmd) {
		case 'index':
			verifyUser(uid, verify, (result) => {
				if (result)
					res.render('user', { user: result.name});
				else
					res.redirect('/users/login');
			});
			break;
		case 'login':
			var name = para.name;
			var passwd = para.passwd;
			login(name, passwd, (result) => {
				if (result) {
					res
						.cookie('uid', result.id)
						.cookie('verify', result.verify, { maxAge: 86400000 });
					res.redirect('/users?cmd=index');
				} else {
					res.send('login failed!');
				}
			});
			break;
		case 'history':
			verifyUser(uid, verify, (result) => {
				if (result) {
					getHistories(uid, (result) => {
						res.send(result);
					});
				} else {
					res.redirect('/users/login');
				}
			});
			break;
		default:
			res.send('unknown command!');
	}
});

router.get('/login', function(req, res, next) {
	res.render('login');
});

function getHistories(uid, callback) {
	mysql.conn((conn) => {
		conn.query('select * from `histories` where `user_id`='+uid+' order by `date`;',
			(error, results, fields) => {
				if (error || !results || results.length < 1)
					return callback(error);
				var result = '';
				result += '<p>书名 | 章节名 | 日期<br />';
				for (var i = 0; i < results.length; i++) {
					var bname = results[i].book_name;
					var burl = results[i].book_url;
					var cname = results[i].chapter_name;
					var curl = results[i].chapter_url;
					var origin = results[i].origin;
					var date = results[i].date;
					result += '<a href="/get?origin='+origin+'style=contents&url='+burl+'">'+bname+'</a> | ';
					result += '<a href="/get?origin='+origin+'style=page&url='+curl+'">'+cname+'</a> | ';
					result += date+'<br />';
				}
				result += '</p>';
				callback(result);
			});
	});
}

function verifyUser(uid, verify, callback) {
	if (!uid || !verify)
		return callback(false);
	mysql.conn((conn) => {
		conn.query('select * from `users` where `id`='+uid+' && `verify`='+verify+' limit 1;', (error, results, fields) => {
			if(error || !results || results.length < 1)
				callback(false);
			else
				callback(results[0]);
		});
	});
}

function login(name, pw, callback) {
	mysql.conn((conn) => {
		conn.query('select `id`,`passwd` from `users` where `name`="'+name+'";', (error, results, fields) => {
			if(error || !results || results.length < 1)
				return callback();
			for(var i = 0; i < results.length; i++) {
				if(pw == results[i].passwd) {
					var verify = Math.random().toFixed(15);
					result = {
						verify: verify,
						id: results[i].id
					};
					conn.query('update `users` set `verify`='+verify+' where `id`='+results[i].id, () => {
						callback(result);
					});
					break;
				}
			}
		});
	});
}

module.exports = router;
module.exports.verifyUser = verifyUser;
module.exports.recordHistory = function(record) {
	verifyUser(record.uid, record.verify, (result) => {
		if(!result) return;
		mysql.conn((conn) => {
			var condition = 'where `user_id`='+record.uid+' && `book_url`="'+
				record.burl+' && `origin`="'+record.origin+'" limit 1';
			var insert = () => {
				conn.query('insert into `histories` (`user_id`,`book_name`,'+
					'`book_url`,`chapter_name`,`chapter_url`,`origin`) values ('+record.uid+',"'+
					record.bname+'","'+record.burl+'","'+record.cname+'","'+record.curl+'","'+record.origin+'")');
			};
			var update = (index) => {
				conn.query('update `histories` set `chapter_name`="'+record.cname+
					'",`chapter_url`="'+record.curl+'" where `index`='+index+" limit 1;");
			};
			conn.query('select `index` from `histories` '+condition+';',
				(error, results, fields) => {
					if (error)
						return console.log('recordHistory_error:'+error);
					if (!results || results.length < 1) {
							insert();
					} else {
						update(results[0].index);
					}
				});
		});
	});
}
