const fetch = require("node-fetch");
const fs = require("fs");

//TODO: Add scraper to fetch updated auth token at the start of each week
const headers = {
	"Authorization": process.env.token;
}

//Once every 5 minutes, call fetchStatusFile
setInterval(fetchStatusFile, 300000);

//Read status.json and pass contents to parseStatusFile
function fetchStatusFile() {
	fs.readFile("status.json", 'utf8', parseStatusFile);
}

//Parse the JSON file into an array and pass it to updateItems
function parseStatusFile(err, data) {
	if(err) {
		console.error(err);
	}
	else {
		try {
			var itemList = JSON.parse(data);
			updateItems(itemList);
		}
		catch(err) {
			console.error(err);
		}
	}
}

//For each item in the list, call updateItemStatus, then pass the results to updateStatusFile
async function updateItems(itemList) {
	for(var i=0; i<itemList.length; i++) {
		itemList[i] = await updateItemStatus(itemList[i]);
	}
	updateStatusFile(itemList);
}

//Create JSON data of the item list and write to status.json
function updateStatusFile(itemList) {
	const fileOutput = JSON.stringify(itemList);
	fs.writeFile("status.json", fileOutput, handleFileError);
}

//Log any errors writing to the status file
function handleFileError(err) {
	if(err) {
		console.error(err);
	}
}

//Get the status of an item from PokeCenter by calling getStatus and update the status field
async function updateItemStatus(item) {
	item.status = await getStatus(item.url);
	return item;
}

//Make a request for the url specified, parse the page data with parsePage, and update the status accordingly
async function getStatus(url) {
	try {
		const productID = url.substring(38, 47);
		const res = await fetch("https://www.pokemoncenter.com/tpci-ecommweb-api/product?format=zoom.nodatalinks", {method: "post", headers: headers, body: '{"productSku":"' + productID + '"}'});
		if(res.ok) {
			const body = await res.text();
			const index = body.indexOf("state");
			const state = body.substring(index + 6, index + 15);
			if(state.indexOf("NOT") == -1) {
				return "available";
			}
			else {
				return "not_available";
			}
		}
		else {
			console.error("Could not fetch " + url + " - " + res.statusText);
			return "unknown";
		}
	}
	catch(err) {
		console.error(err);
		return "unknown";
	}
}