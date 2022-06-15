const mongoose = require('mongoose');

const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! 💥 Shutting down ...', err);
  // console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connections successfull!');
  });

const app = require('./app');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Handling unhandled rejected promises
// It's like a safety net that we need for cases we have not handled
// It's not ideal at all, some people actually say we should not use stuff like that.
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! 💥 Shutting down ...', err);
  // console.log(err.name, err.message);
  server.close(() => {
    // we first gracefully closes the server (closing current requests for example)
    process.exit(1);
  });
});

/*

tail -f /usr/local/var/log/mongodb/mongo.log | jq --compact-output -r -C '.msg |= sub("\n";"") | .t."$date"+" "+.c+" ["+.ctx+"] "+.msg, .attr | select(.!=null)'

mongosh "mongodb+srv://cluster0.02dvc.mongodb.net/myFirstDatabase" --username nicolas


*/

// TEST
// TEST 2
// TEST 4
