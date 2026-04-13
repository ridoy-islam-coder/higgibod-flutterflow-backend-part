
// social.service.ts
import axios from "axios";
import puppeteer from "puppeteer";
const YOUTUBE_API_KEY = "AIzaSyAMLTu3H38-hb9jnUREr28YNB5KeHI4eyA";


export const getYoutubeChannelDataService = async (username: string) => {
  const clean = username.replace(/^@/, "");

  let channel: any = null;

  // 1️⃣ TRY OFFICIAL forHandle (NEW SYSTEM)
  try {
    const handleRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          part: "snippet,statistics",
          forHandle: clean,
          key: YOUTUBE_API_KEY
        }
      }
    );

    if (handleRes.data.items && handleRes.data.items.length > 0) {
      channel = handleRes.data.items[0];
    }
  } catch (err) {
    // ignore, fallback below
  }

  // 2️⃣ FALLBACK: Search channel
  if (!channel) {
    const searchRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: clean,
          type: "channel",
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
      }
    );

    if (!searchRes.data.items || searchRes.data.items.length === 0) {
      throw new Error("CHANNEL_NOT_FOUND");
    }

    const channelId = searchRes.data.items[0].id.channelId;

    const channelRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          part: "snippet,statistics",
          id: channelId,
          key: YOUTUBE_API_KEY
        }
      }
    );

    if (!channelRes.data.items || channelRes.data.items.length === 0) {
      throw new Error("CHANNEL_NOT_FOUND");
    }

    channel = channelRes.data.items[0];
  }

  // 🛑 Safety
  if (!channel) {
    throw new Error("CHANNEL_NOT_FOUND");
  }

  // 3️⃣ FETCH VIDEOS (SAFE METHOD)
  const videoRes = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        part: "snippet",
        channelId: channel.id,
        type: "video",
        order: "date",
        maxResults: 10,
        key: YOUTUBE_API_KEY
      }
    }
  );

  return {
    channel: {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      subscribers: channel.statistics.subscriberCount,
      views: channel.statistics.viewCount,
      videos: channel.statistics.videoCount,
      thumbnail: channel.snippet.thumbnails.high.url
    },
    videos: videoRes.data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt
    }))
  };
};


export const getTikTokProfileWithStats = async (username: string) => {
  const clean = username.replace(/^@/, "");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    await page.goto(`https://www.tiktok.com/@${clean}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector("script#__UNIVERSAL_DATA_FOR_REHYDRATION__", {
      timeout: 30000,
    });

    const json = await page.$eval(
      "script#__UNIVERSAL_DATA_FOR_REHYDRATION__",
      (el) => el.textContent
    );

    if (!json) throw new Error("PROFILE_NOT_FOUND");

    const data: any = JSON.parse(json);

    const user =
      data.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo?.user;

    const stats =
      data.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo?.stats;

    const itemList =
      data.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.itemList || [];

    if (!user || !stats) throw new Error("PROFILE_DATA_MISSING");

    const videos = itemList.slice(0, 10).map((item: any) => ({
      videoId: item.id,
      title: item.desc,
      thumbnail: item.video?.cover,
      publishedAt: item.createTime
        ? new Date(item.createTime * 1000).toISOString()
        : null,
    }));

    return {
      username: clean,
      nickname: user.nickname,
      followers: stats.followerCount,
      following: stats.followingCount,
      likes: stats.heartCount,
      totalVideos: stats.videoCount,
      profileUrl: `https://www.tiktok.com/@${clean}`,
      videos,
    };
  } catch (error: any) {
    console.error("TikTok Puppeteer error:", error.message);
    throw new Error("TIKTOK_PROFILE_NOT_FOUND");
  } finally {
    await browser.close();
  }
};





const IG_USER_ID = process.env.IG_USER_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

export const getInstagramProfileService = async () => {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}`,
      {
        params: {
          fields:
            "username,name,followers_count,follows_count,media_count,profile_picture_url",
          access_token: ACCESS_TOKEN,
        },
      }
    );

    return {
      username: res.data.username,
      name: res.data.name,
      followers: res.data.followers_count,
      following: res.data.follows_count,
      totalPosts: res.data.media_count,
      profilePic: res.data.profile_picture_url,
      profileUrl: `https://www.instagram.com/${res.data.username}/`,
    };
  } catch (error: any) {
    console.error("Instagram Graph API error:", error.response?.data);
    throw new Error("INSTAGRAM_PROFILE_NOT_FOUND");
  }
};