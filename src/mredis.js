const redis = require("redis");
const RedisOptions = require("../conf/redis-conf");
const async = require("async");
/* ----- Promise化Redis ---- */

const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
bluebird.promisifyAll(redis);

/* ------- 导入Module ------ */

const client = redis.createClient(RedisOptions.redis);
const redisKeyMap = require("../module/redisKeyMap")

client.on("error",function (err) {
	console.log(`[Redis] : Error - ${err}`);
})

const SUCCESS = "SUCCESS";
const NOFIND = "NoFind";
const FAIL = "Fail";

module.exports = {
	expendLog :  async function(blog){
		let tartId = undefined;

		await client.getAsync(redisKeyMap.LOG_STATIC_ID).then( res => {
			tartId = parseInt(res);
		});
		console.log(tartId);
		if(!tartId){ 
			// 如果不存在则从1开始
			client.set(redisKeyMap.LOG_STATIC_ID,1);
			tartId = 1;
		}else{
			// 更新
			tartId ++ ;
			console.log(tartId);
			client.set(redisKeyMap.LOG_STATIC_ID,tartId);
		}

		// 添加到 日志ID集合中
		await client.sadd(redisKeyMap.QUERY_LOG_ID, tartId);
		await client.sadd(redisKeyMap.LOG_GROUP + blog.group, tartId);

		await client.sismemberAsync(redisKeyMap.QUERY_LOG_GROUPS, blog.group).then (res => {
			if(!res){
				client.sadd(redisKeyMap.QUERY_LOG_GROUPS, blog.group);
			}
		});

		console.log("[AppendLog]" + tartId + ":" + blog.title )
		try{
			await client.hmsetAsync(redisKeyMap.QUERY_LOG_CONENT + tartId, blog);
			return SUCCESS;
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	removeLog: async function(id){
		let isMember = false;
		try{
			await client.sremAsync(redisKeyMap.QUERY_LOG_ID, id).then( res => isMember = res );

			if(isMember){
				await client.hdelAsync(redisKeyMap.QUERY_LOG_CONENT + id, "title", "image");
				return SUCCESS;
			}
			return NOFIND;
		}catch(err){
			console.log(err)
			return FAIL;
		}
	},

	getLog: async function(id){
		let isMember = false;
		try{
			await client.sismemberAsync(redisKeyMap.QUERY_LOG_ID, id).then( res => isMember = res);

			if(isMember){
				let log = {};
				await client.hgetallAsync(redisKeyMap.QUERY_LOG_CONENT + id).then( res => log = res);
				return log;
			}
			return NOFIND;
		}catch(err){
			console.log(err)
			return FAIL;
		}
	},

	getLogGroup: async function(){
		let ret = [];
		await client.smembersAsync(redisKeyMap.QUERY_LOG_GROUPS).then( res =>{
			ret = res;
		}).catch( err =>{
			console.log(err);
		})
		return ret;
	},

	getLogs: async function(){
		let ret = [];
		let logIDS = []
		try{
			await client.smembersAsync(redisKeyMap.QUERY_LOG_ID).then( res => logIDS = res);
			for(let _ = 0 ; _ < logIDS.length ; _ ++){
				await client.hgetallAsync(redisKeyMap.QUERY_LOG_CONENT + logIDS[_]).then( res => {
					ret.push(res);
					console.log(res.title);
				}).catch(err => console.log(err))
			}
			console.log(ret.length);
			return ret;
		}catch(err){
			console.log(err);
			return [];
		};
	},

	verify: async function(name, pwd){
		let result = 0;
		let RetCode = -1;
		try{
			await client.sismemberAsync(redisKeyMap.USER_STATIC, name).then( res => result = res);
			if(result){
				await client.getAsync(redisKeyMap.QUERY_PASSWOD + name).then( res => {
					if( res == pwd){
						console.log("验证成功")
						RetCode = 0;
					}else{
						console.log("验证失败")
						RetCode = 1;
					}
				})
			}else{
				RetCode = -1;
			}
		}catch(err){
			console.log(err);
			RetCode = -1;
		};
		return RetCode; 
	}
}
