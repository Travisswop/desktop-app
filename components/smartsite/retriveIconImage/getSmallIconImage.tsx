// import { smallIconData } from "../data/smartsiteIconData";

import { smallIconData } from "@/components/util/data/smartsiteIconData";

const getSmallIconImage = (name: any, group: any) => {
  if (group === "Social Media") {
    switch (name) {
      case "X":
        return smallIconData.Twitter;
      case "Linked In":
        return smallIconData.LinkedIn;
      case "Bluesky":
        return smallIconData.Bluesky;
      case "Facebook":
        return smallIconData.Facebook;
      case "Github":
        return smallIconData.Github;
      case "Instagram":
        return smallIconData.Instagram;
      case "Rumble":
        return smallIconData.Rumble;
      case "Snapchat":
        return smallIconData.Snapchat;
      case "Truth":
        return smallIconData.Truth;
      case "YouTube":
        return smallIconData.YouTube;
      case "TikTok":
        return smallIconData.TikTok;
    }
  }
  if (group === "Chat Links") {
    switch (name) {
      case "Whatsapp":
        return smallIconData.Whatsapp;
      case "Discord":
        return smallIconData.Discord;
      case "Telegram":
        return smallIconData.Telegram;
      case "Slack":
        return smallIconData.Slack;
    }
  }
  if (group === "Commands") {
    switch (name) {
      case "Email":
        return smallIconData.Email;
      case "Website":
        return smallIconData.Website;
      case "Chat":
        return smallIconData.Chat;
    }
  }
};

export default getSmallIconImage;
