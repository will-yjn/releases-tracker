const axios = require("axios");
const db = require("./db");
const api = require("./api");
const concat = require("concat-stream");

export async function main() {

	const subscriptions = await db.listSubscriptions();
	// console.log(subscriptions);

	for (let i = 0; i < subscriptions.length; i++) {
		const { feed_url, lark_url, newest_feed, op_url, op_node_version } = subscriptions[i];

		// 更新运维节点版本
		if(op_url){
			const fetchedOpNodeVersion = await api.getOpNodeVersion(op_url);
			if(fetchedOpNodeVersion !== op_node_version){
				await db.updateOpNodeVersion(feed_url, fetchedOpNodeVersion);
			}
		}

		// 根据列表，http请求获取最新feeds
		const fetchedFeeds = await api.getRssFeed(feed_url);
		// console.log(fetchedFeeds);

		const updatedFeeds: any[] = [];
		// 如果数据库中的newest_feed字段不存在，说明是新的subscription，只推送最近一条更新即可
		if(!newest_feed){
			updatedFeeds.push(fetchedFeeds?.items?.[0]);
		}else{
			// 将获取的数据与数据库中的newest_feed进行比较，记录不同的feeds
			for(let j=0; j<fetchedFeeds?.items?.length; j++){
				const item = fetchedFeeds?.items?.[j];
				const newestFeedId = JSON.parse(newest_feed)?.id;
				if(newestFeedId!==item?.id){
					console.log("newestFeedId: "+newestFeedId)
					updatedFeeds.push(item);
				}else{
					break;
				}
			}
		}
		// console.log(updatedFeeds)

		// 如果有新的feeds
		if(updatedFeeds.length>0 && updatedFeeds[0]){
			// 发送新的数据到相应的lark channel
			for(let k=updatedFeeds.length-1; k>=0; k--){
				const response = await axios.post(
					lark_url,
					{
						"msg_type": "post",
						"content": {
							"post": {
								"zh_cn": {
									"title": fetchedFeeds.title,
									"content": [
										[
											{
												"tag": "a",
												"text": updatedFeeds[k].title,
												"href": updatedFeeds[k].link,
											},
										],
										[
											{
												"tag": "text",
												"text": new Date(updatedFeeds[k].pubDate).toLocaleString(),
											},
										],
										[
											{
												"tag": "text",
												"text": "",
											},
										],
										[
											{
												"tag": "text",
												"text": updatedFeeds[k].contentSnippet
											}
										]
									]
								}
							}
						}
					}
				);
				console.log(response.data)
			}

			// 更新当前feed_url最新的newest_feed
			const updateFeed = updatedFeeds[0];
			const array = updateFeed?.link?.split("/");
			let nodeVersion = array?.[array?.length-1];
			if(nodeVersion.substring(0,1).toLowerCase()==="v"){
				nodeVersion = nodeVersion.substring(1);
			}

			await db.updateNewestFeed(feed_url, updateFeed, nodeVersion);
		}
	}
};

export async function addFeed(req, res){
	req.pipe(
		concat(async data => {
			if (data.length === 0) {
				return res.sendStatus(400);
			}
			let { larkUrl, feedUrls } = JSON.parse(data.toString());
			try{
				for(let i=0; i<feedUrls.length; i++){
					const feedUrl = feedUrls[i];
					// 若是非法地址，无法获取feed，抛错404
					await api.getRssFeed(feedUrl);
					await db.subscribe(feedUrl, larkUrl);
				}
				res.send({code:200, message:"success"});
			}catch(error: any){
				let code = error.code;
				let msg;
				switch(code){
					case "23505":
						msg = error.detail;
						break;
					default:
						msg = error;
				}
				if(error.message.includes("404")){
					code = "404";
					msg = "无法保存该订阅，请检查链接是否正确";
				}
				res.send({code, message: msg});
			}
		})
	);
};

export async function deleteFeed(req, res){
	req.pipe(
		concat(async data => {
			let { feedUrls } = JSON.parse(data.toString());
			res.send({code:200, message:"success", data: feedUrls});
		})
	);
};

export async function updateOpUrl(req, res){
	req.pipe(
		concat(async data => {
			if (data.length === 0) {
				return res.sendStatus(400);
			}
			let { feedUrl, opUrl } = JSON.parse(data.toString());
			try{
				await db.updateOpUrl(feedUrl, opUrl);
				res.send({code:200, message:"success"});
			}catch(error: any){
				res.send(error);
			}
		})
	);
};