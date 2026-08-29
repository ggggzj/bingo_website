import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// How many proxies sit in front of us, because the login rate limiter counts by IP
// and this is what decides which IP it sees.
//
// One in production (the platform's router): without it every request looks like it
// came from that proxy and the limiter would count the whole world as one caller.
// Zero anywhere else, because trusting a hop that does not exist means trusting a
// header the caller writes — and a forged X-Forwarded-For would make every guess
// look like a new caller, which is the limiter switched off. Never `true`: that
// trusts the whole chain, which is the same hole.
app.set(
  "trust proxy",
  Number(
    process.env["TRUST_PROXY"] ??
      (process.env["NODE_ENV"] === "production" ? 1 : 0),
  ),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

export default app;
