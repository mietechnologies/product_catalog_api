db.createUser({
  user: process.env.MONGO_APP_USER || "mietech",
  pwd: process.env.MONGO_APP_PASSWORD || "12302020",
  roles: [
    {
      role: "readWrite",
      db: process.env.MONGO_INITDB_DATABASE || "directory"
    }
  ]
});