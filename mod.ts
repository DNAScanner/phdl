const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

const BASE_URL = "https://www.pornhub.com/";

/**
 * Represents the data for a stream.
 * 
 * @typedef {Object} StreamData
 * @property {string} url - The URL of the stream.
 * @property {string} quality - The quality of the stream.
 */
export type StreamData = {
	url: string;
	quality: string;
};

/**
 * Enum representing different order types for sorting.
 * 
 * @enum {string}
 * @property {string} MostViewed - Sort by most viewed items.
 * @property {string} MostRecent - Sort by most recent items.
 * @property {string} TopRated - Sort by top rated items.
 * @property {string} Longest - Sort by longest items.
 * @property {string} Best - Default sorting order.
 */
export enum Order {
	MostViewed = "&o=mv",
	MostRecent = "&o=mr",
	TopRated = "&o=tr",
	Longest = "&o=lg",
	Best = "",
}

/**
 * Represents the data of a video.
 * 
 * @typedef {Object} VideoData
 * @property {string} title - The title of the video.
 * @property {string} url - The URL of the video.
 * @property {number} views - The number of views the video has.
 * @property {number} likeRatio - The like ratio of the video.
 * @property {number} duration - The duration of the video in seconds.
 * @property {Object} thumbnail - The thumbnail of the video.
 * @property {string} thumbnail.url - The URL of the thumbnail image.
 * @property {Function} thumbnail.get - A function that returns a promise resolving to the thumbnail image as an ArrayBuffer.
 * @property {Object} preview - The preview of the video.
 * @property {string} preview.url - The URL of the preview image.
 * @property {Function} preview.get - A function that returns a promise resolving to the preview image as an ArrayBuffer.
 * @property {Function} streams - A function that returns a promise resolving to an array of StreamData objects.
 * @property {Function} tags - A function that returns a promise resolving to an array of tags associated with the video.
 */
export type VideoData = {
	title: string;
	url: string;
	views: number;
	likeRatio: number;
	duration: number;
	thumbnail: {
		url: string;
		get: () => Promise<ArrayBuffer>;
	};
	preview: {
		url: string;
		get: () => Promise<ArrayBuffer>;
	};
	streams: () => Promise<StreamData[]>;
	tags: () => Promise<string[]>;
};

/**
 * Represents the data associated with an account.
 */
export type AccountData = {
	/**
	 * The tag associated with the account.
	 */
	tag: string;

	/**
	 * The username of the account.
	 */
	username: string;

	/**
	 * The description of the account.
	 */
	description: string;

	/**
	 * The URL of the account.
	 */
	url: string;

	/**
	 * The avatar information of the account.
	 */
	avatar: {
		/**
		 * The URL of the avatar image.
		 */
		url: string;

		/**
		 * Retrieves the avatar image as an ArrayBuffer.
		 * @returns A promise that resolves to an ArrayBuffer containing the avatar image.
		 */
		get: () => Promise<ArrayBuffer>;
	};

	/**
	 * The banner information of the account.
	 */
	banner: {
		/**
		 * The URL of the banner image.
		 */
		url: string;

		/**
		 * Retrieves the banner image as an ArrayBuffer.
		 * @returns A promise that resolves to an ArrayBuffer containing the banner image.
		 */
		get: () => Promise<ArrayBuffer>;
	};

	/**
	 * The rank of the account.
	 */
	rank: number;

	/**
	 * The number of views the account has.
	 */
	views: number;

	/**
	 * The number of subscribers the account has.
	 */
	subscribers: number;

	/**
	 * The gender of the account holder.
	 */
	gender: "couple" | "female" | "male";

	/**
	 * The location of the account holder.
	 */
	location: string;

	/**
	 * The birthplace of the account holder.
	 */
	birthplace: string;

	/**
	 * Retrieves the number of video pages.
	 * @returns A promise that resolves to the number of video pages.
	 */
	getVideoPageCount: () => Promise<number>;

	/**
	 * Retrieves the videos on a specific page.
	 * @param page - The page number to retrieve videos from.
	 * @returns A promise that resolves to an array of VideoData objects.
	 */
	getVideos: (page: number) => Promise<VideoData[]>;

	/**
	 * Retrieves all videos associated with the account.
	 * @returns A promise that resolves to an array of all VideoData objects.
	 */
	getAllVideos: () => Promise<VideoData[]>;
};

const extractRegex = (input: string, regex: RegExp): string | undefined => {
	const match = regex.exec(input);
	return match ? match[1].trim() : undefined;
};

const convertShotertenedNumberToFull = (shortened: string): number => {
	// 1.2M -> 1200000

	const number = shortened.slice(0, -1);
	const unit = shortened.slice(-1);

	switch (unit) {
		case "K":
			return Number(number) * 1000;
		case "M":
			return Number(number) * 1000000;
		default:
			return Number(shortened);
	}
};

