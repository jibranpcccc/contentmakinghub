const fs = require('fs');

async function testNetlifyAPI() {
  console.log("Testing Title Generation API...");
  try {
    const titleRes = await fetch("https://contenthunmar.netlify.app/api/generate-titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: "test gambling slot",
        count: 5,
        language: "English"
      })
    });
    const titleData = await titleRes.json();
    console.log("Title API Status:", titleRes.status);
    console.log("Titles returned:", titleData);

    const title = titleData.titles?.[0]?.title || "Test Title";

    console.log("\nTesting Article Generation API (waiting for deepseek response)...");
    const startTime = Date.now();
    
    // Test the article generation API
    const articleRes = await fetch("https://contenthunmar.netlify.app/api/generate-articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        keyword: "test gambling slot",
        prompt: "Write a short blog post about [topic].",
        language: "English"
      })
    });
    
    const articleData = await articleRes.json();
    const elapsed = (Date.now() - startTime) / 1000;
    
    console.log("Article API Status:", articleRes.status);
    console.log(`Time taken: ${elapsed.toFixed(2)} seconds`);
    
    if (articleData.content) {
      console.log(`Success! Article generated with ${articleData.content.split(' ').length} words.`);
    } else {
      console.log("Error details:", articleData);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testNetlifyAPI();
