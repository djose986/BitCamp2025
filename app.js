const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const MongoDBService = require('./MongoDBService');

const PORT = 3000;

app.set("view engine", "ejs");
app.use(express.static('public'));

const dbService = new MongoDBService();

app.get('/', (request, response) => {
    response.render("login", {error: null});
  });

app.get("/create", (request, response) => { 
    response.render("createAcc");
});

app.post("/home", async (request, response) => {

    const {username, password} = request.body;
    message = ""

    try {

        message = await dbService.checkUser({ username, password });
        
        if (message == "Success") {
            response.render("home", {username})
        } else {
            response.render("login", {error: "Wrong Credentials. Please Try Again."})
        }

    } catch (error) {
        message = "Error logging in. Please try again.";
        response.render("login", {error: "Something went wrong. Please Try Again."})
    }

});

app.post("/accountCreated", async (request, response) => {

    const { username, password } = request.body;
    message = ""
    
    try {
        message = await dbService.addUser({ username, password });

    } catch (error) {
        message = "Error creating user, please try again"
    }

    response.render("accCreated")
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});