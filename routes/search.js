var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var origin = req.query.origin;
	if(origin) {
		res.cookie('origin', origin).render('search', {origin: origin});
	} else {
		res.status(400).send('未知小说源！');
	}
});

module.exports = router;
