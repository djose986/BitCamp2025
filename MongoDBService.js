const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = 'mongodb+srv://djose:bitCamp2025@cluster0.y3zak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const path = require("path");

let currUser = null;

class MongoDBService {

    constructor() {
        this.uri = uri;
        this.dbName = 'BitCamp2025';
        this.client = new MongoClient(uri);
        this.db = null
    }

   async getScore() {
    await this.connect()
    const usersList = this.db.collection('Users');
    const userExists = await usersList.findOne({ username: currUser});

    return userExists.score
   }

   async scoreToImage() {
    //url('/images/background1.gif')
    const x = await this.getScore()
    console.log(x)
    let return_val = "";
    if ( x >= 70) {
        return_val += `/images/background4.gif`
    } else if (x >= 40) {
        return_val += `/images/background3.gif`
    } else if (x >= 9) {
        return_val += `/images/background2.gif`
    } else {
        return_val += `/images/background1.gif`
    }
    return return_val
   }

   async getTasks() {
       await this.connect()
       const usersList = this.db.collection('Users');
       const userExists = await usersList.findOne({ username: currUser});

       return [userExists.dailys, userExists.weeklys]

   }

    async connect() {
        if (!this.db) {
            await this.client.connect();
            this.db = this.client.db(this.dbName);
        }
    }
    

    async _getCollection(collectionName) {
        if (!this.db) {
            await this.connect(); 
        }
        return this.db.collection(collectionName);
    }

    fixDate(today) {
        today.setHours(0, 0, 0, 0);
        return today
    }

    async dailyUpdateIfNeeded(userExists) {
        if (userExists) {
            const today = this.fixDate(new Date())
            if (userExists.daily_date) {
                if (today - userExists.daily_date > 0) {
                    await this.populateDailyTasks(userExists)
                    await usersList.updateOne(
                        { username: userInfo.username },
                        { $set: { daily_date: today, dailys: []} }
                    );
                }
            }
        }
    }

    async weeklyUpdateIfNeeded(userExists) {
        if (userExists) {
            const today = this.fixDate(new Date())
            if (userExists.weekly_date) {
                if (today - userExists.weekly_date > 6) {
                    await this.populateWeeklyTasks(userExists)
                    await usersList.updateOne(
                        { username: userInfo.username },
                        { $set: { weekly_date: today, weeklys: []} }
                    );
                }
            }
        }

    }
    

    async checkUser(userInfo) {

        message = ""
        await this.connect();
        const usersList = this.db.collection('Users');
        const userExists = await usersList.findOne({ username: userInfo.username, password: userInfo.password });
        currUser = userInfo.username
        console.log(currUser)

          
        if (userExists) {
            const today = this.fixDate(new Date())
            console.log(today)
            if (userExists.daily_date) {
                this.dailyUpdateIfNeeded(userExists)
            }
            if (userExists.weekly_date) {
                this.weeklyUpdateIfNeeded(userExists)
            } else { //we first set daily tasks/weekly
                this.populateDailyTasks(userExists)
                this.populateWeeklyTasks(userExists)
                await usersList.updateOne(
                    { username: userInfo.username },
                    { $set: { daily_date: today, weekly_date: today} }
                );


            }
              
            message+="Success"
    } else {
        message+="Fail"
    }

        return message
    }

    async addUser(userInfo) {

        message = ""
        await this.connect();
        const usersList = this.db.collection('Users');
        const userExists = await usersList.findOne({ username: userInfo.username });
        console.log(userInfo.username)

        if (userExists) {
            message+="Account already exists with that username. Please try again."
        } else {
            await usersList.insertOne(userInfo);
            message+="Account succesfully created. Welcome to Petals of Progress."
        }

        return message
    }
    
    async close() {
        await this.client.close();
        this.db = null;
    }

    async populateDailyTasks(user) {
        let dailyArr = []
        const taskList = this.db.collection("Missions");
        const usersList = this.db.collection('Users');
        const tasks = await taskList.findOne({type: "dailys"})
        const jsonData = JSON.parse(tasks.tasks)
        const jsonArr = Object.keys(jsonData)
        for (let i = 0; i<3; i++) {
            var ran_key = jsonArr[Math.floor(Math.random() *jsonArr.length)];
            dailyArr.push(jsonData[ran_key]) 
        }
        console.log(dailyArr)

        console.log(user.username)
       
        await usersList.updateOne(
            { username: user.username },
            { $set: {dailys: dailyArr} }
        );
    }

    async populateWeeklyTasks(user) {
        let weeklyArr = []
        const taskList = this.db.collection("Missions");
        const usersList = this.db.collection('Users');
        const tasks = await taskList.findOne({type: "weeklys"})
        const jsonData = JSON.parse(tasks.tasks)
        const jsonArr = Object.keys(jsonData)
        for (let i = 0; i<3; i++) {
            var ran_key = jsonArr[Math.floor(Math.random() *jsonArr.length)];
            weeklyArr.push(jsonData[ran_key]) 
        }
        console.log(weeklyArr)

        console.log(user.username)
       
        await usersList.updateOne(
            { username: user.username },
            { $set: {weeklys: weeklyArr} }
        );
    }

    async updateTask(taskDesc, action) {
        const usersList = this.db.collection('Users')
        let userExists = await usersList.findOne({ username: currUser });

        let taskList = [];
        if (userExists.dailys.some(task => task["task_description"] === taskDesc)) {
            taskList = userExists.dailys;

            const task = taskList.find(task => task["task_description"] === taskDesc)
            await usersList.updateOne(
                {username : currUser}, {$inc : {score : task["sustainability_points"]}}
            )
            const updatedTasks = taskList.filter(task => task["task_description"] !== taskDesc)

            await usersList.updateOne(
                { username: currUser },
                {
                    $set: {
                        dailys: updatedTasks, // Or weeklys if it's a weekly task
    
                    }
                }
            );
        

        } else if (userExists.weeklys.some(task => task["task_description"] === taskDesc)) {
            taskList = userExists.weeklys;

            const task = taskList.find(task => task["task_description"] === taskDesc)
            await usersList.updateOne(
                {username : currUser}, {$inc : {score : task["sustainability_points"]}}
            )
            
            const updatedTasks = taskList.filter(task => task["task_description"] !== taskDesc)
            

            await usersList.updateOne(
                { username: currUser },
                {
                    $set: {
                        weeklys: updatedTasks, // Or weeklys if it's a weekly task
    
                    }
                }
            );

        } 
        
        userExists = await usersList.findOne({ username: currUser });
        return [userExists.dailys, userExists.weeklys]
    }



}
module.exports = MongoDBService;
