const keys = [
"4rb3N0b7CFpPRUMv2MeDDmHsZBrrOCMf",
"4jCiMy0SbG2DjllajRNDNi2ICGbphAEv",
"HOrEhzTUMJhM9rYa0eYRkeJTyNsgfCpK",
"CBlYX2jf4afg12H56eOa7aaXSltWfdit",
"K9Xj0eXfS8oLkQCoziVOttNE65bOyHYE",
"3xQdTfRQEOPfDeiDVBc2IA1eZcwTPb8A",
"ctra2JvzzTmY7kHfEkjgddUkh0qDjGjx",
"1kUWb5aXQo0gZ8DEIsD4nPgCtbVQ6Dq5",
"i7gcfqDusb4gOMT0hps4lzeION4UIEya",
"NTpLQv58QizZ9L2ugPzlGOVo2CWsZwOb",
"GOzFPgDP0KkT7JjSR1FTkbBwQgBAMXZB"
];

async function testKey(key) {
    try {
      const start = Date.now();
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: "Say hello" }],
          max_tokens: 10
        })
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (response.ok) {
        console.log(`[SUCCESS] Key ...${key.slice(-4)} | Time: ${duration}ms`);
      } else {
        console.log(`[FAILED] Key ...${key.slice(-4)} | Error: ${data.message || JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`[ERROR] Key ...${key.slice(-4)} | Exception: ${e.message}`);
    }
}

async function main() {
  const promises = keys.map(k => testKey(k));
  await Promise.all(promises);
}

main();
