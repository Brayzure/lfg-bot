var eris = require('eris');
var fs = require('graceful-fs');

var secret = require('./src/secret.json');
var config = require('./src/config.json');
var data = require('./src/data.json');

var client = new eris("Bot " + secret.token);
var self;

client.connect();

setInterval(clean,6e4);
setInterval(update,3e5);

client.on('error', console.log);

client.on('ready', () => {
	console.log('Ready to play!');
	self = client.getSelf();
});

client.on('messageCreate', (m) => {
	if(m.channel.id === config.lfg) { // Posted in lfg channel
		if(m.author.id !== self.id) {
			client.deleteMessage(m.channel.id,m.id);
		}

		if(m.content.startsWith('!lfg')) { // New entry to lfg listing
			if(m.content.startsWith('!lfghelp') || m.content === '!lfg') { // lfghelp
				let str = 'Hello! I am a bot developed by **Brayzure#9406**! I generate a list of Overwatch games that are currently being hosted';
				str += ' by other users.\nYou can add your game to the list by typing `!lfg <mode> <platform> <region> <tier (if competitive)>`.';
				str += '\nYour listing is automatically removed after 30 minutes, or whenever you type `!remove`.'
				PM(m.author.id,str);
				return;
			}

			let args = m.content.split(' ').slice(1);
			if(args.length < 3) {
				let str = "Your listing was not created because you did not supply enough arguments!";
				str += "\nA valid listing looks something like this: `!lfg casual PC NA`";
				PM(m.author.id,str);
				return;
			}
			args = format(m.author,args); // Format user-submitted data
			
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
				timestamp: new Date().getTime(),
				voice: null
			}

			if(m.member.voiceState.channelID) {
				let cid = m.member.voiceState.channelID;
				let gid = client.channelGuildMap[cid];
				listing.voice = client.guilds.get(gid).channels.get(cid).name;
				//console.log(voice);
			}

			data[args[0]][m.author.id] = listing;
			save(['data']);
			update();
		}
		if(m.content.startsWith('!remove') && m.channel.guild.id === '198139711678578688') { // Remove user listing
			let mode = findUserMode(m.author.id);
			if(mode) {
				delete data[mode][m.author.id];
				save(['data']);
				update();
			}
		}

	}
	
});

client.on('voiceChannelJoin', (member, newC) => {
	setTimeout(function _wait() {
		let mode = findUserMode(member.id);
		if(!mode) {
			return;
		}
		data[mode][member.id].voice = newC.name;
		save(['data']);
		update();
	},500);
});

client.on('voiceChannelLeave', (member, oldC) => {
	let mode = findUserMode(member.id);
	if(!mode) {
		return;
	}
	data[mode][member.id].voice = null;
	save(['data']);
	update();
});

client.on('voiceChannelSwitch', (member, newC, oldC) => {
	let mode = findUserMode(member.id);
	if(!mode) {
		return;
	}
	data[mode][member.id].voice = newC.name;
	save(['data']);
	update();
});

function PM(id,content) { // Send PM
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
		update();
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
			str += `**Discord Username:** <@${l.uid}>  **Platform:** ${l.platform}  **Region:** ${l.region}  **Tier:** ${l.tier}  **Channel:** ${(l.voice) ? l.voice : '*None*'}\n`;
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
			str += `**Discord Username:** <@${l.uid}>  **Platform:** ${l.platform}  **Region:** ${l.region}  **Channel:** ${(l.voice) ? l.voice : '*None*'}\n`;
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
			str += `**Discord Username:** <@${l.uid}>  **Platform:** ${l.platform}  **Region:** ${l.region}  **Channel:** ${(l.voice) ? l.voice : '*None*'}\n`;
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
	// Mode format
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

	// Platform format
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

	// Region format
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

	// Rank format
	if(args[0] === 'Competitive') {
		if(!args[3]) {
			let str = "Your listing was not created because you did not provide a rank.";
			str += "\nA valid listing looks something like this: `!lfg competitive PC NA Platinum`";
			PM(m.author.id,str);
			return null;
		}
		if(args[4]) {
			args[3] = args[3] + args[4]; // In case of multi-word ranks (Grand Master)
		}
		if(args[3].match(/bron/i)) {
			args[3] = 'Bronze';
		}
		else if(args[3].match(/silv/i)) {
			args[3] = 'Silver';
		}
		else if(args[3].match(/gold/i)) {
			args[3] = 'Gold';
		}
		else if(args[3].match(/plat/i)) {
			args[3] = 'Platinum';
		}
		else if(args[3].match(/dia/i)) {
			args[3] = 'Diamond';
		}
		else if(args[3].match(/g.{0,10}m/i)) {
			args[3] = 'Grand Master';
		}
		else if(args[3].match(/mas/i)) {
			args[3] = 'Master';
		}
		else if(args[3].match(/(500|t.{0,3}5)/i)) {
			args[3] = 'Top 500';
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