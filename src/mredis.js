const redis = require("redis");
const RedisOptions = require("../conf/redis-conf");
const async = require("async");
const fs = require("fs");
const md5 = require('js-md5');
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

const SUCCESS = "Success";
const NOFIND = "NoFind";
const FAIL = "Fail";

module.exports = {
	expendLog :  async function(blog){
		let tartId = undefined;

		await client.getAsync(redisKeyMap.LOG_STATIC_ID).then( res => {
			tartId = parseInt(res);
		});
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
				this.logReadOrLikePlus(id, "read");
				return {...log, id};
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

	getLogs: async function(lastId){
		let ret = [];
		let logIDS = [];
		const onceFetchNumber = 10;
		try{
			await client.smembersAsync(redisKeyMap.QUERY_LOG_ID).then( res => logIDS = res);

			let startIndex = logIDS.length - 1;
			if(lastId){
				for(let _ = startIndex ; _ >= 0; _ --){
					if(logIDS[_] == (lastId + "")){
						startIndex = _ - 1;
						break;
					}
				}
			}

			for(let _ = startIndex ; _ >= 0 && _ > (startIndex - onceFetchNumber) ; _ --){
				await client.hgetallAsync(redisKeyMap.QUERY_LOG_CONENT + logIDS[_]).then( res => {
					ret.push({...res, id: logIDS[_]});
				}).catch(err => console.log(err))
			}

			return ret;
		}catch(err){
			console.log(err);
			return [];
		};
	},

	logReadOrLikePlus: async function (id, type, userName) {
		try{
			let read = 0;
			await client.hgetAsync(redisKeyMap.QUERY_LOG_CONENT + id, type).then( res => read = res);
			if(read != null){
				await client.hsetAsync(redisKeyMap.QUERY_LOG_CONENT + id, type, parseInt(read) + 1);
				if(type == "like" && userName){
					await client.lpushAsync(redisKeyMap.QUERY_LOG_LIKES + id, userName)
				}
				return SUCCESS;
			}
			return NOFIND;
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},	

	getLogLikes : async function(id) {
		try{
			let query = [];
			await client.lrangeAsync(redisKeyMap.QUERY_LOG_LIKES + id, 0, -1).then( res => query = res);
			return query;
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	addLogComment: async function (id, comment) {
		try{
			let ret = 0;
			await client.lpushAsync(redisKeyMap.QUERY_LOG_COMMENTS + id, comment).then( res => ret = res);
			if(ret){
				return SUCCESS;
			}else{
				return FAIL;
			}
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	getLogComments: async function(id){
		try{
			let query = [];
			await client.lrangeAsync(redisKeyMap.QUERY_LOG_COMMENTS + id, 0, -1).then(res => query = res);
			return query;
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	guestLogin : async function (name, avatar) {
		try{
			let query = null;
			await client.getAsync(redisKeyMap.GUEST_MEMBERS + name).then( res => query = res)
			if(query){
				if(avatar == query){
					return SUCCESS;
				}else{
					return FAIL;
				}
			}else{
				await client.setAsync(redisKeyMap.GUEST_MEMBERS + name, avatar);
				return SUCCESS;
			}
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	verify: async function(name, pwd){
		let result = 0;
		let RetCode = -1;
		try{
			await client.sismemberAsync(redisKeyMap.USER_STATIC, name).then( res => result = res);
			if(result){
				await client.getAsync(redisKeyMap.QUERY_PASSWOD + name).then( res => {
					if( res == pwd){
						const userToken = md5(name + pwd + new Date().getTime());
						client.set(redisKeyMap.USER_TOKEN + name, userToken);
						RetCode = userToken;
					}else{
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
	},

	verifyToken: async function(name, token){
		try{
			let query = null;
			await client.getAsync(redisKeyMap.USER_TOKEN + name).then(res => query = res);
			if(token == query){
				return SUCCESS;
			}else{
				return FAIL;
			}
		}catch(err){
			console.log(err);
			return FAIL;
		}
	},

	getAlums: async function () {
		let ret = [];
		let alumIds = [];
		try{
			await client.smembersAsync(redisKeyMap.ALUM_STATIC).then( res => alumIds = res);
			for(let _ = 0 ; _ < alumIds.length ; _ ++){
				const alum = {id: alumIds[_]};
				await client.smembersAsync(redisKeyMap.QUERY_ALUM + alumIds[_]).then(res => alum.photos = res);
				await client.getAsync(redisKeyMap.QUERY_ALUM_DESC + alumIds[_]).then(res => alum.desc = res);
				ret.push(alum);
			};
			return ret;
		}catch(err){
			console.log(err);
			return [];
		}
	},

	addAlum: async function () {
		try{
			let ids = 0;
			await client.smembersAsync(redisKeyMap.ALUM_STATIC).then( res => ids = (res || []).length);
			await client.sadd(redisKeyMap.ALUM_STATIC, ids + 1);
			return 0;
		}catch(err){
			console.log(err);
			return -1;
		}
	},

	addPhotos: async function (id,photos) {
		let retCode = 0;
		try{
			await client.saddAsync(redisKeyMap.QUERY_ALUM + id, photos).then( res => retCode = res);
			return retCode;
		}catch(err){
			console.log(err);
			return -1;
		}
	},

	deletePhoto: async function (id, photo) {
		let retCode = 0;
		try{
			await client.sremAsync(redisKeyMap.QUERY_ALUM + id, photo).then( res => retCode = res);
			fs.unlink("uploads/" + photo, err => {
				if(err){
					console.log(err);
				}else{
					console.log("删除成功");
				}
			})
			return retCode;
		}catch(err){
			console.log(err);
			return -1;
		}
	}
}
