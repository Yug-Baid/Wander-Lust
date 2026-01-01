if(process.env.NODE_ENV != "production"){
    require("dotenv").config()
}
const express = require("express")
const app = express();
const mongoose = require("mongoose")

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust"

const path = require("path")

const methodOverride = require("method-override")
const ejsMate = require("ejs-mate")
const expressError = require("./utils/expressError.js");

const listingsRouter = require("./routes/listing.js")
const reviewsRouter = require("./routes/review.js")
const userRouter = require("./routes/user.js")
const session = require("express-session");
const { date } = require("joi");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local")
const User = require("./models/user.js");
const MongoStore = require("connect-mongo");

app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")))

const dbUrl = process.env.ATLASDB_URL;  
app.set("view engine","ejs")
app.use(methodOverride("_method"))
app.set(path.join(__dirname,"views"))
app.use(express.urlencoded({extended:true}))

const store = MongoStore.create({
    mongoUrl:dbUrl,
    secret:"mysupersecretcode",
    touchAfter : 24*3600,
})

store.on("error",()=>{
    console.log("ERROR IN SESSION STORE",err)
})


const sessionOptions = {
    store,
    secret : "mysupersecretcode",
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7*24*60*60*1000,
        maxAge :  7*24*60*60*1000,
        httpOnly : true,

    },
}





main().
catch(err => console.log(err))
.then((res)=>{
    console.log("Connected to db")
})


async function main() {
  await mongoose.connect(dbUrl);
}


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// app.get("/demouser",async(req,res)=>{
//     const fakeuser = new User({
//         email : "yugbaid@gmail.com",
//         username : "Hamcker"
//     })

//     let newUser = await User.register(fakeuser,"helloWorld")
//     res.send(newUser);
// })


app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})


app.use("/listings",listingsRouter)
app.use("/listings/:id/reviews",reviewsRouter)

// Root route - redirect to listings
app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/",userRouter)




app.all("*",(req,res,next)=>{
    next(new expressError(404,"Page not found"))
})

app.use((err,req,res,next)=>{
    let {status = 500,message="Unxepected Error"} = err;
   res.status(status).render("./listings/error.ejs",{message})
})

// Use dynamic port for Vercel deployment
const PORT = process.env.PORT || 8080;
app.listen(PORT,()=>{
    console.log(`Listening to port ${PORT}`)
})

// Export the Express app for Vercel serverless function
module.exports = app;