const convertDurationStringToSeconds = (duration: string): number => {
	const parts = duration.split(":").reverse();

	let seconds = 0;

	for (let i = 0; i < parts.length; i++) {
		seconds += Number(parts[i]) * 60 ** i;
	}

	return seconds;
};

/**
 * Fetches stream data from the given URL and returns an array of stream information.
 *
 * @param url - The URL to fetch the stream data from.
 * @returns A promise that resolves to an array of `StreamData` objects.
 * @throws Will throw an error if the response status is not 200.
 *
 * The function performs the following steps:
 * 1. Fetches the HTML content from the provided URL.
 * 2. Extracts all HLS video URLs from the HTML using a regular expression.
 * 3. Parses the extracted URLs and maps them to `StreamData` objects containing the URL and quality.
 * 4. Sorts the `StreamData` objects by quality in descending order.
 */
export const getStreams = async (url: string): Promise<StreamData[]> => {
	const response = await fetch(url, {headers});

	if (response.status !== 200) throw new Error(`Could not fetch streams from url ${url}`, {cause: response.statusText});

	const html = await response.text();

	return [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({url, quality: extractRegex(url, /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms)!}))
		.sort((a, b) => Number(b.quality) - Number(a.quality));
};

/**
 * Fetches the HTML content from the given URL and extracts tags from it.
 *
 * @param url - The URL to fetch the HTML content from.
 * @returns A promise that resolves to an array of tags extracted from the HTML content.
 * @throws Will throw an error if the fetch operation fails or the response status is not 200.
 */
export const getTags = async (url: string): Promise<string[]> => {
	const response = await fetch(url, {headers});

	if (response.status !== 200) throw new Error(`Could not fetch tags from url ${url}`, {cause: response.statusText});

	const html = await response.text();

	return [
		...extractRegex(html, /<p>Categories&nbsp;<\/p>(.+?)<div/gms)!
			.trim()
			.matchAll(/>(.+?)</gms),
	]
		.map((match) => match[1].trim())
		.filter((match) => match);
};

/**
 * Fetches the number of video pages for a given tag.
 *
 * @param {string} tag - The tag to search for videos.
 * @returns {Promise<number>} - A promise that resolves to the number of video pages.
 *
 * @example
 * ```typescript
 * const pageCount = await getVideoPageCount('exampleTag');
 * console.log(pageCount); // Outputs the number of pages
 * ```
 */
export const getVideoPageCount = async (tag: string): Promise<number> => {
	const response = await (await fetch(BASE_URL + `model/${tag}/videos`, {headers})).text();

	return [...response.matchAll(/<li class="(page_number|page_current)">/gms)].length || 1;
};

/**
 * Fetches videos based on the provided tag and page number, with an optional order.
 *
 * @param {string} tag - The tag to filter videos by.
 * @param {number} page - The page number to fetch.
 * @param {Order} [order] - The order in which to fetch videos (default is Order.MostRecent).
 * @returns {Promise<VideoData[]>} A promise that resolves to an array of video data.
 * @throws {Error} If the response status is not 200, an error is thrown with the status text as the cause.
 */
export const getVideos = async (tag: string, page: number, order?: Order): Promise<VideoData[]> => {
	const response = await fetch(BASE_URL + `model/${tag}/videos?page=${page + (order || Order.MostRecent)}`, {headers});

	if (response.status !== 200) throw new Error(`Could not fetch videos from user ${tag}`, {cause: response.statusText});

	const html = await response.text();
	const videosElement = extractRegex(html, /<ul class="videos row-5-thumbs" id="mostRecentVideosSection">(.+?)<\/ul>/gms)!;
	const videos = [...videosElement.matchAll(/<li class="pcVideoListItem.+?videoBox.+?".+?<\/li>/gms)];

	const allVideoData: VideoData[] = [];

	for (const videoInArray of videos) {
		const video = videoInArray[0].trim();

		const videoData: VideoData = {
			title: extractRegex(video, /alt="(.+?)"/gms)!,
			url: BASE_URL + extractRegex(video, /href="\/([^"]+)"/gms)!,
			views: convertShotertenedNumberToFull(extractRegex(video, /<var>(.+?)<\/var>/gms)!),
			likeRatio: Number(extractRegex(video, /div class="value">(.+?)</gms)!.replace("%", "")) / 100,
			duration: convertDurationStringToSeconds(extractRegex(video, /<var class="duration">(.+?)/gms)!),
			thumbnail: {
				url: extractRegex(video, /src="(https:\/\/.+?)"/gms)!,
				get: async () => await (await fetch(extractRegex(video, /src="(https:\/\/.+?)"/gms)!, {headers})).arrayBuffer(),
			},
			preview: {
				url: extractRegex(video, /data-mediabook="(https:\/\/.+?)"/gms)!,
				get: async () => await (await fetch(extractRegex(video, /data-mediabook="(https:\/\/.+?)"/gms)!, {headers})).arrayBuffer(),
			},
			streams: async () => await getStreams(BASE_URL + extractRegex(video, /href="\/([^"]+)"/gms)!),
			tags: async () => await getTags(BASE_URL + extractRegex(video, /href="\/([^"]+)"/gms)!),
		};

		allVideoData.push(videoData);
	}

	return allVideoData;
};

