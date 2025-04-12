const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = 'mongodb+srv://djose:bitCamp2025@cluster0.y3zak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

class MongoDBService {

    constructor() {
        this.uri = uri;
        this.dbName = 'BitCamp2025';
        this.client = new MongoClient(uri);
        this.db = null
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

    async checkUser(userInfo) {

        message = ""
        await this.connect();
        const usersList = this.db.collection('Users');
        const userExists = await usersList.findOne({ username: userInfo.username, password: userInfo.password });

        if (userExists) {
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

        if (userExists) {
            message+="You already have an account! Please try again."
        } else {
            await usersList.insertOne(userInfo);
            message+="Account succesfully created. Welcome to GreenCraft."
        }

        return message
    }
    

    async insertOne(collectionName, doc) {
        const collection = await this._getCollection(collectionName);
        const result = await collection.insertOne(doc);
        return result.insertedId;
    }
    
    async findOne(collectionName, query) {
        const collection = await this._getCollection(collectionName);
        return await collection.findOne(query);
    }
    
    async findAll(collectionName, query = {}) {
        const collection = await this._getCollection(collectionName);
        return await collection.find(query).toArray();
    }
    
    async updateOne(collectionName, filter, update) {
        const collection = await this._getCollection(collectionName);
        return await collection.updateOne(filter, { $set: update });
    }
    
    async deleteOne(collectionName, filter) {
        const collection = await this._getCollection(collectionName);
        return await collection.deleteOne(filter);
    }
    

    async close() {
        await this.client.close();
        this.db = null;
    }

}
module.exports = MongoDBService;
