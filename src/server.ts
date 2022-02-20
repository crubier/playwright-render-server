import { chromium, ChromiumBrowser, Page } from "playwright";
import express from "express";
import bodyParser from "body-parser";
import path from "path";

const port = 3000;
const tmpFolder = process.env.TMPDIR || "/tmp";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let browser: ChromiumBrowser;

app.get("/", async (req, res) => {
  console.log("Received request");
  const target = req.query.target;

  if (typeof target !== "string") {
    res.status(400).send("target query parameter is required to be a string");
    return;
  }

  if (!browser) {
    res.status(400).send("browser is not initialized");
    return;
  }

  const width =
    typeof req.query.width === "string" ? parseInt(req.query.width) : 1024;
  const height =
    typeof req.query.height === "string" ? parseInt(req.query.height) : 1024;

  const page = await browser.newPage({
    viewport: { width, height },
  });

  await page.goto(target as string, { waitUntil: "networkidle" });

  const locator = req.query.locator;
  const fullPage = typeof req.query.fullPage === "string" ? true : false;

  const outputPath = path.join(
    tmpFolder,
    `output${Math.random().toString(36).substring(2, 7)}.jpeg`
  );
  try {
    console.log(
      `Rendering ${target} ${fullPage ? "full page " : ""}${
        locator ? `with locator ${locator} ` : ""
      }at ${width}x${height} to ${outputPath}`
    );
    if (typeof locator !== "string") {
      await page.screenshot({
        fullPage,
        path: outputPath,
      });
    } else {
      await page.locator(locator).screenshot({ path: outputPath });
    }

    res.sendFile(outputPath);
    return;
  } catch (e) {
    res
      .status(400)
      .send(
        "rendering error, maybe your locator parameter is incorrect? see server logs"
      );
    console.error("Error", e);
    return;
  }
});

const initBrowser = async () => {
  browser = await chromium.launch();
};

export const runServer = async () => {
  await initBrowser();
  await new Promise<void>((resolve, reject) => {
    app.listen(port, () => {
      console.log(`Playwright render server listening on port ${port}`);
    });
    resolve();
  });
};
