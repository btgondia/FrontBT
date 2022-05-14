const express = require("express");
const connectDB = require("./config/mongoDb");
const morgan = require("morgan");
const Routes = require("./Routes/Routes");
const ItemCategories = require("./Routes/ItemCategories");
const Companies = require("./Routes/Companies");
const CounterGroup = require("./Routes/CounterGroup");
const ItemGroup = require("./Routes/ItemGroup");
const Counter = require("./Routes/Counters");
const Users = require("./Routes/Users");

app = express();
app.use(express.json());
connectDB()
app.use(morgan("dev"));

app.use("/routes", Routes);
app.use("/itemCategories", ItemCategories);
app.use("/companies", Companies);
app.use("/counterGroup", CounterGroup);
app.use("/itemGroup", ItemGroup);
app.use("/counters", Counter);
app.use("/users", Users);


module.exports = app;