import {getAccountData, getVideoPageCount, getVideos, getAllVideos, getStreams, getTags} from "./main.ts";

// Get general account information
const accountData = await getAccountData("mira-david");

// Get first video on second video page
const video = (await accountData.getVideos(2))[0];

// Output the title and video url
// console.log(video.title + "\n" + video.url);

// Get the highest quality stream url
const stream = (await video.streams())[0];

console.log(stream.url);
