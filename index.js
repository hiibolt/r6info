const R6API = require('r6api.js').default;
const stats = require('rainbow-six-api');
const readline = require("readline");
const resemble = require("resemblejs");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
const email = "johnwhite86113@gmail.com";
const password = process.env['password'];
const r6api = new R6API({ email, password });


async function query(username, callback) {
	const profile = {
		username,
		pfp: null,
		siege: null,
		games: [],
		linked: [],
		yearsplayed: null,
		score: 100,
	};
	
	/** Grab basic Ubisoft-provided data **/
	let invalid = false;
	await r6api.findByUsername('uplay',username).then((result) => {
		if(result.length == 0){
			invalid = true;
		}
		profile._ubi = result[0];
	});
	if(invalid){
		console.log("Please provide a valid Uplay tag..");
		return;
	}
	profile._userId = profile._ubi.userId;
	profile.pfp = profile._ubi.avatar['256'];
	profile.linked = (await r6api.findById('all', profile._userId, { isUserId: true })).map(i=>i.platform);
	
	/** Calculate score non-standard pfp **/
	let similarity = resemble('comp.png').compareTo(profile.pfp).ignoreColors();
	let res = await new Promise((resolve) => similarity.onComplete(resolve));
	profile.score += res.rawMisMatchPercentage == 0 ? -10 : 1;

	/** Calculate based on additional linked platforms **/
	profile.score += (profile.linked.length - 1) * 10;

	/** Calculate based on name **/
	profile.score += Math.max(4 - profile.username.length, -5);

	/** Calculate based on owned titles **/
	profile._appdata = (await r6api.getProfileApplications(profile._userId, { isUserId: true }))[0];
	if(profile._appdata){
		profile.games = profile._appdata.applications;
		profile.score += (profile.games.length - 2) * 10;
	}else{
		profile.score -= 10;
	}

	/** Calculate based on first played **/
	if(profile.games && profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege")){
		profile.siege = profile.games.find(i => i.name == "Tom Clancy's Rainbow Six Siege");
		profile.yearsplayed = (Date.now()-Date.parse(profile.siege.firstPlayedAt))*0.0000000000317098;
		profile.score += (profile.yearsplayed - 1) * 7.5;
	}

	/** Clean up and present data **/
	delete profile._ubi;
	delete profile._appdata;
	delete profile._userId;
	profile.score = Math.ceil(profile.score * 100) / 100;
	profile.yearsplayed = Math.ceil(profile.yearsplayed * 100) / 100;
	profile.games = profile.games.map(i => i.name == null ? "Unknown Title" : i.name);
	console.log(profile)
	/**
	if (data.info.id) {
		data.status = (await r6api.getUserStatus(data.info.id))[0];
		data.apps = (await r6api.getProfileApplications(data.info.id, { fetchApplications: true }))[0];
		console.log(data.apps)
		data.ranks = (await r6api.getRanks('uplay', '0b95544b-0228-49a7-b338-6d15cfbc3d6a', { regionIds: 'ncsa', boardIds: 'pvp_ranked', seasonIds: [23, 24] }))[0];
		console.log(data)
		if (data.apps && data.status) {
			score += (data.apps.applications.length - 4);
			score += (4 - data.info.username.length);
		
		if (data.apps == undefined) {
			score = "Autoclaimed Name"
			
		
	data.check = await r6api.validateUsername(user);
	if (!data.info) {
		score = "Not taken"
		
	if (data.check.valid == false && data.check.validationReports[0].message !== 'NameOnPlatform is not available') {
		score += ", invalid under Ubi naming";
		
	if (data.ranks.seasons) {
		let stats = data.ranks.seasons['24'].regions.ncsa.boards.pvp_ranked;
		console.log(stats.current)
		
	callback.raw(data.ranks.seasons['24'].regions.ncsa);
	callback.score(score);
	 catch (err) {
	if (!err.toString().includes('429')) {
		console.log("Name doesn't exist\n" + err)
		 else {
		console.log('Rate limited. FUCK')
		
	return -1;
	**/
};
rl.on('line', (input) => {
	query(input, {
		raw: function(data) {
			console.log(data)
		},
		score: function(data) {
			if (Number.isInteger(data)) {
				console.log('Score: ' + data)
			} else {
				console.log(data)
			}
		}
	})
});

