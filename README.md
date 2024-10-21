# ![PornHub](https://ei.phncdn.com/www-static/images/pornhub_logo_straight.svg?cache=2024102101) API

This is a Deno module allowing you to interact with the famous adult website https://pornhub.com.

## Disclaimer

Using the API or the website itself is strictly prohibited for people under the age of 18. I do not encourage anyone to use any of such sites. This module is for educational purposes only.

## Example usage

```ts
import {getAccountData, getVideoPageCount, getVideos, getAllVideos, getStreams, getTags} from "https://raw.githubusercontent.com/DNAScanner/phdl/refs/heads/main/main.ts";

// Get general account information
const accountData = await getAccountData("mira-david");

// Get first video on second video page
const video = (await accountData.getVideos(2))[0];

// Output the title and video url
// console.log(video.title + "\n" + video.url);

// Get the highest quality stream url
const stream = (await video.streams())[0];

console.log(stream.url);
```
