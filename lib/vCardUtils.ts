"use server";
import vCard from "vcards-js";

export const downloadVCard = async (data: {
  name: string;
  mobileNo: string | string[];
  address: string;
  email: string | string[];
  websiteUrl: string;
}) => {
  const name = data.name.split(" ");
  const card = vCard();

  card.firstName = name[0];
  if (name[1]) {
    card.middleName = name[1];
  }
  if (name[2]) {
    card.lastName = name[2];
  }
  card.cellPhone = data.mobileNo;
  card.homeAddress.street = data.address;
  card.workEmail = data.email;
  card.url = data.websiteUrl;

  const vCardString = card.getFormattedString();

  return vCardString;
};