/**
 * Retrieves all videos associated with a specific tag, optionally ordered by a specified criterion.
 *
 * @param {string} tag - The tag used to filter videos.
 * @param {Order} [order] - Optional parameter to specify the order of the videos.
 * @returns {Promise<VideoData[]>} A promise that resolves to an array of video data.
 */
export const getAllVideos = async (tag: string, order?: Order): Promise<VideoData[]> => {
	const pageCount = await getVideoPageCount(tag);

	let allVideos: VideoData[] = [];

	for (let i = 1; i <= pageCount; i++) {
		allVideos = allVideos.concat(await getVideos(tag, i, order));
	}

	return allVideos;
};

/**
 * Fetches account data for a given user tag.
 *
 * @param {string} tag - The user tag to fetch account data for.
 * @returns {Promise<AccountData>} A promise that resolves to the account data.
 * @throws {Error} If the response status is not 200, an error is thrown with the status text as the cause.
 *
 * The returned `AccountData` object contains the following properties:
 * - `tag`: The user tag.
 * - `username`: The username extracted from the HTML.
 * - `description`: The description extracted from the HTML.
 * - `url`: The URL of the user's account.
 * - `avatar`: An object containing the avatar URL and a method to fetch the avatar image as an ArrayBuffer.
 * - `banner`: An object containing the banner URL and a method to fetch the banner image as an ArrayBuffer.
 * - `rank`: The rank of the user.
 * - `views`: The number of video views.
 * - `subscribers`: The number of subscribers.
 * - `gender`: The gender of the user.
 * - `location`: The location of the user.
 * - `birthplace`: The birthplace of the user.
 * - `getVideoPageCount`: A method to fetch the number of video pages.
 * - `getVideos`: A method to fetch videos for a given page.
 * - `getAllVideos`: A method to fetch all videos.
 */
export const getAccountData = async (tag: string): Promise<AccountData> => {
	const response = await fetch(BASE_URL + `model/${tag}`, {headers});

	if (response.status !== 200) throw new Error(`Could not fetch account data from user ${tag}`, {cause: response.statusText});

	const html = await response.text();

	const data: AccountData = {
		tag,
		username: extractRegex(html, /<h1 itemprop="name">\n(.+)<\/h1>/gm)!,
		description: extractRegex(html, /<section class="aboutMeSection sectionDimensions ">.*?<\/div>.+?<div>(.+?)<\/div>/gms)!,
		url: BASE_URL + `model/${tag}`,
		avatar: {
			url: extractRegex(html, /<img id="getAvatar".+src="([^"]+)"/g)!,
			get: async () => await (await fetch(data.avatar.url, {headers})).arrayBuffer(),
		},
		banner: {
			url: extractRegex(html, /<img id="coverPictureDefault".+src="([^"]+)"/g)!,
			get: async () => await (await fetch(data.banner.url, {headers})).arrayBuffer(),
		},
		rank: Number(extractRegex(html, /<div class="infoBox">\n.+\n([^<]+)/gm)!),
		views: Number(extractRegex(html, /<div class="tooltipTrig infoBox videoViews" data-title="Video views:([^"]+)/gm)!.replaceAll(",", "")),
		subscribers: Number(extractRegex(html, /<div class="tooltipTrig infoBox" data-title="Subscribers:([^"]+)/gm)!.replaceAll(",", "")),
		gender: extractRegex(html, /<span itemprop="gender" class="smallInfo">\n(.+)<\/span>/gm)!.toLowerCase() as AccountData["gender"],
		location: extractRegex(html, /City and Country:\n.+<\/span>\n.+<span itemprop="" class="smallInfo">\n(.+)<\/span>/gm)!,
		birthplace: extractRegex(html, /<span itemprop="birthPlace" class="smallInfo">\n(.+)<\/span>/gm)!,
		getVideoPageCount: async () => await getVideoPageCount(tag),
		getVideos: async (page: number) => await getVideos(tag, page),
		getAllVideos: async () => await getAllVideos(tag),
	};

	return data;
};
