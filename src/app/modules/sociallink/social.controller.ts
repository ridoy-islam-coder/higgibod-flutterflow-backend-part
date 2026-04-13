import { Request, Response } from "express";
import {  getInstagramProfileService, getInstagramProfileWithStats, getTikTokProfileWithStats, getYoutubeChannelDataService } from "./social.service";

export const getYoutubeChannelDataController = async (
  req: Request,
  res: Response
) => {
  try {
    const { username } = req.params;

    if (!username || Array.isArray(username)) {
      return res.status(400).json({
        success: false,
        message: "Invalid username or channel identifier"
      });
    }

    const data = await getYoutubeChannelDataService(username);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error: any) {
    // known error codes from service
    if (error.code === "CHANNEL_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Channel not found"
      });
    }
    if (error.code === "UPLOADS_PLAYLIST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Uploads playlist unavailable for this channel"
      });
    }

    // log unexpected errors for later investigation
    console.error("social.controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};


export const getTikTokProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const data = await getTikTokProfileWithStats(username as string);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};







export const getInstagramProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getInstagramProfileService();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};