const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

const BASE_URL = "https://www.pornhub.com/";

export type StreamData = {
	url: string;
	quality: string;
};

export enum Order {
	MostViewed = "&o=mv",
	MostRecent = "&o=mr",
	TopRated = "&o=tr",
	Longest = "&o=lg",
	Best = "",
}

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

export type AccountData = {
	tag: string;
	username: string;
	description: string;
	url: string;
	avatar: {
		url: string;
		get: () => Promise<ArrayBuffer>;
	};
	banner: {
		url: string;
		get: () => Promise<ArrayBuffer>;
	};
	rank: number;
	views: number;
	subscribers: number;
	gender: "couple" | "female" | "male";
	location: string;
	birthplace: string;
	getVideoPageCount: () => Promise<number>;
	getVideos: (page: number) => Promise<VideoData[]>;
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

export const getStreams = async (url: string): Promise<StreamData[]> => {
	const response = await fetch(url, {headers});

	if (response.status !== 200) throw new Error(`Could not fetch streams from url ${url}`, {cause: response.statusText});

	const html = await response.text();

	return [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({url, quality: extractRegex(url, /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms)!}))
		.sort((a, b) => Number(b.quality) - Number(a.quality));
};

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

export const getVideoPageCount = async (tag: string): Promise<number> => {
	const response = await (await fetch(BASE_URL + `model/${tag}/videos`, {headers})).text();

	return [...response.matchAll(/<li class="(page_number|page_current)">/gms)].length || 1;
};

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

export const getAllVideos = async (tag: string, order?: Order): Promise<VideoData[]> => {
	const pageCount = await getVideoPageCount(tag);

	let allVideos: VideoData[] = [];

	for (let i = 1; i <= pageCount; i++) {
		allVideos = allVideos.concat(await getVideos(tag, i, order));
	}

	return allVideos;
};

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
