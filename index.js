const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

const PORT = process.env.PORT || 5001;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT, {url: 'redis://@127.0.0.1:6379'});
client.on('error', (err) => console.log('Redis Client Error', err));

const app = express();
app.use(express.json())

//set response
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

//Make request to Github for data
async function getRepos(req, res, next) {
  try {
    console.log("Fetching Data...");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;
    console.log('repos',repos);
    // Set data to Redis
    await client.set(username, repos);
    res.send(setResponse(username, repos))
  } catch (err) {
    console.error(err);
    res.status(500);
  }
  finally{
    next();
  }
}

// Cache middleware
function cache(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data)=> {
    if(err) throw err;

    if(data !== null){
      res.send(setResponse(username, data))
    } else {
      next();
    }
  })
}

//http://localhost:5001/repos/aftab-alam-khan
app.get("/repos/:username", cache,getRepos);

app.listen(PORT, () => {
  console.log(`App listening on PORT ${PORT}`);
});
