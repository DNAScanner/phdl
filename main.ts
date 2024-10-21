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
	const response = await fetch(url, {headers, redirect: "manual"});

	if (response.status !== 200) throw new Error(`Could not fetch streams from url ${url}`, {cause: response.statusText});

	const html = await response.text();

	return [...html.matchAll(/"format":"hls","videoUrl":(".+?")/gms)]
		.map((match) => JSON.parse(match[1]) as string)
		.map((url) => ({url, quality: /\/videos\/[0-9]+\/[0-9]+\/[0-9]+\/(.+?)P/gms.exec(url)![1].trim()}))
		.sort((a, b) => Number(b.quality) - Number(a.quality));
};

export const getTags = async (url: string): Promise<string[]> => {
	const response = await fetch(url, {headers, redirect: "manual"});

	if (response.status !== 200) throw new Error(`Could not fetch tags from url ${url}`, {cause: response.statusText});

	const html = await response.text();

	return [
		.../<p>Categories&nbsp;<\/p>(.+?)<div/gms
			.exec(html)![1]
			.trim()
			.matchAll(/>(.+?)</gms),
	]
		.map((match) => match[1].trim())
		.filter((match) => match);
};

export const getVideoPageCount = async (tag: string): Promise<number> => {
	const response = await (await fetch(BASE_URL + `model/${tag}/videos`, {headers, redirect: "manual"})).text();

	return [...response.matchAll(/<li class="(page_number|page_current)">/gms)].length;
};

export const getVideos = async (tag: string, page: number, order?: Order): Promise<VideoData[]> => {
	const response = await fetch(BASE_URL + `model/${tag}/videos?page=${page + (order || Order.MostRecent)}`, {headers, redirect: "manual"});

	if (response.status !== 200) throw new Error(`Could not fetch videos from user ${tag}`, {cause: response.statusText});

	const html = await response.text();
	const videosElement = /<ul class="videos row-5-thumbs" id="mostRecentVideosSection">(.+?)<\/ul>/gms.exec(html)![1];
	const videos = [...videosElement.matchAll(/<li class="pcVideoListItem.+?videoBox.+?".+?<\/li>/gms)];

	const allVideoData: VideoData[] = [];

	for (const videoInArray of videos) {
		const video = videoInArray[0].trim();

		const videoData: VideoData = {
			title: /alt="(.+?)"/gms.exec(video)![1].trim(),
			url: BASE_URL + /href="\/([^"]+)"/gms.exec(video)![1].trim(),
			views: convertShotertenedNumberToFull(/<var>(.+?)<\/var>/gms.exec(video)![1].trim()),
			likeRatio: Number(/div class="value">(.+?)</gms.exec(video)![1].trim().replace("%", "")) / 100,
			duration: convertDurationStringToSeconds(/<var class="duration">(.+?)</gms.exec(video)![1].trim()),
			thumbnail: {
				url: /src="(https:\/\/.+?)"/gms.exec(video)![1].trim(),
				get: async () => await (await fetch(videoData.thumbnail.url, {headers})).arrayBuffer(),
			},
			preview: {
				url: /data-mediabook="(https:\/\/.+?)"/gms.exec(video)![1].trim(),
				get: async () => await (await fetch(videoData.preview.url, {headers})).arrayBuffer(),
			},
			streams: async () => await getStreams(videoData.url),
			tags: async () => await getTags(videoData.url),
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
	const response = await fetch(BASE_URL + `model/${tag}`, {headers, redirect: "manual"});

	if (response.status !== 200) throw new Error(`Could not fetch account data from user ${tag}`, {cause: response.statusText});

	const html = await response.text();

	const data: AccountData = {
		tag,
		username: /<h1 itemprop="name">\n(.+)<\/h1>/gm.exec(html)![1].trim(),
		description: /<section class="aboutMeSection sectionDimensions ">.*?<\/div>.+?<div>(.+?)<\/div>/gms.exec(html)![1].trim(),
		url: BASE_URL + `model/${tag}`,
		avatar: {
			url: /<img id="getAvatar".+src="([^"]+)"/g.exec(html)![1].trim(),
			get: async () => await (await fetch(data.avatar.url, {headers})).arrayBuffer(),
		},
		banner: {
			url: /<img id="coverPictureDefault".+src="([^"]+)"/g.exec(html)![1].trim(),
			get: async () => await (await fetch(data.banner.url, {headers})).arrayBuffer(),
		},
		rank: Number(/<div class="infoBox">\n.+\n([^<]+)/gm.exec(html)![1].trim()),
		views: Number(/<div class="tooltipTrig infoBox videoViews" data-title="Video views:([^"]+)/gm.exec(html)![1].trim().replaceAll(",", "")),
		subscribers: Number(/<div class="tooltipTrig infoBox" data-title="Subscribers:([^"]+)/gm.exec(html)![1].trim().replaceAll(",", "")),
		gender: /<span itemprop="gender" class="smallInfo">\n(.+)<\/span>/gm.exec(html)![1].trim().toLowerCase() as AccountData["gender"],
		location: /City and Country:\n.+<\/span>\n.+<span itemprop="" class="smallInfo">\n(.+)<\/span>/gm.exec(html)![1].trim(),
		birthplace: /<span itemprop="birthPlace" class="smallInfo">\n(.+)<\/span>/gm.exec(html)![1].trim(),
		getVideoPageCount: async () => await getVideoPageCount(tag),
		getVideos: async (page: number) => await getVideos(tag, page),
		getAllVideos: async () => await getAllVideos(tag),
	};

	return data;
};