import express from "express";
import imageRoutesDeploy from "./src/routes/imageRoutes_deploy.js";

const app = express();

app.use("/api/image", imageRoutesDeploy);

app.listen(5002, () => {
    console.log("Deployment image test server running on port 5002");
});