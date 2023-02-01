const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const R6API = require('r6api.js').default;
const resemble = require("resemblejs");
const valid_seasons = ['Solar Raid', 'Brutal Swarm', 'Vector Glare', 'Demon Veil', 'High Calibre', 'Crystal Guard', 'North Star', 'Crimson Heist', 'Neon Dawn', 'Shadow Legacy', 'Steel Wave', 'Void Edge', 'Shifting Tides', 'Ember Rise', 'Phantom Sight'].map(i => i.toLowerCase().replace(/\s/g, '-'));

function generateAPIHook(options) {
	return new R6API({
		email: options.email,
		password: options.password
	});
}
R6API.prototype.calculateRating = async function(profile) {
	if (!profile) {
		throw new Error("Please pass a valid player object. You can create one via .hookPlayer().");
	}
	if (profile.verified) {
		return "This is a well known or verified player.";
	}
	if (profile.banned) {
		return "This player has already been banned.";
	}
	if (profile.score > 150) {
		return "Very likely a legitimate player.";
	}
	if (profile.score > 90) {
		return "Possible cheater or new player/account.";
	}
	if (profile.score > 50) {
		return "Definite cheater.";
	}
	if (profile.score <= 50) {
		return "Rage cheater/Server Hitter.";
	}
	throw new Error('Invalid player data');
}
R6API.prototype.hookPlayerByID = async function(options) {
	let invalid, value;
	await this.findById('all', options.id, { isUserId: true }).then((result) => {
		if (result.length == 0) {
			invalid = true;
		}
		value = result[0];
	});
	if (invalid) {
		throw new Error("Provide a valid username and/or platform.");
	}
	return value;
}
R6API.prototype.hookPlayerByName = async function(options) {
	let invalid, value;
	await this.findByUsername(options.platform, options.username).then((result) => {
		if (result.length == 0) {
			invalid = true;
		}
		value = result[0];
	});
	if (invalid) {
		throw new Error("Provide a valid username and/or platform.");
	}
	return value;
}
R6API.prototype.findPlatforms = async function(player) {
	if (!player || !player.userId) {
		throw new Error("Please pass a valid hook object. You can create one via .hookPlayer().");
	}
	return await this.findById('all', player.userId, {
		isUserId: true
	});
}
R6API.prototype.getAllApplications = async function(player) {
	if (!player || !player.userId) {
		throw new Error("Please pass a valid hook object. You can create one via .hookPlayer().");
	}
	return (await this.getProfileApplications(player.userId, {
		isUserId: true
	}))[0];
}
R6API.prototype.getSmurfs = async function(player) {
	if (!player || !player.userId) {
		throw new Error("Please pass a valid hook object. You can create one via .hookPlayer().");
	}
	return await (await fetch('https://r6.apitab.net/website/profiles/' + player.userId + '/smurfs', {
		"Content-Type": "application/json"
	}).catch(console.err))
		.json();
}
R6API.prototype.getStatistics = async function(player) {
	if (!player || !player.userId) {
		throw new Error("Please pass a valid hook object. You can create one via .hookPlayer().");
	}
	return (await fetch('https://r6.apitab.net/website/profiles/' + player.userId, {
		"Content-Type": "application/json"
	}).catch(console.err))
		.json();
}
R6API.prototype.hasDefaultPFP = async function(player) {
	if (!player || !player.avatar['256']) {
		throw new Error("Please pass a valid hook object. You can create one via.hookPlayer().");
	}
	return (await new Promise((resolve) => {
		resemble('src/comp.png')
			.compareTo(player.avatar['256'])
			.ignoreColors()
			.onComplete(resolve)
	})).rawMisMatchPercentage == 0;
}
//async function grabUbiProfile(generator,)
R6API.prototype.generateSimpleProfile = async function(hook, options) {
	let profile = {};

	/** Grab Ubisoft and Tabstats-provided data **/
	if (options && options.debug) { console.log('(1/6) Verifying basic data...'); }
	if (!hook) {
		throw new Error("Please pass a valid hook object.")
	}
	profile = {
		_ubi: hook,
		username: hook.username,
		pfp: null,
		games: [],
		linked: [],
		score: 100,
	};

	if (options && options.debug) { console.log('(2/6) Analyzing avatar...'); }
	profile._defaultPFP = await this.hasDefaultPFP(profile._ubi);

	if (options && options.debug) { console.log('(3/6) Fetching linked platforms...'); }
	profile.linked = await this.findPlatforms(profile._ubi);

	if (options && options.debug) { console.log('(4/6) Fetching applications...'); }
	profile._appdata = await this.getAllApplications(profile._ubi);

	if (options && options.debug) { console.log('(5/6) Fetching statistics...'); }
	profile._tabstats = await this.getStatistics(profile._ubi);

	if (options && options.debug) { console.log('(6/6) Fetching linked accounts...'); }
	profile._smurfs = await this.getSmurfs(profile._ubi);


	/** Add PFP to return object **/
	profile.pfp = profile._ubi.avatar['500'];

	/** Calculate score non-standard pfp **/
	profile.score += profile._defaultPFP ? -10 : 1;

	/** Calculate based on additional linked platforms **/
	profile.score += (profile.linked.length - 1) * 10;

	/** Calculate based on name **/
	profile.score += Math.max(4 - profile.username.length, -5);

	/** Calculate based on owned titles **/
	if (profile._appdata) {
		profile.games = profile._appdata.applications;
		profile.score += (profile.games.length - 2) * 10;
	} else {
		profile.autoclaimed = true;
		profile.score -= 10;
	}

	/** Calculate based on first played **/
	if (profile.games && profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege")) {
		profile._siege = profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege");
		profile.yearsplayed = (Date.now() - Date.parse(profile._siege.firstPlayedAt)) * 0.0000000000317098;
		profile.score += (profile.yearsplayed - 1) * 7.5;
		profile.yearsplayed = (profile.yearsplayed).toFixed(2);
	}

	/** Compute based on raw KD **/
	profile.score += ((profile._tabstats.profile.kd - 0.9) ** 3) * -50;

	/** Computer based on raw HS **/
	// can't find this for some reason

	/** Computer based on KD trendline **/
	let flattened_seasons = profile._tabstats.ranked_records
		.map(regions => regions[0])
		.filter(season => valid_seasons.includes(season.season_slug));
	profile.kd = {
		avg: flattened_seasons.reduce((total, new_element) => total + new_element.kd, 0) / flattened_seasons.length,
	}
	if (flattened_seasons.length > 3 && flattened_seasons[0].kd > 1 && flattened_seasons[0].wins + flattened_seasons[0].losses > 20) {
		// Calculate lifetime and recent slope lines for kd
		profile.kd.recent_slope = (flattened_seasons[0].kd - flattened_seasons[1].kd) / 2;
		profile.kd.lifetime_slope = (flattened_seasons[0].kd - flattened_seasons[flattened_seasons.length - 1].kd) / flattened_seasons.length;

		// Calculate the difference between recent and lifetime KD slope
		profile.kd.shift = profile.kd.lifetime_slope * 100 - profile.kd.recent_slope * 100;

		// Exaggerate the difference between recent and lifetime slope and adjust score accordingly
		profile.score += profile.kd.shift ** 3 / 50;

		// Make KD more readable
		profile.kd.avg = profile.kd.avg.toFixed(2);
		profile.kd.recent_slope = profile.kd.recent_slope.toFixed(2);
		profile.kd.lifetime_slope = profile.kd.lifetime_slope.toFixed(2);
		profile.kd.shift = (profile.kd.shift > 0 ? '' : '+') + -profile.kd.shift.toFixed(2) + '%';
	} else {
		profile.newplayer = true;
		profile.score -= 10;
	}

	/** Add smurfs to return object **/
	if (profile._smurfs.length > 0) {
		profile.accounts = profile._smurfs.map(smurf => smurf.profile.display_name);
	}

	/** Check for banned smurfs **/
	if (profile._smurfs.filter(smurf => smurf.profile.is_cheater).length > 0) {
		profile.bannedaccounts = profile._smurfs.filter(smurf => smurf.profile.is_cheater).map(smurf => smurf.profile.display_name);
		profile.score -= (profile.bannedaccounts.length ** 2) * 20;
	}

	/** Adjust for each non-banned account **/
	if (profile.accounts > 0 && profile._smurfs.filter(smurf => smurf.profile.is_cheater).length > 0) {
		profile.score += (profile.accounts + 1) ** 3;
	}

	/** Check ff player has already been banned **/
	if (profile._tabstats.profile.is_cheater) {
		profile.score -= 200;
		profile.banned = true;
	}

	/** Check if player has been verified **/
	if (profile._tabstats.profile.is_verified) {
		profile.score += 100;
		profile.verified = true;
	}

	/** Clean up and present data **/
	delete profile._ubi;
	delete profile._siege;
	delete profile._smurfs;
	delete profile._appdata;
	delete profile._tabstats;
	delete profile._defaultPFP;

	profile.score = (profile.score).toFixed(2);
	profile.games = profile.games.map(i => i.name == null ? "Unknown Title" : i.name);

	return profile;
};
R6API.prototype.generateDetailedProfile = async function(hook) {
	let profile = {};

	/** Grab Ubisoft and Tabstats-provided data **/
	console.log('(1/6) Verifying basic data...');
	if (!hook) {
		throw new Error("Please pass a valid hook object.")
	}
	profile = {
		_ubi: hook,
		username: hook.username,
		pfp: null,
		games: [],
		linked: [],
		score: 100,
	};

	console.log('(2/6) Analyzing avatar...')
	profile.defaultPFP = await this.hasDefaultPFP(profile._ubi);

	console.log('(3/6) Fetching linked platforms...');
	profile.linked = await this.findPlatforms(profile._ubi);

	console.log('(4/6) Fetching applications...');
	profile.appdata = await this.getAllApplications(profile._ubi);

	console.log('(5/6) Fetching statistics...');
	profile.tabstats = await this.getStatistics(profile._ubi);

	console.log('(6/6) Fetching linked accounts...');
	profile.smurfs = await this.getSmurfs(profile._ubi);


	/** Add PFP to return object **/
	profile.pfp = profile._ubi.avatar['500'];

	/** Calculate score non-standard pfp **/
	profile.score += profile._defaultPFP ? -10 : 1;

	/** Calculate based on additional linked platforms **/
	profile.score += (profile.linked.length - 1) * 10;

	/** Calculate based on name **/
	profile.score += Math.max(4 - profile.username.length, -5);

	/** Calculate based on owned titles **/
	if (profile._appdata) {
		profile.games = profile._appdata.applications;
		profile.score += (profile.games.length - 2) * 10;
	} else {
		profile.autoclaimed = true;
		profile.score -= 10;
	}

	/** Calculate based on first played **/
	if (profile.games && profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege")) {
		profile.siege = profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege");
		profile.yearsplayed = (Date.now() - Date.parse(profile._siege.firstPlayedAt)) * 0.0000000000317098;
		profile.score += (profile.yearsplayed - 1) * 7.5;
		profile.yearsplayed = (profile.yearsplayed).toFixed(2);
	}

	/** Compute based on raw KD **/
	profile.score += ((profile.tabstats.profile.kd - 0.9) ** 3) * -50;

	/** Computer based on raw HS **/
	// can't find this for some reason

	/** Computer based on KD trendline **/
	let flattened_seasons = profile.tabstats.ranked_records
		.map(regions => regions[0])
		.filter(season => valid_seasons.includes(season.season_slug));
	profile.kd = {
		avg: flattened_seasons.reduce((total, new_element) => total + new_element.kd, 0) / flattened_seasons.length,
	}
	if (flattened_seasons.length > 3 && flattened_seasons[0].kd > 1 && flattened_seasons[0].wins + flattened_seasons[0].losses > 20) {
		// Calculate lifetime and recent slope lines for kd
		profile.kd.recent_slope = (flattened_seasons[0].kd - flattened_seasons[1].kd) / 2;
		profile.kd.lifetime_slope = (flattened_seasons[0].kd - flattened_seasons[flattened_seasons.length - 1].kd) / flattened_seasons.length;

		// Calculate the difference between recent and lifetime KD slope
		profile.kd.shift = profile.kd.lifetime_slope * 100 - profile.kd.recent_slope * 100;

		// Exaggerate the difference between recent and lifetime slope and adjust score accordingly
		profile.score += profile.kd.shift ** 3 / 50;

		// Make KD more readable
		profile.kd.avg = profile.kd.avg.toFixed(2);
		profile.kd.recent_slope = profile.kd.recent_slope.toFixed(2);
		profile.kd.lifetime_slope = profile.kd.lifetime_slope.toFixed(2);
		profile.kd.shift = (profile.kd.shift > 0 ? '' : '+') + -profile.kd.shift.toFixed(2) + '%';
	} else {
		profile.newplayer = true;
		profile.score -= 10;
	}

	/** Add smurfs to return object **/
	if (profile.smurfs.length > 0) {
		profile.accounts = profile._smurfs.map(smurf => smurf.profile.display_name);
	}

	/** Check for banned smurfs **/
	if (profile.smurfs.filter(smurf => smurf.profile.is_cheater).length > 0) {
		profile.bannedaccounts = profile._smurfs.filter(smurf => smurf.profile.is_cheater).map(smurf => smurf.profile.display_name);
		profile.score -= (profile.bannedaccounts.length ** 2) * 20;
	}

	/** Adjust for each non-banned account **/
	if (profile.accounts > 0 && profile.smurfs.filter(smurf => smurf.profile.is_cheater).length > 0) {
		profile.score += (profile.accounts + 1) ** 3;
	}

	/** Check ff player has already been banned **/
	if (profile.tabstats.profile.is_cheater) {
		profile.score -= 200;
		profile.banned = true;
	}

	/** Check if player has been verified **/
	if (profile.tabstats.profile.is_verified) {
		profile.score += 100;
		profile.verified = true;
	}

	/** Present data **/
	return profile;
};
module.exports = {
	R6API, generateAPIHook
};