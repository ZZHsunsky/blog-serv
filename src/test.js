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

async function testGetLogs(){
	const id = 2;
	console.log( await mredis.getLogs());
}

async function testGetLogGroup(){
	console.log( await mredis.getLogGroup());
}

testGetLogs();