import axios from "axios";
import { config } from "../config/environment";

export const generateAccessToken = async () => {
  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_BASE_URL}/v1/oauth2/token`,
    data: "grant_type=client_credentials",
    auth: {
      username: config.PAYPAL_CLIENT_ID,
      password: config.PAYPAL_CLIENT_SECRET,
    },
  });
  return response.data;
};
