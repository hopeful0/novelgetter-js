var mysql  = require('mysql');  //调用MySQL模块

var pool = mysql.createPool({     
  host     : 'localhost',       //主机
  user     : 'hopeful',               //MySQL认证用户名
  password : 'chenwang4910',        //MySQL认证用户密码
  database : 'ngdb',			//数据库
  port: '3306',                   //端口号
});

module.exports.conn = function(callback) {
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log('mysqlconn_error:'+err);
		}
		callback(connection);
	});
}
