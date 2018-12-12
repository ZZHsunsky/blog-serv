 const mredis = require("./mredis");


async function testAppendLog(){
	const blog = {
		title:"title",
		image:"1.png",	
	}
	console.log( await mredis.expendLog(blog));
}

async function testRemoveLog(){
	const id = 2;
	console.log( await mredis.removeLog(id));
}

async function testGetLog(){
	const id = 2;
	console.log ( await mredis.getLog(id) );
}

async function testGetLogs(){
	const id = 2;
	const logs = await mredis.getLogs(3);
	console.log(logs.length)
}

async function testGetLogGroup(){
	console.log( await mredis.getLogGroup());
}

async function testGetAlums() {
	console.log( await mredis.getAlums());
}

async function testAddAlums() {
	console.log( await mredis.addAlum());
}

async function testAddPhotos(id, photos) {
	console.log( await mredis.addPhotos(id, photos))
}

async function testDeletePhoto(id, photo) {
	console.log( await mredis.deletePhoto(id, photo))
}
async function testLogReadPlus(id) {
	console.log( await mredis.logReadPlus(id))
}

async function testGuestLogin(name, avatar) {
	console.log( await mredis.guestLogin(name, avatar))
}

testGuestLogin("denghuo97", 3);