import { type Account, type AccountVideo, Order, type StreamData, type Video } from "./types.ts";

const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

const BASE_URL = "https://www.pornhub.com";

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

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, { headers });

	if (response.status === 404) throw new Error(`Video does not exist (${id}).`);

	const html = await response.text();

	const streams: StreamData[] = [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({ url, quality: /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms.exec(url)?.[1]! }))
		.sort((a, b) => Number(b.quality) - Number(a.quality));

	return streams;
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

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, { headers });

	if (response.status === 404) throw new Error(`Video does not exist (${id})`);

	const html = await response.text();

	const tagsHtml = /<p>Categories&nbsp;<\/p>(?<categories>.*?)<div/gms.exec(html)?.groups?.categories;

	const tags = !tagsHtml ? [] : [...tagsHtml.matchAll(/>(.*?)</gms)].map((match) => match[1].trim()).filter((tag) => tag);

	return tags;
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

	const response = await fetch(BASE_URL + "/view_video.php?viewkey=" + id, { headers });

	if (response.status !== 200) throw new Error(`Video does not exist (${id})`);

	const html = await response.text();
	Deno.writeTextFileSync("debug.html", html);

	const streams: StreamData[] = [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({ url, quality: /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms.exec(url)?.[1]! }))
		.sort((a, b) => Number(b.quality) - Number(a.quality));

	const tagsHtml = /<p>Categories&nbsp;<\/p>(?<categories>.*?)<div/gms.exec(html)?.groups?.categories;

	const tags = !tagsHtml ? [] : [...tagsHtml.matchAll(/>(.*?)</gms)].map((match) => match[1].trim()).filter((tag) => tag);

	const dateAdded = new Date(/'video_date_published' : '(?<date>.*?)'/gms.exec(html)?.groups?.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")!).getTime();

	return {
		title: /videoTitleOriginal":"(?<title>.*?)"/gms.exec(html)?.groups?.title.trim()!,
		url: response.url,
		id,
		views: convertShotertenedNumberToFull(/<div class="views"><span class="count">(?<views>.*?)<\/span>/gms.exec(html)?.groups?.views.trim()!),
		duration: Number(/<meta property="video:duration" content="(?<duration>.*?)" \/>/gms.exec(html)?.groups?.duration.trim()),
		thumbnail: /<div id="player.*?<img src="(?<url>.*?)"/gms.exec(html)?.groups?.url.trim()!,
		creator: {
			tag: /<div class="userInfo".*?\/model\/(?<tag>.*?)"/gms.exec(html)?.groups?.tag.trim()!,
			url: BASE_URL + "/model/" + /<div class="userInfo".*?\/model\/(?<tag>.*?)"/gms.exec(html)?.groups?.tag.trim()!,
			avatar: /<div class="userAvatar".*?src="(?<url>.*?)"/gms.exec(html)?.groups?.url.trim()!,
			getDetails: async () => await getAccount(/<div class="userInfo".*?\/model\/(?<tag>.*?)"/gms.exec(html)?.groups?.tag.trim()!),
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

	const response = await fetch(BASE_URL + "/model/" + tag + `/videos`, { headers });

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

	const response = await fetch(BASE_URL + "/model/" + tag + `/videos?page=${page + 1 + (order || Order.MostRecent)}`, { headers });

	if (response.status === 404) throw new Error(`Page is out of bounds (${page})`);
	else if (response.url.includes("com/pornstars")) throw new Error(`Account does not exist (${tag})`);

	const html = await response.text();
	const videosElement = /<ul class="full-row-thumbs videos row-5-thumbs".*?>(?<videos>.*?)<\/ul>/gms.exec(html)?.groups?.videos;
	const videos = !videosElement ? [] : [...videosElement.matchAll(/<li class=".*?videoBox.*?<\/li>/gms)];

	const allVideos: AccountVideo[] = [];

	for (const videoOnPage of videos) {
		const videoHtml = videoOnPage[0].trim();

		const video: AccountVideo = {
			title: /<a href=.*?title="(?<title>.*?)"/gms.exec(videoHtml)?.groups?.title.trim()!,
			url: BASE_URL + /<a href="(?<url>.*?)"/gms.exec(videoHtml)?.groups?.url.trim()!,
			id: /data-video-vkey="(?<id>.*?)"/gms.exec(videoHtml)?.groups?.id.trim()!,
			duration: convertDurationStringToSeconds(/"Video Duration">(?<views>.*?)</gms.exec(videoHtml)?.groups?.views.trim()!),
			thumbnail: /data-mediumthumb="(?<url>.*?)"/gms.exec(videoHtml)?.groups?.url.trim()!,
			preview: /data-mediabook="(?<url>.*?)"/gms.exec(videoHtml)?.groups?.url.trim()!,
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

	const response = await fetch(BASE_URL + "/model/" + tag, { headers });

	if (response.url.includes("com/pornstars")) throw new Error(`Account does not exist (${tag})`);

	const html = await response.text();

	return {
		tag: response.url.split("/").pop()!,
		username: /<h1 itemprop="name">\n(?<name>.*)<\/h1>/gms.exec(html)?.groups?.name.trim()!,
		description: /<section class="aboutMeSection sectionDimensions.*?<div>(?<description>.*?)<\/div>/gms.exec(html)?.groups?.description.replaceAll("\r\n", "\n").trim()!,
		url: response.url,
		avatar: /<img id="getAvatar" src="(?<url>.*?)"/gms.exec(html)?.groups?.url!,
		banner: /<img id="coverPictureDefault" src="(?<url>.*?)"/gms.exec(html)?.groups?.url!,
		rank: Number(/<div class="infoBox".*?big">(?<rank>.*?)</gms.exec(html)?.groups?.rank.trim()),
		views: Number(/Video views: (?<views>.*?)"/gms.exec(html)?.groups?.views.replaceAll(",", "").trim()),
		subscribers: Number(/Subscribers: (?<subscribers>.*?)"/gms.exec(html)?.groups?.subscribers.replaceAll(",", "").trim()),
		gender: /<span itemprop="gender" class="smallInfo">(?<gender>.*?)</gms.exec(html)?.groups?.gender.trim().toLowerCase() as Account["gender"],
		birthplace: /<span itemprop="birthPlace" class="smallInfo">(?<birthplace>.*?)</gms.exec(html)?.groups?.birthplace.trim(),
		getVideoPageCount: async () => await getVideoPageCount(tag),
		getVideos: async (page: number) => await getVideos(tag, page),
		getAllVideos: async () => await getAllVideos(tag),
	};
};
