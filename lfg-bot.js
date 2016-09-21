var eris = require('eris');
var fs = require('graceful-fs');

var secret = require('./src/secret.json');
var config = require('./src/config.json');
var data = require('./src/data.json');

var client = new eris("Bot " + secret.token);

client.connect();

setInterval(clean,6e4);
setInterval(update,3e5);

client.on('ready', () => {
	console.log('Ready to play!');
});

client.on('messageCreate', (m) => {
	if(m.content.startsWith('!lfg ') && m.channel.guild.id === '198139711678578688') { // New entry to lfg listing
		
		let args = m.content.split(' ').slice(1);
		args = format(m.author,args);
		/*
		Competitive Format:
			!lfg comp pc na plat
		Casual Format:
			!lfg casual pc na
		*/

		if(!args) { // Formatting found an error
			return;
		}
		let mode = findUserMode(m.author.id);
		if(mode) { // Delete old entry if user already made one
			delete data[mode][m.author.id];
		}

		let listing = {
			username: `${m.author.username}#${m.author.discriminator}`,
			uid: m.author.id,
			platform: args[1],
			region: args[2],
			tier: args[3],
			timestamp: new Date().getTime()
		}

		data[args[0]][m.author.id] = listing;
		save(['data']);
		update();

		/*
		let str = `**Discord Username:** ${listing.username}  **Mode:** ${args[0]}  **Platform:** ${listing.platform}`;
		str += `  **Region:** ${listing.region}  **Tier:** ${listing.tier}`;
		client.createMessage(m.channel.id, str);
		*/
	}
});

function PM(id,content) {
	client.getDMChannel(id).then((c) => {
		client.createMessage(c.id,content);
	});
}

function findUserMode(id) { // Determines which mode a user has an entry in, if any
	if(data.Competitive[id]) return 'Competitive';
	if(data.Casual[id]) return 'Casual';
	if(data.Brawl[id]) return 'Brawl';
	return null;
}

function clean() { // Cleans old entries from the data object
	let time = config.delete_interval*1000*60;
	let now = new Date().getTime();
	let flag = 0; // Check if any entries were deleted
	for(var key in data.Competitive) { // Get comp listings
		if(data.Competitive.hasOwnProperty(key)) {
			let l = data.Competitive[key];
			if(now-l.timestamp > time) {
				delete data.Competitive[key];
				flag = 1;
			}
		}
	}
	for(var key in data.Casual) { // Get comp listings
		if(data.Casual.hasOwnProperty(key)) {
			let l = data.Casual[key];
			if(now-l.timestamp > time) {
				delete data.Casual[key];
				flag = 1;
			}
		}
	}
	for(var key in data.Brawl) { // Get comp listings
		if(data.Brawl.hasOwnProperty(key)) {
			let l = data.Brawl[key];
			if(now-l.timestamp > time) {
				delete data.Brawl[key];
				flag = 1;
			}
		}
	}
	if(flag) {
		save(['data']);
	}
}

function update() {
	let str = '**Competitive Listings**\n--------------------\n';
	let flag = 0; // Are there any listings?
	for(var key in data.Competitive) { // Get comp listings
		if(data.Competitive.hasOwnProperty(key)) {
			flag = 1; // Yes there are!
			let l = data.Competitive[key]; // Store listing to something short
			str += `**Discord Username:** ${l.username}  **Platform:** ${l.platform}  **Region:** ${l.region}  **Tier:** ${l.tier}\n`;
		}
	}
	if(!flag) {
		str += '*No competitive listings found*\n';
	}

	str += '\n**Casual Listings**\n--------------------\n';
	flag = 0; // Are there any listings?
	for(var key in data.Casual) { // Get casual listings
		if(data.Casual.hasOwnProperty(key)) {
			flag = 1; // Yes there are!
			let l = data.Casual[key]; // Store listing to something short
			str += `**Discord Username:** ${l.username}  **Platform:** ${l.platform}  **Region:** ${l.region}\n`;
		}
	}
	if(!flag) {
		str += '*No casual listings found*\n';
	}

	str += '\n**Brawl Listings**\n--------------------\n';
	flag = 0; // Are there any listings?
	for(var key in data.Brawl) { // Get brawl listings
		if(data.Brawl.hasOwnProperty(key)) {
			flag = 1; // Yes there are!
			let l = data.Brawl[key]; // Store listing to something short
			str += `**Discord Username:** ${l.username}  **Platform:** ${l.platform}  **Region:** ${l.region}\n`;
		}
	}
	if(!flag) {
		str += '*No brawl listings found*\n';
	}

	str += '\nCreate a new listing using the **!lfg** command. Type **!lfghelp** for more info!';

	if(!data.mid) { // Persistent message doesn't appear to exist, create it and save
		client.createMessage(config.lfg,str).then((m) => {
			console.log('Created persistent message!');
			data.mid = m.id;
			save(['data']);
		});
	}
	else{
		client.editMessage(config.lfg,data.mid,str);
	}
}

