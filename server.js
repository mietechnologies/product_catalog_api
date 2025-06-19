const mongoose = require('mongoose');

const DB = process.env.MONGO_URI;

mongoose.connect(DB).then(() => console.log('DB connected successfully!'));

const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
