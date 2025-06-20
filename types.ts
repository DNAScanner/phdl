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
