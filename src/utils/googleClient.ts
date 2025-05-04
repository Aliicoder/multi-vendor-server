import { OAuth2Client } from "google-auth-library";
import { config } from "../config/environment";

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export default client;
