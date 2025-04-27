const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

const BASE_URL = "https://www.pornhub.com";

/**
 * Represents the data for a stream.
 *
 * @typedef {Object} StreamData
 * @property {string} url - The tag of the stream.
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

export type Video = {
	title: string;
	url: string;
	id: string;
	views: number;
	likeRatio: number;
	duration: number;
	thumbnail: string;
	creator: {
		tag: string;
		url: string;
		avatar: string;
		getDetails: () => Promise<Account>;
	};
	streams: StreamData[];
	tags: string[];
	dateAdded: number;
};

/**
 * Represents the data associated with a video.
 */
export type AccountVideo = {
	title: string;
	url: string;
	id: string;
	views: number;
	likeRatio: number;
	duration: number;
	thumbnail: string;
	preview: string;
	getDetails: () => Promise<Video>;
};

/**
 * Represents the data associated with an account.
 */
export type Account = {
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
	 * The tag of the account.
	 */
	url: string;

	/**
	 * The avatar information of the account.
	 */
	avatar: string;

	/**
	 * The banner information of the account.
	 */
	banner: string;

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
	location?: string;

	/**
	 * The birthplace of the account holder.
	 */
	birthplace?: string;

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
	getVideos: (page: number) => Promise<AccountVideo[]>;

	/**
	 * Retrieves all videos associated with the account.
	 * @returns A promise that resolves to an array of all VideoData objects.
	 */
	getAllVideos: () => Promise<AccountVideo[]>;
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
 * @param id - The id of the video.
 * @returns {Promise<StreamData[]>} An array of all streams.
 * @throws {Error} Throws an error if the video does not exist.
 */
export const getStreams = async (id: string): Promise<StreamData[]> => {
	if (id.includes("pornhub.com")) throw new Error("Please provide just the id of the video.");

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, {headers});

	if (response.status === 404) throw new Error(`Video does not exist (${id}).`);

	const html = await response.text();

	return [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({url, quality: extractRegex(url, /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms)!}))
		.sort((a, b) => Number(b.quality) - Number(a.quality));
};

/**
 * Fetches the HTML content from the given URL and extracts tags from it.
 *
 * @param id - The id of the video.
 * @returns {Promise<string[]>} An array of tags.
 * @throws {Error} Throws an error if the video does not exist.
 */
export const getTags = async (id: string): Promise<string[]> => {
	if (id.includes("pornhub.com")) throw new Error("Please provide just the id of the video.");

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, {headers});

	if (response.status === 404) throw new Error(`Video does not exist (${id})`);

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
 * Fetches video data from the server using the provided video ID.
 *
 * @param {string} id - The unique identifier of the video.
 * @returns {Promise<Video>} A promise that resolves to a Video object containing video details.
 * @throws {Error} If the video does not exist or the response status is not 200.
 *
 * The returned Video object contains the following properties:
 * - `title`: The original title of the video.
 * - `url`: The tag of the video.
 * - `id`: The unique identifier of the video.
 * - `views`: The number of views the video has.
 * - `likeRatio`: The like ratio of the video as a decimal.
 * - `duration`: The duration of the video in seconds.
 * - `thumbnail`: The tag of the video's thumbnail image.
 * - `creator`: An object containing details about the video's creator:
 *   - `tag`: The tag of the creator.
 *   - `url`: The tag of the creator's profile.
 *   - `avatar`: The tag of the creator's avatar image.
 *   - `getDetails`: A function that fetches additional details about the creator.
 * - `streams`: An array of StreamData objects, each containing:
 *   - `url`: The tag of the video stream.
 *   - `quality`: The quality of the video stream.
 * - `tags`: An array of tags associated with the video.
 * - `dateAdded`: The date the video was added, in milliseconds since the Unix epoch.
 */
