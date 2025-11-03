// Dependencies    
const fs = require('fs'); 
const fetch = require('node-fetch');
const cheerio = require('cheerio');    
const axios = require('axios');
    
// Starting URLs    
let startUrls = [    
  "https://example.com",    
  "https://wikipedia.org",    
  "https://mozilla.org",        
  "https://developer.mozilla.org",    
  "https://web.dev",    
  "https://news.ycombinator.com",    
  "https://www.archive.org",    
  "https://www.nasa.gov",    
  "https://www.wikihow.com"    
];    
    
let visited = new Set();    
let results = [];    
    
async function checkRobots(url) {    
  try {    
    const robotsUrl = new URL("/robots.txt", url).href;    
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': 'RoboIndex/0.1' } });    
    if (!res.ok) return true; // if no robots.txt found, allows    
    const txt = await res.text();    
    const lines = txt.split(/\r?\n/);    
    let block = false, applicable = false;    
    for (let line of lines) {    
      line = line.trim();    
      if (line.toLowerCase().startsWith("user-agent:")) {    
        const agent = line.split(":")[1].trim();    
        applicable = agent === "*" || agent.toLowerCase() === "roboindex/0.1";    
      }    
      if (applicable && line.toLowerCase().startsWith("disallow:")) {    
        const path = line.split(":")[1].trim();    
        if (path === "/" || url.includes(path)) {    
          block = true;    
        }    
      }    
    }    
    return !block;    
  } catch {    
    return true;    
  }    
}    
    
async function crawl() {    
  while (startUrls.length > 0) {    
    const url = startUrls.shift();    
    if (visited.has(url)) continue;    
    
    try {    
      const allowed = await checkRobots(url);    
      if (!allowed) {    
        console.log("Blocked by robots.txt:", url);    
        continue;    
      }    
    
      console.log("Crawling:", url);    
      const response = await fetch(url, { headers: { 'User-Agent': 'RoboIndex/0.1' } });    
      if (!response.ok) {    
        console.log(`Skipped ${url}, status: ${response.status}`);    
        continue;    
      }    
    
      const html = await response.text();    
      const $ = cheerio.load(html);    

    // noindex
    async function checkNoindexFile(url) {
    try {
        // Converts the URL to the domain root and adds /noindex to it
        const domain = new URL(url).origin;
        const noindexUrl = domain + '/noindex';
        
        // Tries fetching the file
        const response = await axios.head(noindexUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'RoboIndex/0.1' }
        });
        
              const isSuccess = response.status === 200;
        const isEmpty = response.data === '' || response.data.length === 0;
        const isHtml = (response.headers['content-type'] || '').includes('text/html');
        
        if (isSuccess && isEmpty && !isHtml) {
            console.log(`Blocked by noindex file: ${domain}`);
            return true;
        }
    } catch (error) {
        // if it returns 404, return false
        if (error.response && error.response.status === 404) {
            return false; // Website can be indexed away
        }
        if (error.response.status === 405) {
        	return false; // if the file is not accessible, Website can still be indexed anyway
        }
        console.log(`Error while checking noindex for ${url}:`, error.message);
    }
    return false;
}

const hasNoindexFile = await checkNoindexFile(url);
if (hasNoindexFile) {
    continue; 
}
    
      visited.add(url);    

      let title = $("head > title").text() || "No Title";    // Fallback Title
      title = title.replace(/\s+/g, ' ').trim().substring(0, 100);    

      let metaDescription = $('head > meta[name="description"]').attr('content');
if (!metaDescription) {
  let pText = $('p').first().text().trim();
  let spanText = $('span').first().text().trim();
  
  // limit of 250 chars and prioritizes <p>
  if (pText) {
    metaDescription = pText;
  } else if (spanText && spanText.length < 250) {
    metaDescription = spanText;
  } else {
    metaDescription = url; // Fallback Description
  }
}
metaDescription = metaDescription.replace(/\s+/g, ' ').trim().substring(0, 250); 

      results.push({ title, url, text: metaDescription });    
      console.log("Added:", title);    
    
      fs.writeFileSync("index.json", JSON.stringify(results, null, 2));    
    
      $("a[href]").each((i, link) => {    
        const href = $(link).attr('href');    
        if (href.startsWith("http") && !visited.has(href)) startUrls.push(href);    
      });    
    
      await new Promise(r => setTimeout(r, 1000));    
    
      const MAX_VISITED = 200;    
      if (visited.size >= MAX_VISITED) break;    
    
    } catch (error) {    
      console.log("Error:", error.message);    
    }    
  }    
    
  console.log("Crawling Finished");    
}    
    
crawl();