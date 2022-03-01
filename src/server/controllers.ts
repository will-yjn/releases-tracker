const db = require("./db");
const requests = require("./requests");
const concat = require("concat-stream");

export async function addFeed(req: any, res: any){
	req.pipe(
		concat(async data => {
			if (data.length === 0) {
				return res.sendStatus(400);
			}
			let { larkUrl, feedUrls } = JSON.parse(data.toString());
			try{
				for(let i=0; i<feedUrls.length; i++){
					const {feedUrl, nodeName} = feedUrls[i];
					// 若是非法地址，无法获取feed，抛错404
					await requests.getRssFeed(feedUrl);
					await db.subscribe(feedUrl, larkUrl, nodeName);
				}
				res.send({code:200, message:"success"});
			}catch(error: any){
				let code = error.code;
				let msg: string;
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

export async function deleteFeed(req: any, res: any){
	req.pipe(
		concat(async data => {
			let { feedUrls } = JSON.parse(data.toString());
			res.send({code:200, message:"success", data: feedUrls});
		})
	);
};

export async function updateOpNodeVersion(req: any, res: any){
	req.pipe(
		concat(async data => {
			if (data.length === 0) {
				return res.sendStatus(400);
			}
			let resp = JSON.parse(data.toString());
			try{
				await db.updateOpNodeVersion(resp);
				res.send({code:200, message:"success"});
			}catch(error: any){
				res.send(error);
			}
		})
	);
};
