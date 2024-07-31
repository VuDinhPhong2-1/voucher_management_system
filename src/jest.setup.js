const Mongoose = require('mongoose').Mongoose;
const mongoose = new Mongoose();

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

const RedisMock = require('ioredis-mock');
const redisMock = new RedisMock();

const { promisify } = require('util');

module.exports = async () => {
  try {
    await mockgoose.prepareStorage();
    await mongoose.connect('mongodb://localhost/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    mongoose.connection.on('connected', () => {
      console.log('db connection is now open');
    });

    global.redis = redisMock;

    console.log('Redis mock setup complete');
  } catch (e) {
    console.log('error in setting up mockgoose and redis-mock', e);
  }
};
