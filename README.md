# A package which is intended for grabbing hidden details on an R6 player via the Tabstats and Ubisoft API
Asynchronous wrapper for both Ubisoft and Tabstats API, build with Fetch and r6api
Due to the fact that Ubisoft's website requires auth, a Ubisoft account with email and password are required.

Although I will likely implement a more efficient method later, credit to @vince144 for his incredible package and documentation.

## Basics
All programs require creating a Ubisoft authorization
```
const api = r6info.generateAPIHook({ 
	email: "<your email here>", 
	password: "<your password here>",
});
```
All lookup functions require a 'hook' object on a player, obtainable via
```
let hook = await api.hookPlayer({
	platform: 'uplay',
	username: 'spoit.koi'
});
```
All profiling functions require a 'profile' object, obtainable via
```
api.generateSimpleProfile(hook, {debug:true});
```
or 
```
api.generateDetailedProfile(hook, {debug:true});
```

## Lookup
### Find linked platforms
```
let platforms = await api.findPlatforms(hook);
console.log(platforms);
```

### Find owned applications (only includes Ubisoft Connect applications)
```
let applications = await api.getAllApplications(hook);
console.log(applications);
```

### Find smurfs
```
let smurfs = await api.getSmurfs(hook);
console.log(smurfs);
```

### Get their detailed statistics
```
let statistics = await api.getStatistics(hook);
console.log(statistics);
 ```

### Check if they have Ubisoft's default pfp
```
let hasDefaultPFP = await api.hasDefaultPFP(hook);
console.log(hasDefaultPFP);
```


## Profiling
### Fetch basic stats to get a 'profile' object.
```
let profile = await api.generateSimpleProfile(hook, {debug:true});
console.log(profile);
```
### Fetch detailed stats to get an advanced 'profile' object.
```
let profile = await api.generateDetailedProfile(hook, {debug:true});
console.log(profile);
```

### Rate the likelihood they someone cheating (requires profile object from aforementioned profile generators)
```
let rating = await api.calculateRating(profile);
console.log(rating);
```