export const getVideo = async (id: string): Promise<Video> => {
	if (id.includes("pornhub.com")) throw new Error("Please provide just the id of the video.");

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, {headers});

	if (response.status !== 200) throw new Error(`Video does not exist (${id})`);

	const html = await response.text();

	const streams: StreamData[] = [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({url, quality: extractRegex(url, /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms)!}))
		.sort((a, b) => Number(b.quality) - Number(a.quality));

	const tags = [
		...extractRegex(html, /<p>Categories&nbsp;<\/p>(.+?)<div/gms)!
			.trim()
			.matchAll(/>(.+?)</gms),
	]
		.map((match) => match[1].trim())
		.filter((match) => match);

	const dateAdded = new Date(extractRegex(html, /'video_date_published' : '(.+?)'/gms)!.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")).getTime();

	return {
		title: extractRegex(html, /videoTitleOriginal":"(.+?)"/gms)!,
		url: response.url,
		id,
		views: convertShotertenedNumberToFull(extractRegex(html, /<div class="views"><span class="count">(.+?)<\/span>/gms)!),
		likeRatio: Number(extractRegex(html, /<i class="thumbsUp ph-icon-thumb-up"><\/i><span class="percent">(.+?)<\/span>/gms)?.replaceAll("%", "")) / 100,
		duration: Number(extractRegex(html, /<meta property="video:duration" content="(.+?)" \/>/gms)),
		thumbnail: extractRegex(html, /<div id="player.*?<img src="(.+?)"/gms)!,
		creator: {
			tag: extractRegex(html, /<div class="userInfo".*?\/model\/(.+?)"/gms)!,
			url: BASE_URL + "/model/" + extractRegex(html, /<div class="userInfo".*?\/model\/(.+?)"/gms),
			avatar: extractRegex(html, /<div class="userAvatar".*?src="(.+?)"/gms)!,
			getDetails: async () => await getAccount(extractRegex(html, /<div class="userInfo".*?\/model\/(.+?)"/gms)!),
		},
		streams,
		tags,
		dateAdded,
	};
};

/**
 * Fetches the number of video pages for a given tag.
 *
 * @param {string} tag - The tag of the account.
 * @returns {Promise<number>} Represents the number of video pages.
 * @throws {Error} Throws an error, if the account does not exist.
 */
export const getVideoPageCount = async (tag: string): Promise<number> => {
	if (tag.includes("pornhub.com")) throw new Error("Please provide just the tag of the account.");

	const response = await fetch(BASE_URL + "/model/" + tag + `/videos`, {headers});

	if (response.url.includes("com/pornstars")) throw new Error(`Account does not exist (${tag})`);

	return [...(await response.text()).matchAll(/<li class="(page_number|page_current)">/gms)].length || 1;
};

/**
 * Fetches videos based from a page on an account URL.
 *
 * @param {string} tag - The tag of the account.
 * @param {number} page - The page index to fetch videos from.
 * @param {Order} [order] - Optional parameter to specify the order of the videos.
 * @returns {Promise<AccountVideo[]>} An array of the video data.
 * @throws {Error} Throws an error if the page is out of bounds or the account does not exist.
 */
export const getVideos = async (tag: string, page: number, order?: Order): Promise<AccountVideo[]> => {
	if (tag.includes("pornhub.com")) throw new Error("Please provide just the tag of the account.");

	const response = await fetch(BASE_URL + "/model/" + tag + `/videos?page=${page + 1 + (order || Order.MostRecent)}`, {headers});

	if (response.status === 404) throw new Error(`Page is out of bounds (${page})`);
	else if (response.url.includes("com/pornstars")) throw new Error(`Account does not exist (${tag})`);

	const html = await response.text();
	const videosElement = extractRegex(html, /<ul class="videos row-5-thumbs" id="mostRecentVideosSection">(.+?)<\/ul>/gms)!;
	const videos = [...videosElement.matchAll(/<li class="pcVideoListItem.+?videoBox.+?".+?<\/li>/gms)];

	const allVideos: AccountVideo[] = [];

	for (const videoOnPage of videos) {
		const videoHtml = videoOnPage[0].trim();

		const video: AccountVideo = {
			title: extractRegex(videoHtml, /alt="(.+?)"/gms)!,
			url: BASE_URL + "/" + extractRegex(videoHtml, /href="\/([^"]+)"/gms)!,
			id: extractRegex(videoHtml, /data-video-vkey="(.+?)"/gms)!,
			views: convertShotertenedNumberToFull(extractRegex(videoHtml, /<var>(.+?)<\/var>/gms)!),
			likeRatio: Number(extractRegex(videoHtml, /div class="value">(.+?)</gms)!.replace("%", "")) / 100,
			duration: convertDurationStringToSeconds(extractRegex(videoHtml, /<var class="duration">(.+?)</gms)!),
			thumbnail: extractRegex(videoHtml, /src="(https:\/\/.+?)"/gms)!,
			preview: extractRegex(videoHtml, /data-mediabook="(https:\/\/.+?)"/gms)!,
			getDetails: async () => await getVideo(video.id),
		};

		allVideos.push(video);
	}

	return allVideos;
};

/**
 * Fetches videos of all pages of the account.
 *
 * @param {string} tag - The tag of the account.
 * @param {Order} [order] - Optional parameter to specify the order of the videos.
 * @returns {Promise<AccountVideo[]>} An array of all video data.
 * @throws {Error} Throws an error if the account does not exist.
 */
export const getAllVideos = async (tag: string, order?: Order): Promise<AccountVideo[]> => {
	if (tag.includes("pornhub.com")) throw new Error("Please provide just the tag of the account.");

	const pageCount = await getVideoPageCount(tag);

	let allVideos: AccountVideo[] = [];

	for (let i = 0; i <= pageCount - 1; i++) {
		allVideos = allVideos.concat(await getVideos(tag, i, order));
	}

	return allVideos;
};

/**
 * Fetches account data for a given user tag.
 *
 * @param {string} tag - The tag of the account.
 * @returns {Promise<Account>} The account data.
 * @throws {Error} Throws an error if the account does not exist.
 */
export const getAccount = async (tag: string): Promise<Account> => {
	if (tag.includes("pornhub.com")) throw new Error("Please provide just the tag of the account.");

	const response = await fetch(BASE_URL + "/model/" + tag, {headers});

	if (response.url.includes("com/pornstars")) throw new Error(`Account does not exist (${tag})`);

	const html = await response.text();

	return {
		tag: response.url.split("/").pop()!,
		username: extractRegex(html, /<h1 itemprop="name">\n(.+)<\/h1>/gm)!,
		description: extractRegex(html, /<section class="aboutMeSection sectionDimensions ">.*?<\/div>.+?<div>(.+?)<\/div>/gms)!,
		url: response.url,
		avatar: extractRegex(html, /<img id="getAvatar".+src="([^"]+)"/g)!,
		banner: extractRegex(html, /<img id="coverPictureDefault".+src="([^"]+)"/g)!,
		rank: Number(extractRegex(html, /<div class="infoBox">\n.+\n([^<]+)/gm)!),
		views: Number(extractRegex(html, /<div class="tooltipTrig infoBox videoViews" data-title="Video views:([^"]+)/gm)!.replaceAll(",", "")),
		subscribers: Number(extractRegex(html, /<div class="tooltipTrig infoBox" data-title="Subscribers:([^"]+)/gm)!.replaceAll(",", "")),
		gender: extractRegex(html, /<span itemprop="gender" class="smallInfo">\n(.+)<\/span>/gm)!.toLowerCase() as Account["gender"],
		location: extractRegex(html, /City and Country:\n.+<\/span>\n.+<span itemprop="" class="smallInfo">\n(.+)<\/span>/gm)!,
		birthplace: extractRegex(html, /<span itemprop="birthPlace" class="smallInfo">\n(.+)<\/span>/gm)!,
		getVideoPageCount: async () => await getVideoPageCount(tag),
		getVideos: async (page: number) => await getVideos(tag, page),
		getAllVideos: async () => await getAllVideos(tag),
	};
};
