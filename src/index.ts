import axios from 'axios';
import dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import readline from 'readline';

dotenv.config();


const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
const userId = process.env.LINKEDIN_USER_ID;

if (!userId) {
  throw new Error("Environment variables LINKEDIN_USER_ID must be set.");
}

if (!accessToken) {
  throw new Error("Environment variables LINKEDIN_ACCESS_TOKEN must be set.");
}

function askUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });
  }

async function getRedditRssFeed(): Promise<string> {
  const response = await axios.get("https://www.reddit.com/r/artificial/.rss");
  const parser = new XMLParser();
  const parsedFeed = parser.parse(response.data);
  const entries = parsedFeed.feed.entry;
  const twelveHoursAgo = new Date();
  twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

  const recentTopics = entries
    .filter((entry: any) => {
      const publishedDate = new Date(entry.published);
      return publishedDate >= twelveHoursAgo;
    })
    .map((entry: any) => entry.title);

  return recentTopics.join("\n");

}



async function postToLinkedIn(content: string): Promise<void> {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": "202306"
  };

  const postData = {
    author: `urn:li:person:${userId}`,
    lifecycleState: "PUBLISHED",
    commentary: content,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    visibility: "PUBLIC"
  };

  try {
    const response = await axios.post("https://api.linkedin.com/rest/posts", postData, { headers });
    console.log(`Status Code: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
  }
}

async function getPostContent(summary: string): Promise<string> {
    const headers = {
         "Content-Type": "application/json" 
    };
    const response = await axios.post(
        "http://localhost:1234/v1/chat/completions",
        {
          messages: [
            {
              role: "user",
              content: `RSS FEED SUMMARY of r/artificial
              
              ${summary}
              
              You are a LinkedIn Influencer. Given the summary of trending AI news above. 
              Create an onbrand post for your followers. Do not use emojis.`
            }
          ]
        },
        { headers }
      );
    return response.data.choices[0].message.content;
}

export async function summarizeRssFeed(rssFeed: string): Promise<string> {
    const headers = {
        "Content-Type": "application/json" 
   };
   const response = await axios.post(
       "http://localhost:1234/v1/chat/completions",
       {
         messages: [
           {
             role: "user",
             content: `Summarize the RSS feed of the subreddit r/artificial. The feed is provided below. The summary should be conversational.

             ${rssFeed}
             `
           }
         ]
       },
       { headers }
     );
   return response.data.choices[0].message.content;
}

export async function proofReaderCall(post: string): Promise<string> {
  const headers = {
      "Content-Type": "application/json" 
 };
 const response = await axios.post(
     "http://localhost:1234/v1/chat/completions",
     {
       messages: [
         {
           role: "user",
           content: `Proofread the following LinkedIn post. Ensure it is grammatically correct and on-brand. Do not use emojis. Ensure the post is professional and engaging. It should be suitable for a LinkedIn Influencer. It should not appear as programatically generated.

           ${post}
           `
         }
       ]
     },
     { headers }
   );
 return response.data.choices[0].message.content;
}

export 



function cleanResponse(response: string): string {
    // Remove chain-of-thought enclosed in <think> ... </think> tags.
    response = response.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Remove markdown headers (lines starting with #)
    response = response.replace(/^#{1,6}\s+/gm, '');
    
    // Remove markdown bold/italic markers.
    response = response.replace(/\*\*/g, '');
    response = response.replace(/\*/g, '');
    
    // Remove markdown link formatting: [text](url)
    response = response.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove any remaining markdown formatting symbols if necessary.
    response = response.replace(/__/g, '');
    response = response.replace(/_/g, '');

    response = response.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    
    // Clean up extra whitespace.
    return response.trim();
  }
  

export const main = async () => {
    let regenerate = true;
    let clean: string = "";
    while (regenerate) {
        const rssFeed = await getRedditRssFeed();
        const summary = await summarizeRssFeed(rssFeed);
        const postContent = await getPostContent(summary);
        clean = cleanResponse(postContent);
        const proofread = await proofReaderCall(clean);
        clean = cleanResponse(proofread);
    
        console.log("\nGenerated LinkedIn Post:\n");
        console.log(clean);
        
        const userChoice = await askUser("\nPress 'p' to post to LinkedIn, 'r' to regenerate, or 'q' to quit: ");
    
        if (userChoice === 'p') {
          await postToLinkedIn(clean);
          regenerate = false;
        } else if (userChoice === 'q') {
          console.log("Exiting without posting.");
          regenerate = false;
        }
    }
}

main().catch((e) => console.log(e));