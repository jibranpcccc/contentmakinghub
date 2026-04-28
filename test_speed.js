

async function runTest() {
  const CONCURRENCY = 13;
  const TOTAL = 100;
  
  console.log(`Starting generation of ${TOTAL} articles with concurrency ${CONCURRENCY}...`);
  const startTime = Date.now();
  
  let nextIndex = 0;
  let completed = 0;
  
  const processOne = async (jobIndex, workerIndex) => {
    const jobStartTime = Date.now();
    try {
      const res = await fetch("http://localhost:5294/api/generate-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Test Title ${jobIndex}`,
          keyword: "test keyword",
          prompt: "Write a short 500 word article about test keyword.",
          language: "English",
          outputFormat: "markdown",
          provider: "mistral",
          workerIndex: workerIndex
        })
      });
      
      const text = await res.text();
      const elapsed = Date.now() - jobStartTime;
      
      if (!res.ok) {
        console.log(`[Job ${jobIndex}] Failed in ${elapsed}ms: Status ${res.status}`);
      } else {
        console.log(`[Job ${jobIndex}] Success in ${elapsed}ms`);
      }
    } catch (e) {
      console.log(`[Job ${jobIndex}] Error: ${e.message}`);
    }
    
    completed++;
    if (completed % 10 === 0) {
      console.log(`Progress: ${completed}/${TOTAL}`);
    }
  };
  
  const workers = Array.from({ length: CONCURRENCY }, async (_, workerIndex) => {
    await new Promise(res => setTimeout(res, workerIndex * 500));
    while (nextIndex < TOTAL) {
      const idx = nextIndex++;
      await processOne(idx, workerIndex);
    }
  });
  
  await Promise.all(workers);
  
  const totalElapsed = (Date.now() - startTime) / 1000;
  console.log(`All ${TOTAL} articles completed in ${totalElapsed} seconds.`);
}

runTest();