function save(arr) { // Save all files in array
	if(arr.includes('config')) { // Save configuration file
		fs.writeFile('./src/config.json', JSON.stringify(config,null,4), function(err) {
			if(err) console.log(err);
		});
	}
	if(arr.includes('data')) { // Save data file
		fs.writeFile('./src/data.json', JSON.stringify(data,null,4), function(err) {
			if(err) console.log(err);
		});
	}
}

function format(user,args) { // Format data into something we like
	// Mode select
	if(args[0].match(/(cas|q.{4,6}p|unrank)/i)) { // Matches casual
		args[0] = 'Casual';
	}
	else if(args[0].match(/(comp|rank)/i)) { // Matches ranked
		args[0] = 'Competitive';
	}
	else if(args[0].match(/(brawl|week)/i)) { // Matches brawl
		args[0] = 'Brawl';
	}
	else {
		let str = "Your listing was not created because you did not provide a valid mode.";
		str += "\nA valid listing looks something like this: `!lfg casual PC NA`";
		PM(user.id,str);
		return null;
	}

	// Platform select
	if(args[1].match(/pc/i)) {
		args[1] = 'PC';
	}
	else if(args[1].match(/ps/i)) {
		args[1] = 'PS4';
	}
	else if(args[1].match(/x/i)) {
		args[1] = 'XBOX';
	}
	else {
		let str = "Your listing was not created because you did not provide a valid platform.";
		str += "\nA valid listing looks something like this: `!lfg casual PC NA`";
		PM(user.id,str);
		return null;
	}

	// Region select
	if(args[2].match(/na/i)) {
		args[2] = 'NA';
	}
	else if(args[2].match(/eu/i)) {
		args[2] = 'EU';
	}
	else if(args[2].match(/(oce|asi)/i)) {
		args[2] = 'OCE';
	}
	else {
		let str = "Your listing was not created because you did not provide a valid region.";
		str += "\nA valid listing looks something like this: `!lfg casual PC NA`";
		PM(user.id,str);
		return null;
	}

	// Rank select
	if(args[0] === 'Competitive') {
		if(args[4]) {
			args[3] = args[3] + args[4]; // In case of multi-word ranks (Grand Master)
		}
		if(args[3].toLowerCase().includes('bronze')) {
			args[3] = 'Bronze';
		}
		else if(args[3].toLowerCase().includes('silv')) {
			args[3] = 'Silver';
		}
		else if(args[3].toLowerCase().includes('gold')) {
			args[3] = 'Gold';
		}
		else if(args[3].toLowerCase().includes('plat')) {
			args[3] = 'Platinum';
		}
		else if(args[3].toLowerCase().includes('dia')) {
			args[3] = 'Diamond';
		}
		else if(args[3].toLowerCase().includes('g') && args[3].toLowerCase().includes('m')) {
			args[3] = 'Grand Master';
		}
		else if(args[3].toLowerCase().includes('mas')) {
			args[3] = 'Master';
		}
		else {
			let str = "Your listing was not created because you did not provide a valid rank.";
			str += "\nA valid listing looks something like this: `!lfg competitive PC NA Platinum`";
			PM(user.id,str);
			return null;
		}
	}

	return args;
}