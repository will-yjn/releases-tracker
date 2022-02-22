require("dotenv/config");
const rss = require("./rss");
const express = require("express");
const { main, addFeed, deleteFeed } = require("./routes");
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 8000;

app.post("/add/feed", [
	addFeed
]);

app.post("/delete/feed", [
	deleteFeed
]);

rss.init().then(() => {
  	console.log("Connected to db");

	// running a task every ten minutes
	cron.schedule('*/10 * * * *', async () => {
		// 每隔10分钟循环从数据库中获取列表
		await main();
	});

	app.listen(port, () => {
		console.log("Started Server...");
		console.log(`Listening on http://127.0.0.1:${port}`);
	});
}).catch((e) => {
	console.log(e);
});

