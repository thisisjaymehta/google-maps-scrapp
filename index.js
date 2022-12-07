// INPUTS
var location = "Rajkot";
var finalPathFile = "out.csv";

// IMPORTS
const { Builder, By, Key, until } = require("selenium-webdriver");
const fs = require("fs");
var csvWriter = require("csv-write-stream");
var async = require("async");

var pincodes = [];

function pause(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

fs.readFile("pincode.txt", async function (err, data) {
	if (err) throw err;
	pincodes = data.toString().split("\r\n");
	fs.readFile("categories.txt", async function (err, data) {
		if (err) throw err;
		var array = data.toString().split("\r\n");
		for (const item of array) {
			await scrape(item);
			// console.log(require('util').inspect(item, { showHidden: true, depth: null }))
		}
	});
});

// Read files

async function scrape(category) {
	return new Promise(async function (resolve, reject) {
		console.log(`Scrapping for ${category} in ${location}`);
		var driver = await new Builder().forBrowser("MicrosoftEdge").build();
		await pause(1000);
		try {
			await driver.get("https://www.google.com/maps/");
			await driver.manage().window().maximize();
			await driver.findElement(By.name("q")).sendKeys(`${category} in ${location}`, Key.RETURN);
			await driver.wait(until.elementLocated(By.css("div[role='article']")), 10000); // Wait till First iteam load
			var element = await driver.findElement(By.css(".m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd div")); // Places list with scroll bar
			element.click();

			var i = -1;
			var endLoop = true;
			while (endLoop) {
				i++;
				try {
					var places = await driver.findElements(By.css("div[role='article']")); // List of all elements

					let retry = 0;
					// Add new places by scrolling down
					while (places.length < i + 1) {
						// console.log(places.length, i);
						element.click();
						await pause(2000);
						element.sendKeys(Key.END);
						await pause(2000);
						element.sendKeys(Key.PAGE_UP);
						places = await driver.findElements(By.css("div[role='article']"));
						retry++;
						if (retry == 5) {
							endLoop = false;
							break;
						}
					}

					// Remove "Move to top" button
					try {
						let backtotop = await driver.findElement(By.css(".RiRi5e.Hk4XGb.Yt0HSb"));
						driver.executeScript(
							`let l = document.querySelectorAll(".RiRi5e.Hk4XGb.Yt0HSb");l[0].parentNode.removeChild(l[0]);`
						);
					} catch (e) {}

					await places[i].click(); // Click on ith item in list
					await pause(2000);
					await driver
						.wait(until.elementLocated(By.className("Io6YTe fontBodyMedium")), 10000)
						.then(() => {
							return true;
						})
						.catch((e) => {
							return true;
						}); // Wait until data is loaded

					// Name of place
					try {
						let name = await driver.findElement(By.css(".DUwDvf.fontHeadlineLarge span"));
						var nameValue = await name.getAttribute("innerHTML"); // Name of the place
					} catch (e) {
						var nameValue = "None";
					}

					try {
						let rating = await driver.findElement(By.css(".F7nice.mmu3tf span span span"));
						var ratingvalue = await rating.getAttribute("innerHTML"); // Ratings
					} catch (e) {
						var ratingvalue = "None";
					}

					try {
						let type = await driver.findElement(By.css("button[jsaction='pane.rating.category']"));
						var typevalue = await type.getAttribute("innerHTML"); // Category
					} catch (e) {
						var typevalue = "None";
					}

					try {
						let address = await driver.findElement(
							By.css("button[data-item-id='address'] > :first-child > :nth-child(2) > :first-child")
						);
						var addressValue = await address.getAttribute("innerHTML"); // Category
						let pincode = addressValue.substring(addressValue.length - 6);
						if (!pincodes.includes(pincode)) {
							break;
						}
					} catch (e) {
						var addressValue = "None";
					}

					try {
						let website = await driver.findElement(By.css("a[data-item-id='authority']"));
						var websiteValue = await website.getAttribute("href"); // Category
					} catch (e) {
						var websiteValue = "None";
					}

					try {
						let phone = await driver.findElement(
							By.css(
								"button[data-tooltip='Copy phone number'] > :first-child > :nth-child(2) > :first-child"
							)
						);
						var phoneValue = await phone.getAttribute("innerHTML"); // Category
					} catch (e) {
						var phoneValue = "None";
					}

					if (typevalue.toLowerCase() == category.toLowerCase()) {
						if (!fs.existsSync(finalPathFile))
							writer = csvWriter({
								headers: ["search_term", "name", "category", "rating", "address", "website", "phone"],
							});
						else writer = csvWriter({ sendHeaders: false });

						writer.pipe(fs.createWriteStream(finalPathFile, { flags: "a" }));
						writer.write({
							search_term: `${category} in ${location}`,
							name: nameValue,
							category: typevalue,
							rating: ratingvalue,
							address: addressValue,
							website: websiteValue,
							phone: phoneValue,
						});
						writer.end();
					}
				} catch (e) {
					console.log(e);
				} finally {
				}
			}
		} catch (e) {
		} finally {
			driver.quit();
			resolve();
		}
	});
}
