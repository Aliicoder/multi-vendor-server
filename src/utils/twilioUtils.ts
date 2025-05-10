import { Twilio } from "twilio";
import { config } from "../config/environment";
const twilioClient = new Twilio(
  config.TWILIO_ACCOUNT_SID,
  config.TWILIO_AUTH_TOKEN
);
export default twilioClient;
