const headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/",
};

type AccountData = {
	tag: string;
	username: string;
      description: string;
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
};

const getAccountData = async (tag: string) => {
	const response = await (await fetch(`https://pornhub.com/model/${tag}`, {headers})).text();

	const data: AccountData = {
		tag,
		username: /<h1 itemprop="name">\n(.+)<\/h1>/gm.exec(response)![1].trim(),
            description: /<section class="aboutMeSection sectionDimensions ">/gm.exec(response)![1].trim(),
		avatar: {
			url: /<img id="getAvatar".+src="([^"]+)"/g.exec(response)![1].trim(),
			get: async () => await (await fetch(data.avatar.url, {headers})).arrayBuffer(),
		},
		banner: {
			url: /<img id="coverPictureDefault".+src="([^"]+)"/g.exec(response)![1].trim(),
			get: async () => await (await fetch(data.banner.url, {headers})).arrayBuffer(),
		},
		rank: Number(/<div class="infoBox">\n.+\n([^<]+)/gm.exec(response)![1].trim()),
		views: Number(/<div class="tooltipTrig infoBox videoViews" data-title="Video views:([^"]+)/gm.exec(response)![1].trim().replaceAll(",", "")),
	};

	Deno.writeTextFileSync("response.txt", response);
	return data;
};

console.log(await getAccountData("mira-david"));
