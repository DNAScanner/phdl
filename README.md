# PornHub API

This is a Deno module allowing you to interact with the famous adult website https://pornhub.com.

## Disclaimer

Using the API or the website itself is strictly prohibited for people under the age of 18. I do not encourage anyone to use any of such sites. This module is for educational purposes only.

## Example usage

```ts
import {generateAccountUrl, getAccountData} from "jsr:@dnascanner/phdl";

// Get basic account data
const accountData = await getAccountData(generateAccountUrl("mira-david"));

// Now, get an array of all videos on page 2
const videos = await accountData.getVideos(2);

// Then, log the url to the best stream of the first video
const details = await videos[0].details();

console.log(details.streams[0].url);
```
