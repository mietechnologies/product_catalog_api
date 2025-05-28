const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './configs/config.env' });

const isDevelopment = process.env.NODE_ENV === 'development';
const DB = (isDevelopment ? process.env.DEV_DATABASE : process.env.DATABASE).replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB).then(() => console.log('DB connected successfully!'));

const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
