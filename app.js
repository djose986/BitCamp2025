const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const MongoDBService = require('./MongoDBService');

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PORT = 4000;

app.set("view engine", "ejs");
app.use(express.static('public'));

const dbService = new MongoDBService();

/////////////////////////////////////////////////////// DB STUFF /////////////////////////////////////////////////////////////////////

app.get('/', (request, response) => {
    response.render("login", {error: null});
  });

app.get("/create", (request, response) => { 
    response.render("createAcc");
});

app.get("/tasks", async (request, response) => { 
    const tasks = await dbService.getTasks();
    
    console.log(tasks)

    let dailies = tasks[0];
    let weeklies = tasks[1];
    console.log(weeklies)
    let day = ""
    let week = ""
    let i = 1
    for (let w in weeklies) {
        console.log(w)
        week += `<div class="checklist-item">
                        <input type="checkbox" value="${weeklies[w].task_description}" id="weekly${i}">
                        <label for="weekly${i}">${weeklies[w].task_description}</label> 
                    </div>`
        i += 1
    }

    i = 1
    for (let d in dailies) {
        day += `<div class="checklist-item">
                        <input type="checkbox" value="${dailies[d].task_description}" id="daily${i}">
                        <label for="daily${i}">${dailies[d].task_description}</label> 
                    </div>`
        i += 1
    }

    console.log(await dbService.scoreToImage())
    response.render("tasks", {daily: day, weekly : week, backgroundImagePath: await dbService.scoreToImage()});
});

app.post("/tasks", async (request, response) => {
    const { taskDesc, action } = request.body;

    if (action === "remove") {
        const tasks = await dbService.updateTask(taskDesc, action);
        
        let dailies = tasks[0];
        let weeklies = tasks[1];
        console.log(weeklies)
        let day = ""
        let week = ""
        let i = 1
        for (let w in weeklies) {
            console.log(w)
            week += `<div class="checklist-item">
                            <input type="checkbox" value="${weeklies[w].task_description}" id="weekly${i}">
                            <label for="weekly${i}">${weeklies[w].task_description}</label> 
                        </div>`
            i += 1
        }

        i = 1
        for (let d in dailies) {
            day += `<div class="checklist-item">
                            <input type="checkbox" value="${dailies[d].task_description}" id="daily${i}">
                            <label for="daily${i}">${dailies[d].task_description}</label> 
                        </div>`
            i += 1
        }

        response.render("tasks", {daily: day, weekly : week, backgroundImagePath: await dbService.scoreToImage()});
        }


});


app.get("/home", async (request, response) => {
    const { username } = request.query; 
    const highScore = await dbService.getScore()

    response.render("home", { highScore: highScore, username, backgroundImagePath: await dbService.scoreToImage() });
});

app.post("/home", async (request, response) => {

    const {username, password} = request.body;
    message = ""

    try {

        message = await dbService.checkUser({ username, password });
        console.log(await dbService.scoreToImage())
        const highScore = await dbService.getScore()
        if (message == "Success") {
            response.render("home", {username, backgroundImagePath: await dbService.scoreToImage(), highScore: highScore })
        } else {
            response.render("login", {error: "Wrong Credentials. Please Try Again.", backgroundImagePath: await dbService.scoreToImage(), highScore: highScore})
        }

    } catch (error) {
        message = "Error logging in. Please try again.";
        response.render("login", {error: "Something went wrong. Please Try Again.", backgroundImagePath: await dbService.scoreToImage()})
    }

});

app.post("/accountCreated", async (request, response) => {

    const { username, password } = request.body;
    console.log(username)
    console.log(password)
    const dailys = null
    const daily_date = null
    const weeklys = null
    const weekly_date = null
    const score = 0
    message = ""
    
    try {
        message = await dbService.addUser({ username, password, daily_date, weekly_date, dailys, weeklys, score});
        console.log(message)

    } catch (error) {
        message = "Error creating user, please try again"
    }

    response.render("accCreated", {message: message})
});

app.post('/analyze', upload.single('image'), async (req, res) => {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const imagePart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };
  
    const prompt = `
      Analyze the image and return JSON:
      {
        "description": "...",
        "sustainability_points": 0-100,
        "fun_fact": "..."
      }
      In terms of the sustainability score, please predicate your assessment on how meaningful the practice is towards sustainability.
      For example, recycling is beneficial towards the environment, however, planting a tree would be considered more impactful.
      Much more weight should be given to actions that are more meaningful (Lower points aren't indicative of being negative). 
      If the activity is harmful to the environment/unsustainable OR the photo has no relevance to sustainability, assign 0 points.
      Furthermore, the image MUST be of a HUMAN doing an action
      If the image is related to sustainability, but does not depict a human performing an action, assign 0 points and explain why it doesn't qualify (e.g. there is no human). However, still give a fun fact.
    `;
  
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
      const result = await model.generateContent([prompt, imagePart]);
      const text = await result.response.text();
      const startIndex = text.indexOf("{"); 
      const endIndex = text.lastIndexOf("}"); 
      const jsonString = text.substring(startIndex, endIndex + 1);
      console.log(jsonString)
      const json = JSON.parse(jsonString);
      res.json(json);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });
  
  app.get("/ai", (request, response) => { 
      response.render("ai");
  });

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

