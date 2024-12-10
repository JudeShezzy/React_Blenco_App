const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const Stripe = require("stripe");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;
//Mongodb connection
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Connected To Database"))
  .catch((err) => console.log(err));

//Schema
const userSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  confirmpassword: String,
  image: String,
});

const userModel = mongoose.model("user", userSchema);

//api
app.get("/", (req, res) => {
  res.send("Server is running");
});

// signup api
app.post("/signup", (req, res) => {
  // console.log(req.body)
  const { email } = req.body;

  const findOneDocument = async () => {
    try {
      const result = await userModel.findOne({ email: email }).exec();
      if (result) {
        res.send({
          message: "Email id has already been registered",
          alert: false,
        });
        //console.log(result);
      } else {
        const data = userModel(req.body);
        const save = data.save();
        res.send({ message: "Successfully sign up", alert: true });
      }
    } catch (error) {
      console.log(error);
    }
  };

  findOneDocument();
});

//login api
app.post("/login", async (req, res) => {
  // console.log(req.body)
  const { email } = req.body;
  try {
    const result = await userModel.findOne({ email: email });
    if (result) {
      const dataSend = {
        _id: result._id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        image: result.image,
      };
      console.log(dataSend);
      res.send({
        message: "Login is successfully",
        alert: true,
        data: dataSend,
      });
    } else {
      res.send({
        message: "Email id is not available, please sign up",
        alert: false,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

//Product Section

const schemaProduct = mongoose.Schema({
  name: String,
  categories: String,
  image: String,
  price: String,
  description: String,
});
const productModel = mongoose.model("product", schemaProduct);

//save product in data
//api
app.post("/uploadProduct", async (req, res) => {
  //console.log(req.body)
  const data = await productModel(req.body);
  const datasave = await data.save();
  res.send({ message: "Upload successfully" });
});

//
app.get("/product", async (req, res) => {
  const data = await productModel.find({});
  res.send(JSON.stringify(data));
});

/****Payment Gateway */
console.log(process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-payment", async (req, res) => {
  

  try {
    const params = {
      submit_type: "pay",
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      shipping_options: [{ shipping_rate: "shr_1Q0X9tHem3cLNGMtVUzlUHip" }],

      line_items: req.body.map((item) => {
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              //images : [item.image]
            },
            unit_amount: item.price * 100,
          },
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
          },
          quantity: item.qty,
        };
      }),

      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    };

    const session = await stripe.checkout.sessions.create(params);
    console.log(session);
    res.status(200).json(session.id);
  } catch (err) {
    res.status(err.statusCode || 500).json(err.message);
  }
});

app.listen(PORT, () => console.log("Server is running at port : " + PORT));
