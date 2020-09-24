const fetch = require("node-fetch");
const fs = require("fs");
var errorCount = 0;
var itemLength = 0;

const headers = {
	"Authorization": "",
	"Origin": "https://www.pokemoncenter.com"
}

//TODO: Add scraper to fetch updated auth token at the start of each week
//Read token.txt and pass contents to fetchStatusFile
function fetchToken() {
	itemLength = 0;
	fs.readFile("token.txt", "utf8", fetchStatusFile);
}

//Once every 5 minutes, call fetchToken
setInterval(fetchToken, 300000);
fetchToken()

//Read status.json and pass contents to parseStatusFile
function fetchStatusFile(err, data) {
	if(err) {
		console.error(err);
	}
	else {
		headers["Authorization"] = data;
		fs.readFile("status.json", 'utf8', parseStatusFile);
	}
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
	itemLength = itemList.length;
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
	item.status = await getStatus(item.url, item.status);
	return item;
}

//Make a request for the url specified, parse the page data with parsePage, and update the status accordingly
async function getStatus(url, oldStatus) {
	try {
		const productID = url.substring(38, 47);
		const res = await fetch("https://www.pokemoncenter.com/tpci-ecommweb-api/product?format=zoom.nodatalinks", {method: "post", headers: headers, body: '{"productSku":"' + productID + '"}'});
		if(res.ok) {
			errorCount = 0;
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
			console.error("Could not fetch " + url + " - " + res.status + " - " + res.statusText);
			if(res.status == 401) {
				return "invalid_token";
			}
			else {
				errorCount++;
				if(errorCount > itemLength) {
					return "unknown";
				}
				else {
					return oldStatus;
				}
			}
		}
	}
	catch(err) {
		console.error(err);
		return "unknown";
	}
}