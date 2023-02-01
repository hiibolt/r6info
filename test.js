const r6info = require('api.js');

// Create a Ubisoft authorization
const api = r6info.generateAPIHook({ 
	email: ",", 
	password: ",",
});

async function lookup(){
	// Get the 'hook' object forr Spoit.KOI
	let hook = await api.hookPlayerById({
		id: 'cc3a555f-97fa-49e3-a7b4-f592d23e66fe'
	});

	/** LOOKUP **/
	// Find what platforms the player is on
	let platforms = await api.findPlatforms(hook);
	console.log(platforms);

	// Find what applications they own (Not 100% accurate, only includes Ubisoft applications)
	let applications = await api.getAllApplications(hook);
	console.log(applications);

	// Find their smurfs
	let smurfs = await api.getSmurfs(hook);
	console.log(smurfs);

	// Get their detailed statistics
	let statistics = await api.getStatistics(hook);
	console.log(statistics);

	// Check if they have the default pfp
	let hasDefaultPFP = await api.hasDefaultPFP(hook);
	console.log(hasDefaultPFP);

	
	/** PROFILING **/
	// Fetch his basic stats to get a 'profile' object. You can use generateDetailedProfile() to get more info with the same arguments.
	let profile = await api.generateSimpleProfile(hook, {debug:true});
	console.log(profile);

	// Rate the likelihood they are cheating
	let rating = await api.calculateRating(profile);
	console.log(rating);
}
lookup();


/** 
	A simple program that:
   - Reads console input
	 - Calls for profile
	 - Checks if they are cheating
	 - Prints both results
 searches for a Uplay account and rates the chance they are cheating
**/
const readline = require("readline");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
rl.on('line', (username) => {
	api.hookPlayer({ 
		platform: 'uplay', 
		username
	}).then((hook)=>{
		api.generateSimpleProfile(hook).then((player)=>{
			api.calculateRating(player).then((rating)=>{
				console.log(player, rating);
			});
		});
	}).catch(err => console.log(err));
});

