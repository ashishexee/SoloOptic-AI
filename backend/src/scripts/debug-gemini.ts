import dotenv from "dotenv";
// Load with override to see if it fixes the issue
const envConfig = dotenv.config({ override: true });

import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  console.log("--- Debugging Gemini API Key (Override: True) ---");
  if (envConfig.error) {
    console.error("Error loading .env:", envConfig.error);
  } else {
    console.log(".env loaded successfully");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY present:", apiKey ? "YES" : "NO");
  
  if (!apiKey) {
    console.error("API Key is missing!");
    return;
  }

  console.log("API Key (first 10 chars):", apiKey.substring(0, 10) + "...");
  
  // Check against the known correct one from the user's curl command
  // AIzaSyD8f...
  if (apiKey.startsWith("AIzaSyD8f")) {
    console.log("MATCHES expected key from .env!");
  } else {
    console.log("DOES NOT MATCH expected key from .env. Still getting the wrong one?");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Sending test request...");
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("Response received:", response.text());
    console.log("--- Success ---");
  } catch (error: any) {
    console.error("--- Error ---");
    console.error(error.message);
  }
}

main();
