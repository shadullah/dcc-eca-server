const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const body_parser = require("body-parser");
const port = process.env.PORT || 5000;
const {
  createPayment,
  executePayment,
  queryPayment,
  searchTransaction,
  refundTransaction,
} = require("bkash-payment");

// middlewares
app.use(cors());
app.use(express.json());
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.agaitrv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

const userCollection = client.db("DCC_ECA").collection("users");

app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { ...user };

  const result = await userCollection.insertOne(query);
  res.send(result);
});

// app.get("/users/:id", async (req, res) => {
//   const user = req.body;
//   const query = { id: user._id };
//   const result = await userCollection.findOne(query);
//   res.send(result);
// });

// app.get("/users/:id", async (req, res) => {
//   const id = req.params.id;
//   const query = {  };
//   console.log(id);
//   const result = await userCollection.findOne(query);
//   res.send(result);
//   console.log(result);
// });

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const objectId = new ObjectId(id);
  const query = { _id: objectId };
  const result = await userCollection.findOne(query);
  res.send(result);
});

app.get("/userDetails", async (req, res) => {
  const email = req.query.email;
  const query = { email };
  const result = await userCollection.findOne(query);
  res.send(result);
});

// bKASH HERE
const bkashConfig = {
  base_url: "https://tokenized.pay.bka.sh/v1.2.0-beta",
  username: "01701054270",
  password: ".5p}CdH_pLN",
  app_key: "q7CuJt7K4vaOMH3DaMSoI7Yjtc",
  app_secret: "DrLmrSOg2d4RrtdkIGkeSwmpZBcbeK5xqM9IK9hOzBkQwaNc1hCE",
};
// const bkashConfig = {
//   base_url: "https://tokenized.sandbox.bka.sh/v1.2.0-beta/",
//   username: "testdemo",
//   password: "test%#de23@msdao",
//   app_key: "5nej5keguopj928ekcj3dne8p",
//   app_secret: "1honf6u1c56mqcivtc9ffl960slp4v2756jle5925nbooa46ch62",
// };

app.post("/bkash-checkout", async (req, res) => {
  try {
    const { amount, callbackURL, orderID, reference } = req.body;
    const paymentDetails = {
      amount: amount, // your product price
      callbackURL: callbackURL, // your callback route
      orderID: orderID || "Order_101", // your orderID
      reference: reference || "1", // your reference
    };
    const result = await createPayment(bkashConfig, paymentDetails);
    //   ssend bkash callback url to the client
    res.status(200).send(result?.bkashURL);
  } catch (e) {
    console.log(e);
  }
});

app.get("/bkash-callback", async (req, res) => {
  try {
    const { status, paymentID } = req.query;
    let result;
    let response = {
      statusCode: "4000",
      statusMessage: "Payment Failed",
      statusCode: "2023",
    };
    if (status === "success") {
      if (response.statusCode == "4000" || response.statusCode == "2023") {
        res.status(200).send({
          message: "Payment failed check your balance or Internet connection",
        });
        res.status(200).send(result?.statusMessage);
        res.redirect("https://dcc-eca.web.app/dashboard");
      }
      result = await executePayment(bkashConfig, paymentID);
      console.log(result, "i am here");
      res.redirect("https://dcc-eca.web.app/profile");
    }

    if (result?.transactionStatus === "Completed") {
      // payment success
      // insert result in your db
      console.log(result, "complete");
    }
    if (result) {
      // if (response.statusCode == "2023") {
      //   res.redirect("https://dcc-eca.web.app/dashboard");
      // }
      // if (response.statusCode == "4000") {
      //   res.redirect("https://dcc-eca.web.app/dashboard");
    }
    // }
    response = {
      statusCode: result?.statusCode,
      statusMessage: result?.statusMessage,
    };

    // You may use here WebSocket, server-sent events, or other methods to notify your client
  } catch (e) {
    console.log(e);
  }
});

// Add this route under admin middleware
app.post("/bkash-refund", async (req, res) => {
  try {
    const { paymentID, trxID, amount } = req.body;
    const refundDetails = {
      paymentID,
      trxID,
      amount,
    };
    const result = await refundTransaction(bkashConfig, refundDetails);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

app.get("/bkash-search", async (req, res) => {
  try {
    const { trxID } = req.query;
    const result = await searchTransaction(bkashConfig, trxID);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

// app.delete("/delete", async (req, res) => {
//   const query = {};
//   const result = await userCollection.deleteMany(query);
//   res.send(result);
// });

app.get("/bkash-query", async (req, res) => {
  try {
    const { paymentID } = req.query;
    const result = await queryPayment(bkashConfig, paymentID);
    res.send(result);
  } catch (e) {
    console.log(e);
  }
});

app.get("/", (req, res) => {
  res.send("DCC is sitting");
});

app.listen(port, () => {
  console.log(`DCC is sitting at ${port}`);
});
